import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, report_kind, reports } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ReportPdfService } from './report-pdf.service';
import { catalogueLabel, FALLBACK_REPORT_CURRENCY, reportLanguage } from './report-catalogue-labels';
import { ExportReportDto } from './dto/export-report.dto';
import {
  REPORT_SNAPSHOT_VERSION,
  ReportAction,
  ReportAttachment,
  ReportAttachmentFile,
  ReportAttachmentSource,
  ReportBike,
  ReportComponent,
  ReportPdfFile,
  ReportService as ReportedService,
  ReportSnapshot,
  ReportSnapshotPrivate,
  StoredReportSnapshot,
} from './report.types';

// Unpublished, revoked and expired all answer with this and nothing else, so a token
// cannot be probed for which of the three it is.
const REPORT_CLOSED_MESSAGE = 'This report is no longer available';

// What a Service Report is built from. Kept as a constant so the payload type below
// stays in sync with the actual query.
const serviceReportInclude = {
  bikes: { include: { bike_types: true } },
  event_actions_done: {
    orderBy: { id: 'asc' },
    include: {
      events_action: true,
      action_done_component_map: {
        include: {
          components_mounted: { include: { component_types: { include: { component_groups: true } } } },
        },
      },
    },
  },
  bike_event_attachments: true,
} satisfies Prisma.events_bikesInclude;

type ServiceWithRelations = Prisma.events_bikesGetPayload<{ include: typeof serviceReportInclude }>;

// The owner's language and currency, read once and frozen into the document.
interface OwnerVoice {
  language: string;
  currency: string;
}

