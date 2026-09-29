import { Test, TestingModule } from '@nestjs/testing';
import { access, readFile } from 'fs/promises';
import { Readable } from 'stream';
import sharp from 'sharp';
import { getLoggerToken } from 'nestjs-pino';
import { PreviewService } from './preview.service';
import { ProfileService } from '../profile/profile.service';
import { ReportService } from '../report/report.service';
import { StorageService } from '../storage/storage.service';
import { ResponseProfileGarageDto } from '../profile/dto/response-profile-garage.dto';
import { ResponseProfileBikeDto } from '../profile/dto/response-profile-bike.dto';
import { GoneException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PeriodReportSnapshot, ReportSnapshot, ServiceReportSnapshot } from '../report/report.types';

// The one boundary the service reads on its own: the built index.html on disk.
jest.mock('fs/promises', () => ({
  ...jest.requireActual<typeof import('fs/promises')>('fs/promises'),
  readFile: jest.fn(),
  access: jest.fn(),
}));

const readFileMock = readFile as jest.Mock;
const accessMock = access as jest.Mock;

const ORIGIN = 'https://app.bikecheck.cloud';
const INDEX_PATH = '/srv/dist/index.html';
const HANDLE = 'jarda-novak';
// 2026-09-12T10:20:30.000Z as the crawler's cache key.
const UPDATED_AT = '2026-09-12T10:20:30.000Z';
const UPDATED_AT_MS = '1789208430000';
const BIKE_ID = 15;
// 2026-09-01T08:00:00.000Z, the bike's own Last Updated.
const BIKE_UPDATED_AT = '2026-09-01T08:00:00.000Z';
const BIKE_UPDATED_AT_MS = '1788249600000';
const TOKEN = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
// 2026-07-02T09:00:00.000Z, when the Report was made - a Report never changes after.
const GENERATED_AT = '2026-07-02T09:00:00.000Z';
const GENERATED_AT_MS = '1782982800000';

// The built Vite shell: charset first, its own placeholder title, the hashed assets.
const SHELL = [
  '<!doctype html>',
  '<html lang="en">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <title>bikecheck</title>',
  '    <script type="module" crossorigin src="/assets/index-abc.js"></script>',
  '  </head>',
  '  <body><div id="root"></div></body>',
  '</html>',
].join('\n');

