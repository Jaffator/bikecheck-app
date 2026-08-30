import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { ConflictException, GoneException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { report_kind } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ReportService } from './report.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ReportPdfService } from './report-pdf.service';
import { StoredReportSnapshot } from './report.types';

// A report is frozen at the moment it is made, so every test here fixes that moment and
// the date of the work it covers.
const SERVICE_DATE = new Date('2026-07-01T00:00:00.000Z');
const MOUNTED_AT = new Date('2026-01-15T00:00:00.000Z');
const OWNER_ID = 7;
const STRANGER_ID = 8;
const BIKE_ID = 15;
const SERVICE_ID = 42;
const REPORT_ID = 99;
const ORIGIN = 'https://app.bikecheck.cloud';
const STORAGE_ORIGIN = 'https://storage.example.com';
const STORAGE_URL = `${STORAGE_ORIGIN}/service-attachments/faktura.pdf`;
const STORAGE_KEY = 'service-attachments/faktura.pdf';
const ATTACHMENT_ID = 900;
const OTHER_REPORTS_ATTACHMENT_ID = 901;

describe('ReportService', () => {
  let service: ReportService;

  const mockPdf = {
    print: jest.fn(),
  };

  const mockStorage = {
    downloadFileR2CloudFare: jest.fn(),
    storageKeyFromUrl: jest.fn(),
  };

  const mockPrisma = {
    reports: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    events_bikes: { findFirst: jest.fn() },
    users: { findUnique: jest.fn() },
  };

  // One recorded Service in the shape the export query asks for: a bleed on a fork that
  // was also replaced, with a receipt filed against the occasion.
  const serviceRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: SERVICE_ID,
    bike_id: BIKE_ID,
    note: 'Winter overhaul',
    total_cost: new Prisma.Decimal(1800),
    service_date: SERVICE_DATE,
    is_deleted: false,
    bikes: {
      id: BIKE_ID,
      bikename: 'Firebird',
      bike_brand: 'Pivot',
      bike_model: 'Firebird',
      year: 2023,
      frame_material: 'Carbon',
      ebike: false,
      total_km: 5200,
      total_time_min: 14000,
      image_url: 'https://storage.example.com/bikes/firebird.webp',
      bike_types: { id: 3, type: 'Enduro', i18n_key: 'bikeType.enduro' },
    },
    event_actions_done: [
      {
        id: 501,
        note: 'Dot 5.1 replaced, lever stroke adjusted.',
        partial_cost: new Prisma.Decimal(600),
        part_replaced: false,
        bike_km_at_time: 4800,
        bike_minutes_at_time: 13000,
        events_action: { id: 1, action_name: 'Bleed', i18n_key: 'action.bleed', replace_action: false },
        action_done_component_map: [
          {
            km_at_time: 3100,
            time_min_at_time: 9000,
            components_mounted: {
              id: 71,
              component_desc: 'Fox 38 Factory',
              position: 'Front',
              mounted_at: MOUNTED_AT,
              component_types: {
                id: 11,
                component_type: 'Fork',
                i18n_key: 'component.fork',
                component_groups: { id: 2, group_name: 'Suspension', i18n_key: 'componentGroup.suspension' },
              },
            },
          },
        ],
      },
      {
        id: 502,
        note: 'Worn past the wear indicator.',
        partial_cost: new Prisma.Decimal(1200),
        part_replaced: true,
        bike_km_at_time: 4800,
        bike_minutes_at_time: 13000,
        events_action: {
          id: 2,
          action_name: 'Chain replacement',
          i18n_key: 'action.chainReplacement',
          replace_action: true,
        },
        action_done_component_map: [],
      },
    ],
    bike_event_attachments: [
      {
        id: 900,
        name: 'faktura.pdf',
        url: STORAGE_URL,
        content_type: 'application/pdf',
        size_bytes: 125829,
      },
    ],
    ...overrides,
  });

  // The three closed states must be indistinguishable, or a token can be probed for which
  // one it is in. Every public path is held to the same list.
  const closedStates: [string, Record<string, unknown>][] = [
    ['never published', { is_public: false }],
    ['revoked', { is_public: true, revoked: true }],
    ['expired', { is_public: true, expires_at: new Date('2020-01-01T00:00:00.000Z') }],
    ['unknown', {}],
  ];

  // A stored report row, in whichever of the three states the test needs.
  const reportRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: REPORT_ID,
    public_token: 'token-1',
    user_id: OWNER_ID,
    bike_id: BIKE_ID,
    kind: report_kind.SERVICE,
    snapshot: storedSnapshot(),
    is_public: false,
    view_count: 0,
    last_viewed_at: null,
    revoked: false,
    expires_at: null,
    created_at: SERVICE_DATE,
    ...overrides,
  });

  // Another published report, carrying an attachment id that is genuinely valid - on it.
  const otherReportRow = (): Record<string, unknown> => {
    const stored = storedSnapshot();
    stored.document = {
      ...stored.document,
      kind: 'SERVICE',
      service: {
        ...(stored.document as { service: Record<string, unknown> }).service,
        attachments: [
          { id: OTHER_REPORTS_ATTACHMENT_ID, name: 'ucet.pdf', contentType: 'application/pdf', sizeBytes: 400 },
        ],
      },
    } as typeof stored.document;
    stored.private = { attachmentKeys: { [String(OTHER_REPORTS_ATTACHMENT_ID)]: 'service-attachments/ucet.pdf' } };

    return reportRow({ id: 100, public_token: 'token-2', is_public: true, snapshot: stored });
  };

  // What the snapshot column holds: the document, and beside it what only the server sees.
  function storedSnapshot(): StoredReportSnapshot {
    return {
      document: {
        version: 2,
        kind: 'SERVICE',
        generatedAt: SERVICE_DATE.toISOString(),
        language: 'en',
        currency: 'CZK',
        bike: {
          name: 'Firebird',
          brand: 'Pivot',
          model: 'Firebird',
          year: 2023,
          frameMaterial: 'Carbon',
          type: 'Enduro',
          ebike: false,
          totalKm: 5200,
          totalTimeMin: 14000,
          imageUrl: null,
        },
        service: {
          serviceDate: SERVICE_DATE.toISOString(),
          note: 'Winter overhaul',
          totalCost: 1800,
          odometerKm: 4800,
          odometerTimeMin: 13000,
          actions: [],
          attachments: [{ id: 900, name: 'faktura.pdf', contentType: 'application/pdf', sizeBytes: 125829 }],
        },
      },
      private: { attachmentKeys: { '900': STORAGE_KEY } },
    };
  }

  // The document Export just wrote, read back out of the create call.
  const writtenSnapshot = (): StoredReportSnapshot =>
    mockPrisma.reports.create.mock.calls[0][0].data.snapshot as StoredReportSnapshot;

  const exportService = (): Promise<{ snapshot: unknown }> =>
    service.exportReport(OWNER_ID, { kind: report_kind.SERVICE, service_id: SERVICE_ID });

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.PUBLIC_APP_URL = ORIGIN;
    // Uploads are served from this origin, so it is the part of an attachment address
    // that is not the storage key.
    process.env.CLOUDFLARE_PUBLIC_URL = STORAGE_ORIGIN;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: ReportPdfService, useValue: mockPdf },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);

    // Storage answers for the key it is given, and maps an upload address back to it the
    // way the real one does.
    mockStorage.storageKeyFromUrl.mockImplementation((url: string) => url.replace(`${STORAGE_ORIGIN}/`, ''));
    mockStorage.downloadFileR2CloudFare.mockResolvedValue({
      body: Readable.from([Buffer.from('%PDF-1.7')]),
      contentLength: 8,
    });

    mockPdf.print.mockResolvedValue(Buffer.from('%PDF-1.7 printed'));

    // The caller owns the service and writes in English unless a test says otherwise.
    mockPrisma.users.findUnique.mockResolvedValue({ language: 'en', currency: 'CZK' });
    mockPrisma.events_bikes.findFirst.mockResolvedValue(serviceRow());
    mockPrisma.reports.create.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...reportRow(), ...args.data }),
    );
    mockPrisma.reports.update.mockImplementation((args: { where: { id: number }; data: Record<string, unknown> }) =>
      Promise.resolve({ ...reportRow(), ...args.data }),
    );
  });

  describe('exportReport', () => {
    it('answers with the report metadata and the document it just made', async () => {
      const { report, snapshot } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });

      expect(report.kind).toBe(report_kind.SERVICE);
      expect(report.bike_id).toBe(BIKE_ID);
      expect(snapshot.kind).toBe('SERVICE');
      expect(snapshot.version).toBe(2);
    });

    it('refuses a service the caller does not own', async () => {
      mockPrisma.events_bikes.findFirst.mockResolvedValue(null);

      await expect(
        service.exportReport(STRANGER_ID, { kind: report_kind.SERVICE, service_id: SERVICE_ID }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.reports.create).not.toHaveBeenCalled();
    });

    it('asks only for services on a bike the caller owns', async () => {
      await exportService();

      expect(mockPrisma.events_bikes.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: SERVICE_ID,
            bikes: { user_id: OWNER_ID, is_deleted: false },
          }),
        }),
      );
    });

    it('carries the whole occasion: date, bike, actions, cost, odometer and attachments', async () => {
      const { snapshot } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });
      if (snapshot.kind !== 'SERVICE') throw new Error('expected a service report');

      expect(snapshot.service.serviceDate).toBe(SERVICE_DATE.toISOString());
      expect(snapshot.service.note).toBe('Winter overhaul');
      expect(snapshot.service.totalCost).toBe(1800);
      expect(snapshot.service.odometerKm).toBe(4800);
      expect(snapshot.service.odometerTimeMin).toBe(13000);
      expect(snapshot.bike).toMatchObject({ brand: 'Pivot', model: 'Firebird', year: 2023, ebike: false });
      expect(snapshot.service.attachments).toEqual([
        { id: 900, name: 'faktura.pdf', contentType: 'application/pdf', sizeBytes: 125829 },
      ]);
    });

    it('records each action with its note, its cost and whether it was a replacement', async () => {
      const { snapshot } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });
      if (snapshot.kind !== 'SERVICE') throw new Error('expected a service report');

      expect(snapshot.service.actions).toHaveLength(2);
      expect(snapshot.service.actions[0]).toMatchObject({
        note: 'Dot 5.1 replaced, lever stroke adjusted.',
        cost: 600,
        replacement: false,
      });
      expect(snapshot.service.actions[1]).toMatchObject({ cost: 1200, replacement: true });
    });

    it('names the mounted components an action touched, with the wear frozen at the service', async () => {
      const { snapshot } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });
      if (snapshot.kind !== 'SERVICE') throw new Error('expected a service report');

      expect(snapshot.service.actions[0].components).toEqual([
        {
          type: 'Fork',
          category: 'Suspension',
          description: 'Fox 38 Factory',
          position: 'Front',
          totalKm: 3100,
          totalTimeMin: 9000,
          healthIndex: null,
          mountedAt: MOUNTED_AT.toISOString(),
        },
      ]);
    });

    it('resolves catalogue labels into the owner language and records which one it was', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ language: 'cs', currency: 'EUR' });

      const { snapshot } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });
      if (snapshot.kind !== 'SERVICE') throw new Error('expected a service report');

      expect(snapshot.language).toBe('cs');
      expect(snapshot.currency).toBe('EUR');
      expect(snapshot.service.actions[0].name).toBe('Odvzdušnění');
      expect(snapshot.service.actions[0].components[0].type).toBe('Vidlice');
      expect(snapshot.bike.type).toBe('Enduro');
    });

    it('keeps the name a user gave their own action, which no language translates', async () => {
      const row = serviceRow();
      (row.event_actions_done as Record<string, unknown>[])[0].events_action = {
        id: 90,
        action_name: 'Repack the shuttle guard',
        i18n_key: null,
        replace_action: false,
      };
      mockPrisma.events_bikes.findFirst.mockResolvedValue(row);
      mockPrisma.users.findUnique.mockResolvedValue({ language: 'cs', currency: 'EUR' });

      const { snapshot } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });
      if (snapshot.kind !== 'SERVICE') throw new Error('expected a service report');

      expect(snapshot.service.actions[0].name).toBe('Repack the shuttle guard');
    });

    it('writes English when the owner never chose a language', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ language: null, currency: null });

      const { snapshot } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });

      expect(snapshot.language).toBe('en');
      expect(snapshot.currency).toBe('CZK');
    });

    it('makes a report that is closed: published to nobody and not revoked', async () => {
      const { report } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });

      expect(report.is_public).toBe(false);
      expect(report.revoked).toBe(false);
      expect(mockPrisma.reports.create.mock.calls[0][0].data).not.toHaveProperty('is_public', true);
    });

    it('gives every export its own link, so revoking one leaves the other alive', async () => {
      await exportService();
      await exportService();

      const first = mockPrisma.reports.create.mock.calls[0][0].data.public_token as string;
      const second = mockPrisma.reports.create.mock.calls[1][0].data.public_token as string;
      expect(first).not.toBe(second);
    });

    it('keeps the storage address out of the document and beside it instead', async () => {
      const { snapshot } = await service.exportReport(OWNER_ID, {
        kind: report_kind.SERVICE,
        service_id: SERVICE_ID,
      });

      expect(JSON.stringify(snapshot)).not.toContain(STORAGE_URL);
      expect(JSON.stringify(snapshot)).not.toContain(STORAGE_KEY);
      expect(writtenSnapshot().private.attachmentKeys).toEqual({ '900': STORAGE_KEY });
    });

    it('refuses the kinds that have no export yet', async () => {
      await expect(
        service.exportReport(OWNER_ID, { kind: report_kind.PERIOD, service_id: SERVICE_ID }),
      ).rejects.toThrow(/cannot be exported yet/);
    });

    it('fails loudly, before writing a row, when there is no origin to address a link from', async () => {
      delete process.env.PUBLIC_APP_URL;

      await expect(exportService()).rejects.toThrow(InternalServerErrorException);
      expect(mockPrisma.reports.create).not.toHaveBeenCalled();
    });

    it('does not count a view: the owner previewing what they made is not a reader', async () => {
      await exportService();

      expect(mockPrisma.reports.update).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('opens the share link', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(reportRow());

      const report = await service.publish(REPORT_ID, OWNER_ID);

      expect(report.is_public).toBe(true);
      expect(mockPrisma.reports.update).toHaveBeenCalledWith({ where: { id: REPORT_ID }, data: { is_public: true } });
    });

    it('refuses to resurrect a revoked report', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(reportRow({ is_public: true, revoked: true }));

      await expect(service.publish(REPORT_ID, OWNER_ID)).rejects.toThrow(ConflictException);
      expect(mockPrisma.reports.update).not.toHaveBeenCalled();
    });

    it('does not reach another user report', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(null);

      await expect(service.publish(REPORT_ID, STRANGER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.reports.findFirst).toHaveBeenCalledWith({ where: { id: REPORT_ID, user_id: STRANGER_ID } });
    });
  });

  describe('revoke', () => {
    it('closes the link for good', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(reportRow({ is_public: true }));

      const report = await service.revoke(REPORT_ID, OWNER_ID);

      expect(report.revoked).toBe(true);
      expect(mockPrisma.reports.update).toHaveBeenCalledWith({ where: { id: REPORT_ID }, data: { revoked: true } });
    });

    it('does not reach another user report', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(null);

      await expect(service.revoke(REPORT_ID, STRANGER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.reports.update).not.toHaveBeenCalled();
    });
  });

  describe('discard', () => {
    it('removes a report nobody has seen', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(reportRow());

      await service.discard(REPORT_ID, OWNER_ID);

      expect(mockPrisma.reports.delete).toHaveBeenCalledWith({ where: { id: REPORT_ID } });
    });

    it('refuses a published report, which is revoked rather than deleted', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(reportRow({ is_public: true }));

      await expect(service.discard(REPORT_ID, OWNER_ID)).rejects.toThrow(ConflictException);
      expect(mockPrisma.reports.delete).not.toHaveBeenCalled();
    });

    it('does not reach another user report', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(null);

      await expect(service.discard(REPORT_ID, STRANGER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.reports.delete).not.toHaveBeenCalled();
    });
  });

  describe('getPublicSnapshot', () => {
    it('opens a published report', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      const snapshot = await service.getPublicSnapshot('token-1');

      expect(snapshot.kind).toBe('SERVICE');
    });

    it.each(closedStates)('answers a %s token with the same gone message', async (state, overrides) => {
      mockPrisma.reports.findUnique.mockResolvedValue(state === 'unknown' ? null : reportRow(overrides));

      await expect(service.getPublicSnapshot('token-1')).rejects.toThrow(GoneException);
      await expect(service.getPublicSnapshot('token-1')).rejects.toThrow('This report is no longer available');
    });

    it('counts the view and remembers when it was read', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      await service.getPublicSnapshot('token-1');

      expect(mockPrisma.reports.update).toHaveBeenCalledWith({
        where: { id: REPORT_ID },
        data: { view_count: { increment: 1 }, last_viewed_at: expect.any(Date) },
      });
    });

    it('counts nothing on a closed report', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: false }));

      await expect(service.getPublicSnapshot('token-1')).rejects.toThrow(GoneException);
      expect(mockPrisma.reports.update).not.toHaveBeenCalled();
    });

    // The printer opens the page like anyone else, so the read has to know the difference
    // between a reader and the server drawing the document for a file.
    it('counts nothing when the page is being drawn for print', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      const snapshot = await service.getPublicSnapshot('token-1', false);

      expect(snapshot.kind).toBe('SERVICE');
      expect(mockPrisma.reports.update).not.toHaveBeenCalled();
    });

    it('strips what the reader has no business seeing', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      const snapshot = await service.getPublicSnapshot('token-1');

      expect(snapshot).not.toHaveProperty('private');
      expect(JSON.stringify(snapshot)).not.toContain(STORAGE_URL);
      expect(JSON.stringify(snapshot)).not.toContain(STORAGE_KEY);
    });

    // Freezing, proven by what the read never asks: the document comes out of the row it
    // was written into, so the live rows may have changed or gone (ADR 0011).
    it('reads the stored document without touching the data it was built from', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      const snapshot = await service.getPublicSnapshot('token-1');

      expect(mockPrisma.events_bikes.findFirst).not.toHaveBeenCalled();
      if (snapshot.kind !== 'SERVICE') throw new Error('expected a service report');
      expect(snapshot.service.note).toBe('Winter overhaul');
    });

    // The same rule, proven against the data rather than against the query: the service
    // the report was made from is edited, and the published page does not follow it.
    it('still reads as it did after the service it covers has been edited', async () => {
      const edited = serviceRow({
        note: 'Rewritten long after the report was sent',
        total_cost: new Prisma.Decimal(1),
      });
      mockPrisma.events_bikes.findFirst.mockResolvedValue(edited);
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      const snapshot = await service.getPublicSnapshot('token-1');

      if (snapshot.kind !== 'SERVICE') throw new Error('expected a service report');
      expect(snapshot.service.note).toBe('Winter overhaul');
      expect(snapshot.service.totalCost).toBe(1800);
    });

    // And against a service that is gone altogether - a doc handed over does not empty
    // itself when the owner deletes what it was made from.
    it('still reads as it did after the service it covers has been deleted', async () => {
      mockPrisma.events_bikes.findFirst.mockResolvedValue(null);
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      const snapshot = await service.getPublicSnapshot('token-1');

      if (snapshot.kind !== 'SERVICE') throw new Error('expected a service report');
      expect(snapshot.service.note).toBe('Winter overhaul');
      expect(snapshot.service.attachments).toHaveLength(1);
    });
  });

  // ADR 0013: what a Report hands a stranger is an id, and the bytes come back through the
  // Report itself. The check runs per file, which is what gives revocation its meaning.
  describe('publicAttachment', () => {
    it('hands back the stored key and the content type frozen with it', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      const attachment = await service.publicAttachment('token-1', ATTACHMENT_ID);

      expect(mockStorage.downloadFileR2CloudFare).toHaveBeenCalledWith(STORAGE_KEY);
      expect(attachment.contentType).toBe('application/pdf');
      expect(attachment.name).toBe('faktura.pdf');
      expect(attachment.body).toBeInstanceOf(Readable);
    });

    // The same three closed states, answered the same way, one file at a time.
    it.each([
      ['never published', { is_public: false }],
      ['revoked', { is_public: true, revoked: true }],
      ['expired', { is_public: true, expires_at: new Date('2020-01-01T00:00:00.000Z') }],
    ])('refuses the file of a %s report with the same gone message', async (_state, overrides) => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow(overrides));

      await expect(service.publicAttachment('token-1', ATTACHMENT_ID)).rejects.toThrow(GoneException);
      await expect(service.publicAttachment('token-1', ATTACHMENT_ID)).rejects.toThrow(
        'This report is no longer available',
      );
    });

    it('serves the file, then refuses the very same file once the report is revoked', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));
      await expect(service.publicAttachment('token-1', ATTACHMENT_ID)).resolves.toBeDefined();

      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true, revoked: true }));
      await expect(service.publicAttachment('token-1', ATTACHMENT_ID)).rejects.toThrow(GoneException);
    });

    it('refuses an attachment that is real, but belongs to a different report', async () => {
      // The id opens fine on the report that carries it...
      mockPrisma.reports.findUnique.mockResolvedValue(otherReportRow());
      await expect(service.publicAttachment('token-2', OTHER_REPORTS_ATTACHMENT_ID)).resolves.toBeDefined();

      // ...and not through the token of a report that does not.
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));
      await expect(service.publicAttachment('token-1', OTHER_REPORTS_ATTACHMENT_ID)).rejects.toThrow(GoneException);
    });

    it('does not reach storage at all for a closed report', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: false }));

      await expect(service.publicAttachment('token-1', ATTACHMENT_ID)).rejects.toThrow(GoneException);
      expect(mockStorage.downloadFileR2CloudFare).not.toHaveBeenCalled();
    });

    it('does not count a view: fetching a file is not reading the page', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      await service.publicAttachment('token-1', ATTACHMENT_ID);

      expect(mockPrisma.reports.update).not.toHaveBeenCalled();
    });
  });

  // The owner reads their own attachments out of the preview, before anything is public.
  describe('ownedAttachment', () => {
    it('opens a file on a report the caller made but has not published', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(reportRow());

      const attachment = await service.ownedAttachment(REPORT_ID, OWNER_ID, ATTACHMENT_ID);

      expect(mockStorage.downloadFileR2CloudFare).toHaveBeenCalledWith(STORAGE_KEY);
      expect(attachment.name).toBe('faktura.pdf');
    });

    it('does not reach another user report', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(null);

      await expect(service.ownedAttachment(REPORT_ID, STRANGER_ID, ATTACHMENT_ID)).rejects.toThrow(NotFoundException);
    });

    it('refuses an attachment that belongs to a different report', async () => {
      mockPrisma.reports.findFirst.mockResolvedValue(reportRow());

      await expect(service.ownedAttachment(REPORT_ID, OWNER_ID, OTHER_REPORTS_ATTACHMENT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('publicPdf', () => {
    it('prints the print variant of the very page the reader is on', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      await service.publicPdf('token-1');

      expect(mockPdf.print).toHaveBeenCalledWith(`${ORIGIN}/r/token-1?print=1`);
    });

    it('names the file after the document and the day it covers, never the token', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      const file = await service.publicPdf('token-1');

      expect(file.filename).toBe('service-report-2026-07-01.pdf');
      expect(file.filename).not.toContain('token-1');
      expect(file.body.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it.each(closedStates)('answers a %s token with the same gone message', async (state, overrides) => {
      mockPrisma.reports.findUnique.mockResolvedValue(state === 'unknown' ? null : reportRow(overrides));

      await expect(service.publicPdf('token-1')).rejects.toThrow(GoneException);
      await expect(service.publicPdf('token-1')).rejects.toThrow('This report is no longer available');
    });

    it('never reaches the browser for a closed report', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: false }));

      await expect(service.publicPdf('token-1')).rejects.toThrow(GoneException);
      expect(mockPdf.print).not.toHaveBeenCalled();
    });

    it('does not count a view: printing the page is not a reader opening it', async () => {
      mockPrisma.reports.findUnique.mockResolvedValue(reportRow({ is_public: true }));

      await service.publicPdf('token-1');

      expect(mockPrisma.reports.update).not.toHaveBeenCalled();
    });
  });

  describe('shareUrl', () => {
    it('addresses the web origin, whatever trailing slash it was configured with', () => {
      process.env.PUBLIC_APP_URL = `${ORIGIN}/`;

      expect(service.shareUrl('token-1')).toBe(`${ORIGIN}/r/token-1`);
    });

    it('refuses to invent an origin it was never given', () => {
      delete process.env.PUBLIC_APP_URL;

      expect(() => service.shareUrl('token-1')).toThrow(InternalServerErrorException);
    });
  });
});
