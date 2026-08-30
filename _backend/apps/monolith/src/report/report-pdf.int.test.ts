import { existsSync } from 'fs';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { Test, TestingModule } from '@nestjs/testing';
import { Browser, chromium } from 'playwright';
import { report_kind } from '@prisma/client';
import { ReportPdfService } from './report-pdf.service';
import { ReportService } from './report.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StoredReportSnapshot } from './report.types';

// A real chromium launch, like the scraper's integration test. Skipped when the browser is
// not installed, so neither the unit gate nor this suite depends on one being there.
const browserInstalled = ((): boolean => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

const describeWithBrowser = browserInstalled ? describe : describe.skip;

const TOKEN = 'token-int-1';
const SERVICE_DATE = new Date('2026-07-01T00:00:00.000Z');

// The print variant's side of the contract: two sheets of content and the settled marker,
// neither of which exists until the page says it has finished drawing. Printing before the
// marker would capture an empty document, which is what makes the wait worth testing.
const PRINT_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><style>body{margin:0}.sheet{width:210mm;height:297mm;background:#eee}</style></head>
<body><div id="document"></div>
<script>
  setTimeout(function () {
    document.getElementById('document').innerHTML =
      '<div class="sheet">Service Report</div><div class="sheet">Attachments</div>';
    var marker = document.createElement('span');
    marker.setAttribute('data-report-settled', 'true');
    document.body.appendChild(marker);
  }, 800);
</script></body></html>`;

describeWithBrowser('ReportPdfService (integration)', () => {
  let service: ReportService;
  let moduleRef: TestingModule;
  let page: Server;
  // Every address the printer opens is asked for here, so the test can assert the shape of
  // the URL the service built.
  let opened: string[] = [];

  const mockPrisma = {
    reports: { findUnique: jest.fn(), update: jest.fn() },
  };

  const publishedReport = (): Record<string, unknown> => ({
    id: 1,
    public_token: TOKEN,
    user_id: 7,
    bike_id: 15,
    kind: report_kind.SERVICE,
    snapshot: {
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
          attachments: [],
        },
      },
      private: { attachmentKeys: {} },
    } satisfies StoredReportSnapshot,
    is_public: true,
    view_count: 0,
    last_viewed_at: null,
    revoked: false,
    expires_at: null,
    created_at: SERVICE_DATE,
  });

  beforeAll(async (): Promise<void> => {
    // Stands in for the deployed web app: the printer only ever sees an address, and the
    // page behind it answers the way the print variant does.
    page = createServer((request, response) => {
      opened.push(request.url ?? '');
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(PRINT_PAGE);
    });
    await new Promise<void>((resolve) => page.listen(0, '127.0.0.1', resolve));

    // Without an origin there is no page to print, which is why the service refuses to
    // build a share link at all.
    process.env.PUBLIC_APP_URL = `http://127.0.0.1:${(page.address() as AddressInfo).port}`;

    moduleRef = await Test.createTestingModule({
      providers: [
        ReportService,
        ReportPdfService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ReportService);
  }, 60_000);

  beforeEach((): void => {
    jest.clearAllMocks();
    opened = [];
    mockPrisma.reports.findUnique.mockResolvedValue(publishedReport());
  });

  afterAll(async (): Promise<void> => {
    await new Promise<void>((resolve) => page.close(() => resolve()));
    await moduleRef.close();
  });

  it('prints the public page to a real A4 PDF', async (): Promise<void> => {
    const file = await service.publicPdf(TOKEN);

    expect(file.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(file.body.length).toBeGreaterThan(1000);
    expect(pageCount(file.body)).toBeGreaterThanOrEqual(1);
    expect(file.filename).toBe('service-report-2026-07-01.pdf');
  }, 60_000);

  it('opens the print variant at the address the report is read from', async (): Promise<void> => {
    await service.publicPdf(TOKEN);

    expect(opened[0]).toBe(`/r/${TOKEN}?print=1`);
  }, 60_000);

  // The page draws its second sheet only when it settles, so a capture that did not wait
  // would come back one page short.
  it('waits for the settled marker before capturing', async (): Promise<void> => {
    const file = await service.publicPdf(TOKEN);

    expect(pageCount(file.body)).toBe(2);
  }, 60_000);

  it('counts no view: printing the page is not a reader opening it', async (): Promise<void> => {
    await service.publicPdf(TOKEN);

    expect(mockPrisma.reports.update).not.toHaveBeenCalled();
  }, 60_000);

  // A browser left running outlives the request that opened it, so the print closes it
  // whichever way it ended.
  it('closes the browser, whether the print succeeded or threw', async (): Promise<void> => {
    const launch = jest.spyOn(chromium, 'launch');
    const origin = process.env.PUBLIC_APP_URL;

    await service.publicPdf(TOKEN);

    // Nothing is listening here, so the print throws on its way to the page.
    process.env.PUBLIC_APP_URL = 'http://127.0.0.1:1';
    await expect(service.publicPdf(TOKEN)).rejects.toThrow();
    process.env.PUBLIC_APP_URL = origin;

    const browsers = await Promise.all(launch.mock.results.map((result) => result.value as Promise<Browser>));
    expect(browsers).toHaveLength(2);
    for (const browser of browsers) {
      expect(browser.isConnected()).toBe(false);
    }

    launch.mockRestore();
  }, 60_000);
});

// How many sheets the printed file holds, read off the page objects the PDF declares.
function pageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}
