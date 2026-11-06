import { existsSync } from 'fs';
import { createServer, IncomingHttpHeaders, Server } from 'http';
import { AddressInfo } from 'net';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { chromium } from 'playwright';
import setCookie from 'set-cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { PRINT_KEY_HEADER, ReportPdfService } from './report-pdf.service';

const browserInstalled = ((): boolean => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

const itWithBrowser = browserInstalled ? it : it.skip;

const CHROMIUM_TIMEOUT_MS = 60_000;
const GONE = 410;
const WRONG_KEY = 'a'.repeat(64);
const EXPIRED_TICKET_MS = 61_000;

interface OpenedPage {
  url: string;
  headers: IncomingHttpHeaders;
}

// The deployed web app in miniature: it asks the API for the document the way PublicReport does,
// and raises the settled marker only once answered. The photo stands for a third party on the page.
function printPage(apiOrigin: string, token: string): string {
  return `<!doctype html><html><body><img src="/photo.png" alt=""><div id="document"></div>
<script>
  fetch('${apiOrigin}/api/reports/public/${token}?print=1', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }).then(function (response) {
    if (!response.ok) return;
    return response.json().then(function (snapshot) {
      document.getElementById('document').textContent = snapshot.kind;
      var marker = document.createElement('span');
      marker.setAttribute('data-report-settled', 'true');
      document.body.appendChild(marker);
    });
  });
</script></body></html>`;
}

// A Report is closed until published, and only the print itself may step past that.
describe('ReportController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let web: Server;
  let bikeId: number;
  let ownerToken: string | undefined;
  let strangerToken: string | undefined;
  let originalOrigin: string | undefined;
  let token = '';
  // Everything chromium asked the web app for.
  let opened: OpenedPage[] = [];

  const stamp = Date.now();
  const owner = { name: `report-owner-${stamp}`, email: `report-owner-${stamp}@bikecheck.test`, password: 'abcd1234' };
  const stranger = {
    name: `report-stranger-${stamp}`,
    email: `report-stranger-${stamp}@bikecheck.test`,
    password: 'abcd1234',
  };

  const registerAndLogin = async (credentials: typeof owner): Promise<string | undefined> => {
    await request(app.getHttpServer()).post('/api/auth/register').send(credentials).expect(201);
    await prisma.users.update({ where: { email: credentials.email }, data: { email_verified_at: new Date() } });
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    return setCookie.parse(response.header['set-cookie']).find((cookie) => cookie.name === 'access_token')?.value;
  };

  const exportReport = async (): Promise<{ id: number; public_token: string }> => {
    const response = await request(app.getHttpServer())
      .post('/api/reports/export')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ kind: 'BIKE', bike_id: bikeId, include_components: false, include_history: false })
      .expect(201);

    return response.body as { id: number; public_token: string };
  };

  const readAsStranger = (path: string): request.Test =>
    request(app.getHttpServer()).get(`/api/reports/public/${path}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.enableCors({ origin: true, credentials: true });
    await app.listen(0, '127.0.0.1');

    const apiPort = (app.getHttpServer().address() as AddressInfo).port;

    web = createServer((incoming, response) => {
      opened.push({ url: incoming.url ?? '', headers: incoming.headers });
      if (incoming.url === '/photo.png') {
        response.writeHead(204).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(printPage(`http://127.0.0.1:${apiPort}`, token));
    });
    await new Promise<void>((resolve) => web.listen(0, '127.0.0.1', resolve));

    originalOrigin = process.env.PUBLIC_APP_URL;
    process.env.PUBLIC_APP_URL = `http://127.0.0.1:${(web.address() as AddressInfo).port}`;

    ownerToken = await registerAndLogin(owner);
    strangerToken = await registerAndLogin(stranger);

    const bikeResponse = await request(app.getHttpServer())
      .post('/api/bike/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field(
        'data',
        JSON.stringify({
          bike: {
            bike_brand: 'Santa Cruz',
            bike_model: 'Hightower',
            year: 2022,
            ebike: false,
            has_front_suspension: true,
            has_rear_suspension: true,
            bike_type: 'Enduro',
          },
          components: [],
        }),
      )
      .expect(201);
    bikeId = bikeResponse.body.id;
  }, CHROMIUM_TIMEOUT_MS);

  beforeEach(() => {
    opened = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    process.env.PUBLIC_APP_URL = originalOrigin;
    await new Promise<void>((resolve) => web.close(() => resolve()));
    await app.close();
  });

  describe('GET /reports/:id/pdf', () => {
    it('asks for a session', async () => {
      const report = await exportReport();

      await request(app.getHttpServer()).get(`/api/reports/${report.id}/pdf`).expect(401);
    });

    it("does not print another user's report", async () => {
      const report = await exportReport();

      await request(app.getHttpServer())
        .get(`/api/reports/${report.id}/pdf`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);

      expect(opened).toEqual([]);
    });

    itWithBrowser(
      'hands the owner a PDF and leaves the link closed',
      async () => {
        const report = await exportReport();
        token = report.public_token;

        const response = await request(app.getHttpServer())
          .get(`/api/reports/${report.id}/pdf`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .responseType('blob')
          .expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('bike-report-');
        expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

        await readAsStranger(token).expect(GONE);
        await readAsStranger(`${token}/pdf`).expect(GONE);

        const mine = await request(app.getHttpServer())
          .get(`/api/reports/mine?bikeId=${bikeId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        const listed = (mine.body as { id: number }[]).find((entry) => entry.id === report.id);
        expect(listed).toMatchObject({ is_public: false, view_count: 0 });
      },
      CHROMIUM_TIMEOUT_MS,
    );

    itWithBrowser(
      'keeps the link closed to a reader while the print runs',
      async () => {
        const report = await exportReport();
        token = report.public_token;
        const printer = app.get(ReportPdfService);
        const admits = printer.admits.bind(printer);
        let readDuringPrint: Promise<number> | undefined;
        jest.spyOn(printer, 'admits').mockImplementation((reportToken, key) => {
          readDuringPrint ??= readAsStranger(token).then((reader) => reader.status);
          return admits(reportToken, key);
        });

        await request(app.getHttpServer())
          .get(`/api/reports/${report.id}/pdf`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .responseType('blob')
          .expect(200);

        await expect(readDuringPrint).resolves.toBe(GONE);
      },
      CHROMIUM_TIMEOUT_MS,
    );

    itWithBrowser(
      'keeps the key between chromium and the API, and retires it with the print',
      async () => {
        const report = await exportReport();
        token = report.public_token;
        const admits = jest.spyOn(app.get(ReportPdfService), 'admits');

        const response = await request(app.getHttpServer())
          .get(`/api/reports/${report.id}/pdf`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .responseType('blob')
          .expect(200);

        const key = admits.mock.calls[0][1];
        expect(key).toMatch(/^[0-9a-f]{64}$/);

        // Not to the owner's browser.
        expect(JSON.stringify(response.headers)).not.toContain(key);
        expect((response.body as Buffer).toString('latin1')).not.toContain(key);

        // Not to the web app or anything else on the page, in the address or the headers.
        expect(opened.map((page) => page.url)).toContain('/photo.png');
        expect(JSON.stringify(opened)).not.toContain(key);

        await readAsStranger(token).set(PRINT_KEY_HEADER, key).expect(GONE);
      },
      CHROMIUM_TIMEOUT_MS,
    );
  });

  // The phone's system browser has no session, so a ticket from the owner is all it carries.
  describe('POST /reports/:id/pdf-ticket', () => {
    const mintTicket = async (reportId: number): Promise<string> => {
      const response = await request(app.getHttpServer())
        .post(`/api/reports/${reportId}/pdf-ticket`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      return (response.body as { ticket: string }).ticket;
    };

    const follow = (ticket: string): request.Test =>
      request(app.getHttpServer()).get(`/api/reports/pdf-ticket/${ticket}`).responseType('blob');

    it('asks for a session', async () => {
      const report = await exportReport();

      await request(app.getHttpServer()).post(`/api/reports/${report.id}/pdf-ticket`).expect(401);
    });

    it("mints nothing for another user's report", async () => {
      const report = await exportReport();
      const hold = jest.spyOn(app.get(ReportPdfService), 'hold');

      await request(app.getHttpServer())
        .post(`/api/reports/${report.id}/pdf-ticket`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);

      expect(hold).not.toHaveBeenCalled();
      expect(opened).toEqual([]);
    });

    it('refuses a wrong ticket as a closed link does', async () => {
      await follow(WRONG_KEY).expect(GONE);
    });

    it('answers no address without a ticket', async () => {
      const response = await request(app.getHttpServer()).get('/api/reports/pdf-ticket/');

      expect(response.status).not.toBe(200);
    });

    it('refuses an expired ticket', async () => {
      const printer = app.get(ReportPdfService);
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setInterval', 'hrtime', 'performance'] });
      const ticket = printer.hold({ body: Buffer.from('%PDF-1.7'), filename: 'bike-report.pdf' });
      jest.advanceTimersByTime(EXPIRED_TICKET_MS);
      jest.useRealTimers();

      await follow(ticket).expect(GONE);
    });

    it('keeps a print key and a ticket apart', async () => {
      const report = await exportReport();
      const ticket = app.get(ReportPdfService).hold({ body: Buffer.from('%PDF-1.7'), filename: 'bike-report.pdf' });

      await readAsStranger(report.public_token).set(PRINT_KEY_HEADER, ticket).expect(GONE);
    });

    itWithBrowser(
      'serves the closed report once, to whoever holds the ticket, and keeps it out of any cache',
      async () => {
        const report = await exportReport();
        token = report.public_token;

        const ticket = await mintTicket(report.id);
        const response = await follow(ticket).expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('inline; filename="bike-report-');
        expect(response.headers['cache-control']).toBe('no-store');
        expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

        await follow(ticket).expect(GONE);
      },
      CHROMIUM_TIMEOUT_MS,
    );

    itWithBrowser(
      'leaves the share link closed and tells chromium nothing of the ticket',
      async () => {
        const report = await exportReport();
        token = report.public_token;

        const ticket = await mintTicket(report.id);
        await follow(ticket).expect(200);

        expect(JSON.stringify(opened)).not.toContain(ticket);
        await readAsStranger(token).expect(GONE);
        await readAsStranger(`${token}/pdf`).expect(GONE);

        const mine = await request(app.getHttpServer())
          .get(`/api/reports/mine?bikeId=${bikeId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        const listed = (mine.body as { id: number }[]).find((entry) => entry.id === report.id);
        expect(listed).toMatchObject({ is_public: false, view_count: 0 });
      },
      CHROMIUM_TIMEOUT_MS,
    );
  });

  describe('GET /reports/public/:token', () => {
    beforeEach(async () => {
      token = (await exportReport()).public_token;
    });

    it('refuses a closed report without a key', async () => {
      await readAsStranger(token).expect(GONE);
      await readAsStranger(`${token}?print=1`).expect(GONE);
    });

    it('refuses a closed report with a wrong key', async () => {
      await readAsStranger(token).set(PRINT_KEY_HEADER, WRONG_KEY).expect(GONE);
      await readAsStranger(`${token}?print=1`).set(PRINT_KEY_HEADER, WRONG_KEY).expect(GONE);
    });

    it('takes no key on the PDF and attachment routes', async () => {
      await readAsStranger(`${token}/pdf`).set(PRINT_KEY_HEADER, WRONG_KEY).expect(GONE);
      await readAsStranger(`${token}/attachment/1`).set(PRINT_KEY_HEADER, WRONG_KEY).expect(GONE);
    });
  });
});