// A Report and the document it was made from, handed back together by Export.
export interface ExportedReport {
  report: reports;
  snapshot: ReportSnapshot;
}

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdf: ReportPdfService,
  ) {}

  // ---------- Export ----------

  // Makes one Report by copying what it covers. Nothing is published yet: the row is
  // closed until a second, deliberate act opens it (ADR 0011).
  async exportReport(userId: number, dto: ExportReportDto): Promise<ExportedReport> {
    // Refuse before writing a row we could not address. A share link built on an empty
    // origin is worse than no share link.
    this.publicAppOrigin();

    if (dto.kind !== report_kind.SERVICE) {
      throw new BadRequestException(`Reports of kind ${dto.kind} cannot be exported yet`);
    }

    const owner = await this.ownerVoice(userId);
    const service = await this.findOwnedService(dto.service_id, userId);

    // Informative only on the report, but a report of nothing is not a document.
    const bikeId = service.bike_id;
    if (bikeId === null) {
      throw new NotFoundException(`Service with ID ${dto.service_id} has no bike to report on`);
    }

    const stored = this.buildServiceSnapshot(service, owner);

    const report = await this.prisma.reports.create({
      data: {
        public_token: randomUUID(),
        user_id: userId,
        bike_id: bikeId,
        kind: report_kind.SERVICE,
        snapshot: stored as unknown as Prisma.InputJsonObject,
      },
    });

    return { report, snapshot: stored.document };
  }

  // ---------- The three states ----------

  // Opens the share link. A revoked report is closed for good; publishing it again would
  // resurrect a link its owner killed.
  async publish(id: number, userId: number): Promise<reports> {
    const report = await this.findOwnedReport(id, userId);
    if (report.revoked) {
      throw new ConflictException('A revoked report cannot be published again');
    }

    return await this.prisma.reports.update({ where: { id }, data: { is_public: true } });
  }

  // Final. What it closes is the page and every attachment behind it, at the same instant.
  async revoke(id: number, userId: number): Promise<reports> {
    await this.findOwnedReport(id, userId);

    return await this.prisma.reports.update({ where: { id }, data: { revoked: true } });
  }

  // Throws away a report nobody has seen. A published one is revoked instead: the link is
  // already out, and deleting the row would leave nothing to take back. Answers with what
  // it removed, so the caller gets a body to parse rather than an empty response.
  async discard(id: number, userId: number): Promise<reports> {
    const report = await this.findOwnedReport(id, userId);
    if (report.is_public) {
      throw new ConflictException('A published report is revoked, not deleted');
    }

    return await this.prisma.reports.delete({ where: { id } });
  }

  // ---------- Reading ----------

  async listMine(userId: number): Promise<reports[]> {
    return await this.prisma.reports.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async listForBike(userId: number, bikeId: number): Promise<reports[]> {
    return await this.prisma.reports.findMany({
      where: { user_id: userId, bike_id: bikeId },
      orderBy: { created_at: 'desc' },
    });
  }

  // Public access by token: the only path that counts a view, and only when a reader is
  // the one asking. Answers the document alone, never what the snapshot keeps back from a
  // reader.
  async getPublicSnapshot(token: string, countView = true): Promise<ReportSnapshot> {
    const report = await this.openReport(token);

    if (countView) {
      await this.prisma.reports.update({
        where: { id: report.id },
        data: { view_count: { increment: 1 }, last_viewed_at: new Date() },
      });
    }

    return this.storedSnapshot(report).document;
  }

  // One attachment behind a share link. The state is re-checked here, per file, on every
  // request - which is what makes revoking close the invoices at the same instant as the
  // page (ADR 0013). Fetching a file is not reading the page, so no view is counted.
  async publicAttachment(token: string, attachmentId: number): Promise<ReportAttachmentFile> {
    const report = await this.openReport(token);

    const attachment = this.findAttachment(report, attachmentId);
    // An id from someone else's report answers exactly as a closed one does, so the route
    // cannot be walked to find out which reports hold which files.
    if (attachment === null) {
      throw new GoneException(REPORT_CLOSED_MESSAGE);
    }

    return await this.read(attachment);
  }

  // The document as a file: the public page printed to A4, so the reader files, prints or
  // attaches the very page they were reading. A print is a server-side visit rather than a
  // reader, so it counts no view.
  async publicPdf(token: string): Promise<ReportPdfFile> {
    const report = await this.openReport(token);
    const document = this.storedSnapshot(report).document;

    const body = await this.pdf.print(this.printUrl(token));

    return { body, filename: this.pdfFilename(document) };
  }

  // The same file on the owner's side, so the preview can open what it lists before any
  // of it is public. Their own report, their own receipt - published or not.
  async ownedAttachment(id: number, userId: number, attachmentId: number): Promise<ReportAttachmentFile> {
    const report = await this.findOwnedReport(id, userId);

    const attachment = this.findAttachment(report, attachmentId);
    if (attachment === null) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} is not part of report ${id}`);
    }

    return await this.read(attachment);
  }

  // The bytes come from storage; the name and type come from the document that froze them,
  // so a receipt reads as what the report says it is rather than what storage holds today.
  private async read(attachment: ReportAttachmentSource): Promise<ReportAttachmentFile> {
    const file = await this.storage.downloadFileR2CloudFare(attachment.key);

    return {
      body: file.body,
      name: attachment.name,
      contentType: attachment.contentType,
      contentLength: file.contentLength,
    };
  }

  // The public address a report is read at. Only ever the web origin: native builds route
  // by hash, and a link that opens nothing outside the app is not a share link.
  shareUrl(token: string): string {
    return `${this.publicAppOrigin()}/r/${token}`;
  }

  // The same page, asked for as it is drawn for print. The variant is chosen in the
  // address rather than left to a print stylesheet, so the render is explicit (ADR 0012).
  printUrl(token: string): string {
    return `${this.shareUrl(token)}?print=1`;
  }

  // ---------- Building the document ----------

  private buildServiceSnapshot(service: ServiceWithRelations, owner: OwnerVoice): StoredReportSnapshot {
    const sources: ReportSnapshotPrivate = { attachmentKeys: {} };
    for (const attachment of service.bike_event_attachments) {
      sources.attachmentKeys[String(attachment.id)] = this.storage.storageKeyFromUrl(attachment.url);
    }

    return {
      document: {
        version: REPORT_SNAPSHOT_VERSION,
        kind: 'SERVICE',
        generatedAt: new Date().toISOString(),
        language: owner.language,
        currency: owner.currency,
        bike: this.buildBike(service.bikes, owner.language),
        service: this.buildService(service, owner.language),
      },
      private: sources,
    };
  }

  private buildBike(bike: ServiceWithRelations['bikes'], language: string): ReportBike {
    // A report outlives the bike it describes, so the bike may already be gone.
    if (bike === null) {
      return {
        name: null,
        brand: '',
        model: null,
        year: null,
        frameMaterial: null,
        type: null,
        ebike: false,
        totalKm: null,
        totalTimeMin: null,
        imageUrl: null,
      };
    }

    return {
      name: bike.bikename,
      brand: bike.bike_brand,
      model: bike.bike_model,
      year: bike.year,
      frameMaterial: bike.frame_material,
      type:
        bike.bike_types === null
          ? null
          : catalogueLabel(language, bike.bike_types.i18n_key, bike.bike_types.type ?? ''),
      ebike: bike.ebike,
      totalKm: bike.total_km,
      totalTimeMin: bike.total_time_min,
      imageUrl: bike.image_url,
    };
  }

  private buildService(service: ServiceWithRelations, language: string): ReportedService {
    // Every action on one service froze the same odometer, so the first one carries it for
    // the whole occasion. A service with no actions never froze it at all.
    const odometer = service.event_actions_done[0];

    return {
      serviceDate: service.service_date?.toISOString() ?? null,
      note: service.note,
      // A history where nobody recorded a price cost zero, which is a number - not an
      // absent one.
      totalCost: service.total_cost === null ? 0 : Number(service.total_cost),
      odometerKm: odometer?.bike_km_at_time ?? null,
      odometerTimeMin: odometer?.bike_minutes_at_time ?? null,
      actions: service.event_actions_done.map((done) => this.buildAction(done, language)),
      attachments: service.bike_event_attachments.map((attachment) => this.buildAttachment(attachment)),
    };
  }

  private buildAction(done: ServiceWithRelations['event_actions_done'][number], language: string): ReportAction {
    return {
      name: catalogueLabel(language, done.events_action.i18n_key, done.events_action.action_name),
      note: done.note,
      // A price nobody recorded stays absent: Number(null) would read as free work.
      cost: done.partial_cost === null ? null : Number(done.partial_cost),
      replacement: done.part_replaced ?? false,
      components: done.action_done_component_map.map((junction) => {
        const mounted = junction.components_mounted;
        return {
          type: catalogueLabel(language, mounted.component_types.i18n_key, mounted.component_types.component_type),
          category: catalogueLabel(
            language,
            mounted.component_types.component_groups.i18n_key,
            mounted.component_types.component_groups.group_name,
          ),
          description: mounted.component_desc,
          position: mounted.position,
          // The baselines frozen at this service, not what the part reads today - the
          // report says how far it had gone when the work was done.
          totalKm: junction.km_at_time,
          totalTimeMin: junction.time_min_at_time,
          healthIndex: null,
          mountedAt: mounted.mounted_at?.toISOString() ?? null,
        } satisfies ReportComponent;
      }),
    };
  }

  private buildAttachment(attachment: ServiceWithRelations['bike_event_attachments'][number]): ReportAttachment {
    return {
      id: attachment.id,
      name: attachment.name,
      contentType: attachment.content_type,
      sizeBytes: attachment.size_bytes,
    };
  }

  // ---------- Helpers ----------

  private async findOwnedService(serviceId: number, userId: number): Promise<ServiceWithRelations> {
    const service = await this.prisma.events_bikes.findFirst({
      where: { id: serviceId, is_deleted: false, bikes: { user_id: userId, is_deleted: false } },
      include: serviceReportInclude,
    });
    if (service === null) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    return service;
  }

  private async findOwnedReport(id: number, userId: number): Promise<reports> {
    const report = await this.prisma.reports.findFirst({ where: { id, user_id: userId } });
    if (report === null) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  // How the owner writes: the language every catalogue label is resolved into, and the
  // currency every figure is written in. Both are frozen into the document.
  private async ownerVoice(userId: number): Promise<OwnerVoice> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { language: true, currency: true },
    });

    return {
      language: reportLanguage(user?.language),
      currency: user?.currency ?? FALLBACK_REPORT_CURRENCY,
    };
  }

  // Every public path starts here. Unpublished, revoked, expired and unknown all leave by
  // the same door, so a token cannot be probed for which of them it is.
  private async openReport(token: string): Promise<reports> {
    const report = await this.prisma.reports.findUnique({ where: { public_token: token } });
    if (report === null || !this.isOpen(report)) {
      throw new GoneException(REPORT_CLOSED_MESSAGE);
    }

    return report;
  }

  // What the reader saves the file under: which document it is and which day it covers.
  // The token stays out of it - a filename is passed on, and a share link is not.
  private pdfFilename(document: ReportSnapshot): string {
    switch (document.kind) {
      case 'SERVICE':
        return `service-report-${this.fileDate(document.service.serviceDate ?? document.generatedAt)}.pdf`;
      case 'PERIOD':
        return `period-report-${this.fileDate(document.period.from ?? document.generatedAt)}.pdf`;
      case 'BIKECHECK':
        return `bikecheck-${this.fileDate(document.generatedAt)}.pdf`;
    }
  }

  private fileDate(iso: string): string {
    return iso.slice(0, 10);
  }

  // Open means published, not revoked and not expired. Nothing sets an expiry, but a row
  // carrying one from elsewhere is still honoured.
  private isOpen(report: reports): boolean {
    return report.is_public && !report.revoked && !(report.expires_at !== null && report.expires_at < new Date());
  }

  // The attachment an id names, or null when this report does not carry it. Name and type
  // come from the document, which froze them; only the key comes from the private side.
  private findAttachment(report: reports, attachmentId: number): ReportAttachmentSource | null {
    const stored = this.storedSnapshot(report);
    const key = stored.private.attachmentKeys[String(attachmentId)];
    if (key === undefined) {
      return null;
    }

    const listed = this.documentAttachments(stored.document).find((entry) => entry.id === attachmentId);
    if (listed === undefined) {
      return null;
    }

    return { key, name: listed.name, contentType: listed.contentType };
  }

  // Every attachment the document lists, whichever kind of document it is.
  private documentAttachments(document: ReportSnapshot): ReportAttachment[] {
    switch (document.kind) {
      case 'SERVICE':
        return document.service.attachments;
      case 'PERIOD':
        return document.services.flatMap((service) => service.attachments);
      case 'BIKECHECK':
        return [];
    }
  }

  private storedSnapshot(report: reports): StoredReportSnapshot {
    return report.snapshot as unknown as StoredReportSnapshot;
  }

  private publicAppOrigin(): string {
    const origin = process.env.PUBLIC_APP_URL;
    if (origin === undefined || origin === '') {
      throw new InternalServerErrorException('PUBLIC_APP_URL is not set, so no share link can be addressed');
    }

    return origin.replace(/\/+$/, '');
  }
}