describe('PreviewService', () => {
  let service: PreviewService;

  const mockProfile = {
    read: jest.fn(),
    readPublic: jest.fn(),
    readPublicBike: jest.fn(),
  };
  const mockReport = { getPublicSnapshot: jest.fn() };
  const mockStorage = { downloadFileR2CloudFare: jest.fn(), storageKeyFromUrl: jest.fn() };
  const mockLogger = { warn: jest.fn(), error: jest.fn(), info: jest.fn() };

  const garageResponse = (overrides: Partial<ResponseProfileGarageDto> = {}): ResponseProfileGarageDto => ({
    owner: { handle: HANDLE, name: 'Jarda Novák', avatar_url: null },
    visibility: 'PUBLIC',
    relation: 'NONE',
    garage: {
      updated_at: UPDATED_AT,
      shares: { components: true, setup: true, history: true, costs: false },
      totals: { bikes: 2, distance_km: 4187, components: 32, services: 26 },
      currency: 'CZK',
      tire_pressure_unit: 'bar',
      bikes: [
        {
          id: 15,
          name: 'Rallon',
          brand: 'Orbea',
          model: 'Rallon M10',
          year: 2024,
          type: { i18n_key: 'bikeType.enduro', name: 'Enduro' },
          image_url: null,
          distance_km: 3000,
          components: 20,
          services: 16,
        },
        {
          id: 16,
          name: null,
          brand: 'Pivot',
          model: 'Firebird',
          year: 2023,
          type: null,
          image_url: 'https://storage.example.com/bikes/firebird.webp',
          distance_km: 1187,
          components: 12,
          services: 10,
        },
      ],
    },
    ...overrides,
  });

  const part = (id: number): ResponseProfileBikeDto['bike']['components'][number]['parts'][number] => ({
    id,
    type: { i18n_key: 'component.fork', name: 'Fork' },
    description: 'Fox 38',
    position: null,
    distance_km: null,
    time_min: null,
  });

  const bikeResponse = (overrides: Partial<ResponseProfileBikeDto['bike']> = {}): ResponseProfileBikeDto => ({
    owner: { handle: HANDLE, name: 'Jarda Novák', avatar_url: null },
    visibility: 'PUBLIC',
    relation: 'NONE',
    currency: 'CZK',
    tire_pressure_unit: 'bar',
    bike: {
      id: BIKE_ID,
      name: 'Rallon',
      brand: 'Orbea',
      model: 'Rallon M10',
      year: 2024,
      type: { i18n_key: 'bikeType.enduro', name: 'Enduro' },
      image_url: 'https://storage.example.com/bikes/rallon.webp',
      distance_km: 4187,
      services: 26,
      updated_at: BIKE_UPDATED_AT,
      time_min: 15000,
      ebike: false,
      frame_material: 'carbon',
      has_front_suspension: true,
      has_rear_suspension: true,
      components: [
        { category: { i18n_key: 'componentGroup.suspension', name: 'Suspension' }, parts: [part(1), part(2)] },
        { category: { i18n_key: 'componentGroup.brakes', name: 'Brakes' }, parts: [part(3)] },
      ],
      setup: [],
      history: { totals: { services: 26, replacements: 9 }, services: [], total_count: 26 },
      ...overrides,
    },
  });

  const reportBike = {
    name: 'Rallon',
    brand: 'Orbea',
    model: 'Rallon M10',
    year: 2024,
    frameMaterial: 'Carbon',
    type: 'Enduro',
    ebike: false,
    totalKm: 4187,
    totalTimeMin: 15000,
    imageUrl: 'https://storage.example.com/bikes/rallon.webp',
  };

  const serviceReport = (): ServiceReportSnapshot => ({
    version: 2,
    kind: 'SERVICE',
    generatedAt: GENERATED_AT,
    language: 'cs',
    currency: 'CZK',
    bike: reportBike,
    service: {
      serviceDate: '2026-07-01T00:00:00.000Z',
      note: 'Secret note',
      totalCost: 1250,
      odometerKm: 4000,
      odometerTimeMin: 14000,
      actions: [
        { name: 'Výměna řetězu', note: null, cost: 850, replacement: true, components: [] },
        { name: 'Odvzdušnění', note: null, cost: 400, replacement: false, components: [] },
      ],
      attachments: [],
    },
  });

  const periodReport = (): PeriodReportSnapshot => ({
    version: 2,
    kind: 'PERIOD',
    generatedAt: GENERATED_AT,
    language: 'cs',
    currency: 'CZK',
    bike: reportBike,
    period: { from: '2026-01-01', to: '2026-06-30' },
    services: [],
    totals: { totalCost: 18340, serviceCount: 12, replacementCount: 4 },
    components: null,
  });

  const bikeCheck = (): ReportSnapshot => ({
    version: 2,
    kind: 'BIKECHECK',
    generatedAt: GENERATED_AT,
    language: 'en',
    currency: 'CZK',
    bike: reportBike,
    components: [
      {
        type: 'Fork',
        category: 'Suspension',
        description: 'Fox 38',
        position: null,
        totalKm: null,
        totalTimeMin: null,
        healthIndex: null,
        mountedAt: null,
        lastServiceAt: null,
      },
    ],
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.PUBLIC_APP_URL = ORIGIN;
    process.env.SPA_INDEX_HTML = INDEX_PATH;
    readFileMock.mockResolvedValue(SHELL);
    accessMock.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreviewService,
        { provide: ProfileService, useValue: mockProfile },
        { provide: ReportService, useValue: mockReport },
        { provide: StorageService, useValue: mockStorage },
        { provide: getLoggerToken(PreviewService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PreviewService>(PreviewService);
  });

  describe('garage shell', () => {
    it('renders the owner, the stats line, the canonical URL and a versioned image into the shell', async () => {
      mockProfile.read.mockResolvedValue(garageResponse());

      const html = await service.garageShell(HANDLE);

      expect(html).toContain('<title>Jarda Novák</title>');
      expect(html).toContain('<meta property="og:title" content="Jarda Novák" />');
      expect(html).toContain('<meta property="og:type" content="profile" />');
      expect(html).toContain('<meta property="og:url" content="https://app.bikecheck.cloud/u/jarda-novak" />');
      expect(html).toContain(
        '<meta property="og:description" content="2 bikes · 4,187 km · 32 components · 26 services" />',
      );
      expect(html).toContain('<meta name="description" content="2 bikes · 4,187 km · 32 components · 26 services" />');
      expect(html).toContain(
        `<meta property="og:image" content="https://app.bikecheck.cloud/api/preview/u/jarda-novak/image.jpg?v=${UPDATED_AT_MS}" />`,
      );
      expect(html).toContain('<meta property="og:image:width" content="1200" />');
      expect(html).toContain('<meta property="og:image:height" content="630" />');
      expect(html).toContain('<meta property="og:image:type" content="image/jpeg" />');
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(html).toContain('<meta name="robots" content="noindex" />');
      expect(html).toContain('<meta property="og:locale" content="en_US" />');
      expect(mockProfile.read).toHaveBeenCalledWith(HANDLE, null);
    });

    // The SPA still boots from this document: the shell's assets stay, its placeholder
    // title goes, and the block sits inside <head> after the charset.
    it('keeps the shell around the block and drops its placeholder title', async () => {
      mockProfile.read.mockResolvedValue(garageResponse());

      const html = await service.garageShell(HANDLE);

      expect(html).toContain('<script type="module" crossorigin src="/assets/index-abc.js"></script>');
      expect(html).toContain('<div id="root"></div>');
      expect(html).not.toContain('<title>bikecheck</title>');
      expect(html.match(/<title>/g)).toHaveLength(1);
      expect(html.indexOf('<meta charset="UTF-8" />')).toBeLessThan(html.indexOf('og:title'));
      expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'));
    });

    // Having a profile that is switched off must not itself be public: the three closed
    // cases answer with the very same bytes, and none of them says which one it is.
    it('renders one neutral document for OFF, FOLLOWERS and a handle nobody holds', async () => {
      mockProfile.read.mockRejectedValueOnce(new NotFoundException());
      const off = await service.garageShell('switched-off');

      mockProfile.read.mockResolvedValueOnce(garageResponse({ visibility: 'FOLLOWERS', garage: null }));
      const followers = await service.garageShell('followers-only');

      mockProfile.read.mockRejectedValueOnce(new NotFoundException());
      const unknown = await service.garageShell('nobody');

      expect(off).toBe(followers);
      expect(off).toBe(unknown);
      expect(off).toContain('<title>BikeCheck</title>');
      expect(off).toContain('<meta property="og:title" content="BikeCheck" />');
      expect(off).toContain('<meta property="og:url" content="https://app.bikecheck.cloud" />');
      expect(off).toContain('<meta property="og:image" content="https://app.bikecheck.cloud/api/preview/image.jpg" />');
      expect(off).toContain('<meta name="robots" content="noindex" />');
      expect(off).not.toContain('switched-off');
      expect(off).not.toContain('followers-only');
      expect(off).not.toContain('Jarda');
    });

    // The web garage read is the one that counts a view; a crawler is not a reader.
    it('never reads through the path that counts a view', async () => {
      mockProfile.read.mockResolvedValue(garageResponse());

      await service.garageShell(HANDLE);

      expect(mockProfile.readPublic).not.toHaveBeenCalled();
    });

    // The owner's name lands in attributes and in <title>: text, never markup.
    it('escapes the owner name in every tag it reaches', async () => {
      mockProfile.read.mockResolvedValue(
        garageResponse({ owner: { handle: HANDLE, name: 'Tom "Ace" <b>&co</b>', avatar_url: null } }),
      );

      const html = await service.garageShell(HANDLE);

      expect(html).toContain('<title>Tom &quot;Ace&quot; &lt;b&gt;&amp;co&lt;/b&gt;</title>');
      expect(html).toContain('<meta property="og:title" content="Tom &quot;Ace&quot; &lt;b&gt;&amp;co&lt;/b&gt;" />');
      expect(html).not.toContain('<b>&co</b>');
    });

    it('names an owner without a name by their handle', async () => {
      mockProfile.read.mockResolvedValue(garageResponse({ owner: { handle: HANDLE, name: '  ', avatar_url: null } }));

      const html = await service.garageShell(HANDLE);

      expect(html).toContain('<meta property="og:title" content="@jarda-novak" />');
    });

    it('describes only what the owner shares: no components or services count while those are off', async () => {
      const response = garageResponse();
      response.garage!.shares = { components: false, setup: true, history: false, costs: false };
      response.garage!.totals = { bikes: 1, distance_km: 812, components: null, services: null };
      mockProfile.read.mockResolvedValue(response);

      const html = await service.garageShell(HANDLE);

      expect(html).toContain('<meta property="og:description" content="1 bike · 812 km" />');
    });

    it('keeps the services count while only components are off', async () => {
      const response = garageResponse();
      response.garage!.totals = { bikes: 2, distance_km: 4187, components: null, services: 1 };
      mockProfile.read.mockResolvedValue(response);

      const html = await service.garageShell(HANDLE);

      expect(html).toContain('<meta property="og:description" content="2 bikes · 4,187 km · 1 service" />');
    });
  });

  describe('bike shell', () => {
    it('names the bike as the card does and counts the parts of the build and the Services on record', async () => {
      mockProfile.readPublicBike.mockResolvedValue(bikeResponse());

      const html = await service.bikeShell(HANDLE, BIKE_ID);

      expect(html).toContain('<title>Orbea Rallon M10</title>');
      expect(html).toContain('<meta property="og:title" content="Orbea Rallon M10" />');
      expect(html).toContain('<meta property="og:type" content="website" />');
      expect(html).toContain('<meta property="og:url" content="https://app.bikecheck.cloud/u/jarda-novak/15" />');
      expect(html).toContain('<meta property="og:description" content="4,187 km · 3 components · 26 services" />');
      expect(html).toContain(
        `<meta property="og:image" content="https://app.bikecheck.cloud/api/preview/u/jarda-novak/15/image.jpg?v=${BIKE_UPDATED_AT_MS}" />`,
      );
      expect(html).toContain('<meta property="og:image:alt" content="Orbea Rallon M10 · Enduro" />');
      expect(mockProfile.readPublicBike).toHaveBeenCalledWith(HANDLE, BIKE_ID);
      expect(mockProfile.readPublic).not.toHaveBeenCalled();
    });

    it('leaves out the counts of sections the owner keeps in', async () => {
      mockProfile.readPublicBike.mockResolvedValue(bikeResponse({ components: null, history: null }));

      const html = await service.bikeShell(HANDLE, BIKE_ID);

      expect(html).toContain('<meta property="og:description" content="4,187 km" />');
    });

    it('answers the neutral document for a bike nobody may read, and for an id that is not one', async () => {
      mockProfile.readPublicBike.mockRejectedValue(new NotFoundException());
      const closed = await service.bikeShell(HANDLE, BIKE_ID);
      const garbage = await service.bikeShell(HANDLE, Number('abc'));
      mockProfile.read.mockRejectedValue(new NotFoundException());
      const closedGarage = await service.garageShell(HANDLE);

      expect(closed).toBe(closedGarage);
      expect(garbage).toBe(closedGarage);
      expect(mockProfile.readPublicBike).toHaveBeenCalledTimes(1);
    });

    it('escapes the brand and model', async () => {
      mockProfile.readPublicBike.mockResolvedValue(bikeResponse({ brand: 'A&B', model: '<Pro> "X"' }));

      const html = await service.bikeShell(HANDLE, BIKE_ID);

      expect(html).toContain('<meta property="og:title" content="A&amp;B &lt;Pro&gt; &quot;X&quot;" />');
    });
  });

  describe('report shell', () => {
    it('titles a Service Report by its kind and bike, dated, without reading it as a view', async () => {
      mockReport.getPublicSnapshot.mockResolvedValue(serviceReport());

      const html = await service.reportShell(TOKEN);

      expect(html).toContain('<title>Service Report · Orbea Rallon M10 2024</title>');
      expect(html).toContain('<meta property="og:title" content="Service Report · Orbea Rallon M10 2024" />');
      expect(html).toContain('<meta property="og:description" content="Service on 2026-07-01 · 2 actions" />');
      expect(html).toContain('<meta property="og:type" content="website" />');
      expect(html).toContain(`<meta property="og:url" content="https://app.bikecheck.cloud/r/${TOKEN}" />`);
      expect(html).toContain(
        `<meta property="og:image" content="https://app.bikecheck.cloud/api/preview/r/${TOKEN}/image.jpg?v=${GENERATED_AT_MS}" />`,
      );
      expect(html).not.toContain('Secret note');
      expect(html).not.toContain('1,250');
      expect(html).not.toContain('850');
      expect(mockReport.getPublicSnapshot).toHaveBeenCalledWith(TOKEN, false);
    });

    it('describes a Period Report by its span and its History Totals', async () => {
      mockReport.getPublicSnapshot.mockResolvedValue(periodReport());

      const html = await service.reportShell(TOKEN);

      expect(html).toContain('<meta property="og:title" content="Period Report · Orbea Rallon M10 2024" />');
      expect(html).toContain(
        '<meta property="og:description" content="2026-01-01 – 2026-06-30 · 12 services · 4 replacements" />',
      );
      expect(html).not.toContain('18,340');
    });

    it('describes a BikeCheck by the mileage and the build', async () => {
      mockReport.getPublicSnapshot.mockResolvedValue(bikeCheck());

      const html = await service.reportShell(TOKEN);

      expect(html).toContain('<meta property="og:title" content="BikeCheck · Orbea Rallon M10 2024" />');
      expect(html).toContain('<meta property="og:description" content="4,187 km · 1 component" />');
    });

    it('answers the neutral document for a closed, revoked or unknown token', async () => {
      mockReport.getPublicSnapshot.mockRejectedValue(new GoneException('This report is no longer available'));
      const closed = await service.reportShell(TOKEN);
      mockProfile.read.mockRejectedValue(new NotFoundException());
      const closedGarage = await service.garageShell(HANDLE);

      expect(closed).toBe(closedGarage);
      expect(closed).not.toContain(TOKEN);
    });
  });

  describe('images', () => {
    const PHOTO_URL = 'https://storage.example.com/bikes/firebird.webp';
    const PHOTO_KEY = 'bikes/firebird.webp';
    const LOGO_KEY = 'static/logo-mail.png';

    // A stored bike photo: 2:1, white, WebP - what the garage upload leaves in R2.
    const stored = async (): Promise<{ body: Readable; contentLength: number }> => {
      const webp = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#ffffff' } })
        .webp()
        .toBuffer();
      return { body: Readable.from([webp]), contentLength: webp.length };
    };

    const size = async (jpeg: Buffer): Promise<{ format?: string; width?: number; height?: number }> => {
      const { format, width, height } = await sharp(jpeg).metadata();
      return { format, width, height };
    };

    const centre = async (jpeg: Buffer): Promise<number> => {
      const raw = await sharp(jpeg).extract({ left: 600, top: 315, width: 1, height: 1 }).raw().toBuffer();
      return raw[0];
    };

    beforeEach(() => {
      mockStorage.storageKeyFromUrl.mockImplementation((url: string) =>
        url.replace('https://storage.example.com/', ''),
      );
      mockStorage.downloadFileR2CloudFare.mockImplementation(async (key: string) => {
        if (key === PHOTO_KEY) return await stored();
        throw new NotFoundException('Attachment not found in storage');
      });
    });

    it('draws the garage card from the first Shared Bike that has a photo, letterboxed to 1200x630', async () => {
      mockProfile.read.mockResolvedValue(garageResponse());

      const jpeg = await service.garageImage(HANDLE);

      expect(await size(jpeg)).toEqual({ format: 'jpeg', width: 1200, height: 630 });
      expect(await centre(jpeg)).toBeGreaterThan(240);
      expect(mockStorage.storageKeyFromUrl).toHaveBeenCalledWith(PHOTO_URL);
      expect(mockStorage.downloadFileR2CloudFare).toHaveBeenCalledWith(PHOTO_KEY);
      expect(mockProfile.readPublic).not.toHaveBeenCalled();
    });

    it('draws the neutral card for a closed garage and for one without a single photo', async () => {
      mockProfile.read.mockRejectedValueOnce(new NotFoundException());
      const closed = await service.garageImage('switched-off');

      const bare = garageResponse();
      bare.garage!.bikes = bare.garage!.bikes.map((bike) => ({ ...bike, image_url: null }));
      mockProfile.read.mockResolvedValueOnce(bare);
      const noPhoto = await service.garageImage(HANDLE);

      expect(await size(closed)).toEqual({ format: 'jpeg', width: 1200, height: 630 });
      expect(await centre(closed)).toBeLessThan(20);
      expect(noPhoto.equals(closed)).toBe(true);
      expect(mockStorage.downloadFileR2CloudFare).not.toHaveBeenCalledWith(PHOTO_KEY);
    });

    it('draws the bike card from that bike alone, and the neutral one when it has no photo', async () => {
      mockProfile.read.mockResolvedValue(garageResponse());

      const withPhoto = await service.bikeImage(HANDLE, 16);
      const withoutPhoto = await service.bikeImage(HANDLE, 15);
      const unknown = await service.bikeImage(HANDLE, 99);

      expect(await centre(withPhoto)).toBeGreaterThan(240);
      expect(await centre(withoutPhoto)).toBeLessThan(20);
      expect(unknown.equals(withoutPhoto)).toBe(true);
      expect(mockStorage.downloadFileR2CloudFare).toHaveBeenCalledWith(PHOTO_KEY);
    });

    it('draws the report card from the frozen bike photo, and the neutral one once the link is closed', async () => {
      mockReport.getPublicSnapshot.mockResolvedValueOnce({
        ...serviceReport(),
        bike: { ...reportBike, imageUrl: PHOTO_URL },
      });
      const open = await service.reportImage(TOKEN);

      mockReport.getPublicSnapshot.mockRejectedValueOnce(new GoneException());
      const closed = await service.reportImage(TOKEN);

      expect(await centre(open)).toBeGreaterThan(240);
      expect(await centre(closed)).toBeLessThan(20);
      expect(mockReport.getPublicSnapshot).toHaveBeenCalledWith(TOKEN, false);
    });

    // The mark lives in R2 next to the mail logo; without it the card is the background alone.
    it('puts the logo on the neutral card when storage has it', async () => {
      const logo = await sharp({ create: { width: 640, height: 130, channels: 4, background: '#e0e0e0ff' } })
        .png()
        .toBuffer();
      mockStorage.downloadFileR2CloudFare.mockImplementation((key: string) =>
        key === LOGO_KEY
          ? Promise.resolve({ body: Readable.from([logo]), contentLength: logo.length })
          : Promise.reject(new NotFoundException()),
      );

      const jpeg = await service.neutralImage();

      expect(await centre(jpeg)).toBeGreaterThan(200);
      expect(mockStorage.downloadFileR2CloudFare).toHaveBeenCalledWith(LOGO_KEY);
    });
  });

  describe('the shell on disk', () => {
    it('reads index.html once however many pages are rendered', async () => {
      mockProfile.read.mockResolvedValue(garageResponse());

      await Promise.all([service.garageShell(HANDLE), service.garageShell(HANDLE), service.garageShell(HANDLE)]);
      await service.garageShell(HANDLE);

      expect(readFileMock).toHaveBeenCalledTimes(1);
      expect(readFileMock).toHaveBeenCalledWith(INDEX_PATH, 'utf8');
    });

    it('refuses with a clear error when SPA_INDEX_HTML is unset, rather than answering an empty page', async () => {
      delete process.env.SPA_INDEX_HTML;
      mockProfile.read.mockResolvedValue(garageResponse());

      await expect(service.garageShell(HANDLE)).rejects.toThrow(InternalServerErrorException);
      await expect(service.garageShell(HANDLE)).rejects.toThrow(/SPA_INDEX_HTML is not set/);
    });

    it('names the path when the file cannot be read, and tries again on the next request', async () => {
      readFileMock.mockRejectedValueOnce(new Error('ENOENT: no such file'));
      mockProfile.read.mockResolvedValue(garageResponse());

      await expect(service.garageShell(HANDLE)).rejects.toThrow(/\/srv\/dist\/index\.html.*ENOENT/);
      await expect(service.garageShell(HANDLE)).resolves.toContain('og:title');
      expect(readFileMock).toHaveBeenCalledTimes(2);
    });

    it('warns once at boot when SPA_INDEX_HTML is missing instead of refusing to start', async () => {
      delete process.env.SPA_INDEX_HTML;

      await expect(service.onModuleInit()).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('SPA_INDEX_HTML'));
    });
  });
});
