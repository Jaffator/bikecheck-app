import {
  GoneException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { access, readFile } from 'fs/promises';
import { buffer } from 'stream/consumers';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { publicAppOrigin } from '../_config/public-app-origin';
import { ProfileService } from '../profile/profile.service';
import { ProfileBikeCardDto, ProfileGarageDto } from '../profile/dto/response-profile-garage.dto';
import { ProfileBikeDto } from '../profile/dto/response-profile-bike.dto';
import { ReportService } from '../report/report.service';
import { catalogueLabel } from '../report/report-catalogue-labels';
import { ReportBike, ReportSnapshot } from '../report/report.types';
import { StorageService } from '../storage/storage.service';
import { MAIL_LOGO_KEY } from '../mail/mail-layout';
import { injectOgBlock, PreviewTags, renderOgBlock, stripTitle } from './og-tags';
import { letterboxJpeg, neutralJpeg } from './og-image';

// Where Caddy sends /u/* and /r/* (docs/research/hosting.md), under Nest's global prefix.
const PREVIEW_PATH = '/api/preview';

const SHELL_UNSET = 'SPA_INDEX_HTML is not set, so the preview shell cannot be served';

// What a closed page says - Off, Followers only, an unknown handle, a closed Report: one
// text, so a link cannot be probed for which of them it is.
const NEUTRAL_TITLE = 'BikeCheck';
const NEUTRAL_DESCRIPTION = 'Track the service of your bikes and share your build with others.';

// The mark on the neutral card: the mail logo, already in R2 for the same reason.
const NEUTRAL_LOGO_KEY = `static/${MAIL_LOGO_KEY}`;

// The document's English name, as the public page heads it (reportHeadings.ts).
const REPORT_KIND_LABEL: Record<ReportSnapshot['kind'], string> = {
  SERVICE: 'Service Report',
  PERIOD: 'Period Report',
  BIKECHECK: 'BikeCheck',
};

@Injectable()
export class PreviewService implements OnModuleInit {
  // The built index.html, read once. A promise, so two first requests read it once too.
  private shellPromise: Promise<string> | null = null;
  // The neutral card never changes, so it is drawn once.
  private neutralPromise: Promise<Buffer> | null = null;

  constructor(
    private readonly profileService: ProfileService,
    private readonly reportService: ReportService,
    private readonly storage: StorageService,
    @InjectPinoLogger(PreviewService.name) private readonly logger: PinoLogger,
  ) {}

  // A missing shell is loud in the log but does not stop the API: only /preview needs it.
  async onModuleInit(): Promise<void> {
    const path = process.env.SPA_INDEX_HTML;
    if (path === undefined || path === '') {
      this.logger.warn(SHELL_UNSET);
      return;
    }
    try {
      await access(path);
    } catch {
      this.logger.warn(`SPA_INDEX_HTML points at ${path}, which cannot be read`);
    }
  }

  // ---------- Shells ----------

  async garageShell(handle: string): Promise<string> {
    return await this.render(await this.openOrNeutral(() => this.garageTags(handle)));
  }

  // The id arrives as whatever stood in the address; a person mistyping it still gets the
  // SPA, which draws its own closed page.
  async bikeShell(handle: string, bikeId: number): Promise<string> {
    return await this.render(await this.openOrNeutral(() => this.bikeTags(handle, bikeId)));
  }

  // Fixes the missing <title> and card of a Share Link at the same time (ADR 0012 named the gap).
  async reportShell(token: string): Promise<string> {
    return await this.render(await this.openOrNeutral(() => this.reportTags(token)));
  }

  private async openOrNeutral(tags: () => Promise<PreviewTags | null>): Promise<PreviewTags> {
    return (await this.closedAsNull(tags)) ?? this.neutralTags();
  }

  // Whatever the page's own read refuses - 404 for a profile, 410 for a Report - is closed.
  // Any other failure is this server's and stays loud.
  private async closedAsNull<T>(read: () => Promise<T>): Promise<T | null> {
    try {
      return await read();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof GoneException) return null;
      throw error;
    }
  }

  private neutralTags(): PreviewTags {
    const origin = this.origin();
    return {
      title: NEUTRAL_TITLE,
      description: NEUTRAL_DESCRIPTION,
      url: origin,
      type: 'website',
      image: { url: `${origin}${PREVIEW_PATH}/image.jpg`, alt: NEUTRAL_TITLE },
    };
  }

  // ---------- Images ----------

  // The first Shared Bike with a photo stands for the garage; none, or a closed garage,
  // is the neutral card. Same reads as the shell, so no view is counted here either.
  async garageImage(handle: string): Promise<Buffer> {
    const cards = await this.cards(handle);
    return await this.photoOrNeutral(cards.find((bike) => bike.image_url !== null)?.image_url ?? null);
  }

  // The card knows the photo, so the garage read serves: the bike page's sections are not needed.
  async bikeImage(handle: string, bikeId: number): Promise<Buffer> {
    const cards = await this.cards(handle);
    return await this.photoOrNeutral(cards.find((bike) => bike.id === bikeId)?.image_url ?? null);
  }

  async reportImage(token: string): Promise<Buffer> {
    const document = await this.closedAsNull(() => this.reportService.getPublicSnapshot(token, false));
    return await this.photoOrNeutral(document?.bike.imageUrl ?? null);
  }

  async neutralImage(): Promise<Buffer> {
    this.neutralPromise ??= this.drawNeutral();
    return await this.neutralPromise;
  }

  private async drawNeutral(): Promise<Buffer> {
    return await neutralJpeg(await this.logo());
  }

  // The Shared Bikes of an open garage; a closed one has none to show.
  private async cards(handle: string): Promise<ProfileBikeCardDto[]> {
    const response = await this.closedAsNull(() => this.profileService.read(handle, null));
    return response?.garage?.bikes ?? [];
  }

  private async photoOrNeutral(imageUrl: string | null): Promise<Buffer> {
    if (imageUrl === null) return await this.neutralImage();
    return await letterboxJpeg(await this.download(imageUrl));
  }

  private async download(url: string): Promise<Buffer> {
    const file = await this.storage.downloadFileR2CloudFare(this.storage.storageKeyFromUrl(url));
    return await buffer(file.body);
  }

  // A card without the mark is still a card; a storage hiccup must not take the preview down.
  private async logo(): Promise<Buffer | null> {
    try {
      return await buffer((await this.storage.downloadFileR2CloudFare(NEUTRAL_LOGO_KEY)).body);
    } catch (error) {
      this.logger.warn({ err: error }, `The neutral preview card has no logo: ${NEUTRAL_LOGO_KEY} could not be read`);
      return null;
    }
  }

  // ---------- Tags ----------

  // The in-app read with no viewer: PUBLIC opens, FOLLOWERS answers the header alone, OFF
  // and an unknown handle 404. None of them counts a view - the SPA's own call does.
  private async garageTags(handle: string): Promise<PreviewTags | null> {
    const response = await this.profileService.read(handle, null);
    if (response.garage === null) return null;

    const origin = this.origin();
    const title = ownerName(response.owner.name, response.owner.handle);
    return {
      title,
      description: garageLine(response.garage),
      url: `${origin}/u/${response.owner.handle}`,
      type: 'profile',
      image: {
        url: `${origin}${PREVIEW_PATH}/u/${response.owner.handle}/image.jpg?v=${version(response.garage.updated_at)}`,
        alt: title,
      },
    };
  }

  // The web bike read: PUBLIC and a Shared Bike open, everything else is one 404. No view.
  private async bikeTags(handle: string, bikeId: number): Promise<PreviewTags | null> {
    if (!Number.isInteger(bikeId)) return null;
    const response = await this.profileService.readPublicBike(handle, bikeId);

    const origin = this.origin();
    const path = `/u/${response.owner.handle}/${response.bike.id}`;
    const title = bikeTitle(response.bike);
    return {
      title,
      description: bikeLine(response.bike),
      url: `${origin}${path}`,
      type: 'website',
      image: {
        url: `${origin}${PREVIEW_PATH}${path}/image.jpg?v=${version(response.bike.updated_at)}`,
        alt: [title, bikeType(response.bike)].filter((part) => part !== null).join(' · '),
      },
    };
  }

  // The frozen document, read without counting a view - as the print does.
  private async reportTags(token: string): Promise<PreviewTags> {
    const document = await this.reportService.getPublicSnapshot(token, false);

    const origin = this.origin();
    const bike = reportBikeLabel(document.bike);
    return {
      title: `${REPORT_KIND_LABEL[document.kind]} · ${bike}`,
      description: reportLine(document),
      url: `${origin}/r/${token}`,
      type: 'website',
      image: { url: `${origin}${PREVIEW_PATH}/r/${token}/image.jpg?v=${version(document.generatedAt)}`, alt: bike },
    };
  }

  // ---------- The shell ----------

  private async render(tags: PreviewTags): Promise<string> {
    const html = injectOgBlock(await this.shell(), renderOgBlock(tags));
    if (html === null) throw new InternalServerErrorException('SPA_INDEX_HTML has no </head> to carry the preview');
    return html;
  }

  private async shell(): Promise<string> {
    this.shellPromise ??= this.loadShell();
    try {
      return await this.shellPromise;
    } catch (error) {
      // A failed read is not cached: the file may be mounted a moment later.
      this.shellPromise = null;
      throw error;
    }
  }

  private async loadShell(): Promise<string> {
    const path = process.env.SPA_INDEX_HTML;
    if (path === undefined || path === '') throw new InternalServerErrorException(SHELL_UNSET);
    try {
      return stripTitle(await readFile(path, 'utf8'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new InternalServerErrorException(`SPA_INDEX_HTML could not be read from ${path}: ${message}`);
    }
  }

  private origin(): string {
    return publicAppOrigin('link preview');
  }
}

// The owner as the card names them; an account without a name is its address.
function ownerName(name: string | null, handle: string): string {
  const trimmed = name?.trim() ?? '';
  return trimmed === '' ? `@${handle}` : trimmed;
}

// "2 bikes · 4,187 km · 32 components · 26 services"; a null count is a section the owner keeps in.
function garageLine(garage: ProfileGarageDto): string {
  const parts = [count(garage.totals.bikes, 'bike'), km(garage.totals.distance_km)];
  if (garage.totals.components !== null) parts.push(count(garage.totals.components, 'component'));
  if (garage.totals.services !== null) parts.push(count(garage.totals.services, 'service'));
  return parts.join(' · ');
}

// "4,187 km · 32 components · 26 services": the parts of the build that goes out, the
// Services on record - each only while its section is shared.
function bikeLine(bike: ProfileBikeDto): string {
  const parts = [km(bike.distance_km)];
  if (bike.components !== null) parts.push(count(sum(bike.components.map((group) => group.parts.length)), 'component'));
  if (bike.history !== null) parts.push(count(bike.history.total_count, 'service'));
  return parts.join(' · ');
}

// What the card calls the bike: brand and model, never the owner's nickname alone.
function bikeTitle(bike: ProfileBikeDto): string {
  const title = [bike.brand, bike.model].filter(Boolean).join(' ').trim();
  return title === '' ? bike.name?.trim() || 'Bike' : title;
}

// The type in the report's English words: a crawler has no language to translate into.
function bikeType(bike: ProfileBikeDto): string | null {
  return bike.type === null ? null : catalogueLabel('en', bike.type.i18n_key, bike.type.name);
}

// The bike as the Report's own list names it: brand, model, year.
function reportBikeLabel(bike: ReportBike): string {
  return [bike.brand, bike.model, bike.year].filter(Boolean).join(' ');
}

// What the document covers, never what it cost: a crawler's cache outlives a revoked link.
function reportLine(document: ReportSnapshot): string {
  switch (document.kind) {
    case 'SERVICE': {
      const when =
        document.service.serviceDate === null ? 'Service' : `Service on ${day(document.service.serviceDate)}`;
      return `${when} · ${count(document.service.actions.length, 'action')}`;
    }
    case 'PERIOD': {
      const span =
        document.period.from === null && document.period.to === null
          ? 'All time'
          : `${document.period.from ?? '…'} – ${document.period.to ?? '…'}`;
      return [
        span,
        count(document.totals.serviceCount, 'service'),
        count(document.totals.replacementCount, 'replacement'),
      ].join(' · ');
    }
    case 'BIKECHECK': {
      const parts = document.bike.totalKm === null ? [] : [km(document.bike.totalKm)];
      return [...parts, count(document.components.length, 'component')].join(' · ');
    }
  }
}

function day(iso: string): string {
  return iso.slice(0, 10);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function count(value: number, noun: string): string {
  return `${number(value)} ${noun}${value === 1 ? '' : 's'}`;
}

function km(value: number): string {
  return `${number(value)} km`;
}

// English throughout: a crawler has no language and caches per URL.
function number(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// Crawlers cache an image by its URL, so Last Updated rides along as the cache key.
function version(iso: string): string {
  const ms = Date.parse(iso);
  return String(Number.isNaN(ms) ? 0 : ms);
}
