import { chromium } from 'playwright';
import { PRINT_KEY_HEADER, ReportPdfService } from './report-pdf.service';

// The browser is the boundary: what matters here is what the printer hands it and when.
jest.mock('playwright', () => ({
  chromium: { launch: jest.fn() },
  errors: { TimeoutError: class TimeoutError extends Error {} },
}));

const TOKEN = 'token-closed';
const OTHER_TOKEN = 'token-other';
const PRINT_URL = `https://app.bikecheck.cloud/r/${TOKEN}?print=1`;
const API_READ = new URL(`https://app.bikecheck.cloud/api/reports/public/${TOKEN}?print=1`);
const START = new Date('2026-07-01T12:00:00.000Z');
const SIXTY_ONE_SECONDS_MS = 61_000;

type Forward = (options: { headers: Record<string, string> }) => Promise<void>;
type Handler = (route: {
  request: () => { headers: () => Record<string, string> };
  continue: Forward;
}) => Promise<void>;
type Matcher = (address: URL) => boolean;

describe('ReportPdfService', () => {
  let service: ReportPdfService;
  let matcher: Matcher;
  let handler: Handler;
  // What the test does while chromium is on the page.
  let whilePrinting: () => Promise<void>;

  // What the browser would be sent on the one read the key is meant for.
  const presentedKey = async (): Promise<string> => {
    let key = '';
    await handler({
      request: () => ({ headers: () => ({ accept: 'application/json' }) }),
      continue: ({ headers }): Promise<void> => {
        key = headers[PRINT_KEY_HEADER];
        return Promise.resolve();
      },
    });
    return key;
  };

  beforeEach((): void => {
    jest.useFakeTimers({ now: START, doNotFake: ['nextTick', 'setImmediate'] });
    service = new ReportPdfService();
    whilePrinting = (): Promise<void> => Promise.resolve();

    const page = {
      emulateMedia: jest.fn(),
      route: jest.fn((match: Matcher, handle: Handler) => {
        matcher = match;
        handler = handle;
        return Promise.resolve();
      }),
      goto: jest.fn(() => whilePrinting()),
      waitForSelector: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.7 printed')),
    };
    (chromium.launch as jest.Mock).mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn(),
    });
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  describe('printWithKey', () => {
    it('admits its key for that report while the print runs', async () => {
      let admitted = false;
      whilePrinting = async (): Promise<void> => {
        admitted = service.admits(TOKEN, await presentedKey());
      };

      await service.printWithKey(PRINT_URL, TOKEN);

      expect(admitted).toBe(true);
    });

    it('refuses the key for any other report', async () => {
      let admitted = true;
      whilePrinting = async (): Promise<void> => {
        admitted = service.admits(OTHER_TOKEN, await presentedKey());
      };

      await service.printWithKey(PRINT_URL, TOKEN);

      expect(admitted).toBe(false);
    });

    it('refuses the key once it has expired, even with the print still running', async () => {
      let admitted = true;
      whilePrinting = async (): Promise<void> => {
        const key = await presentedKey();
        jest.setSystemTime(START.getTime() + SIXTY_ONE_SECONDS_MS);
        admitted = service.admits(TOKEN, key);
      };

      await service.printWithKey(PRINT_URL, TOKEN);

      expect(admitted).toBe(false);
    });

    it('refuses the key as soon as the print is done', async () => {
      let key = '';
      whilePrinting = async (): Promise<void> => {
        key = await presentedKey();
      };

      await service.printWithKey(PRINT_URL, TOKEN);

      expect(service.admits(TOKEN, key)).toBe(false);
    });

    it('refuses the key after a print that failed', async () => {
      let key = '';
      whilePrinting = async (): Promise<void> => {
        key = await presentedKey();
        throw new Error('chromium crashed');
      };

      await expect(service.printWithKey(PRINT_URL, TOKEN)).rejects.toThrow('chromium crashed');

      expect(service.admits(TOKEN, key)).toBe(false);
    });

    it('mints a new key for every print', async () => {
      const keys: string[] = [];
      whilePrinting = async (): Promise<void> => {
        keys.push(await presentedKey());
      };

      await service.printWithKey(PRINT_URL, TOKEN);
      await service.printWithKey(PRINT_URL, TOKEN);

      expect(keys[0]).not.toBe(keys[1]);
    });

    it('never puts the key in the address it opens', async () => {
      let key = '';
      whilePrinting = async (): Promise<void> => {
        key = await presentedKey();
      };

      await service.printWithKey(PRINT_URL, TOKEN);

      const launched = (await (chromium.launch as jest.Mock).mock.results[0].value) as {
        newPage: () => Promise<{ goto: jest.Mock }>;
      };
      const page = await launched.newPage();
      expect(page.goto.mock.calls[0][0]).toBe(PRINT_URL);
      expect(key.length).toBeGreaterThanOrEqual(64);
    });

    // A header set for the whole page would go to the CDN holding the bike photo too.
    it('presents the key only on the read of this report', async () => {
      await service.printWithKey(PRINT_URL, TOKEN);

      expect(matcher(API_READ)).toBe(true);
      expect(matcher(new URL(PRINT_URL))).toBe(false);
      expect(matcher(new URL('https://cdn.example.com/bikes/firebird.webp'))).toBe(false);
      expect(matcher(new URL(`https://app.bikecheck.cloud/api/reports/public/${TOKEN}/pdf`))).toBe(false);
      expect(matcher(new URL(`https://app.bikecheck.cloud/api/reports/public/${OTHER_TOKEN}?print=1`))).toBe(false);
    });
  });

  describe('admits', () => {
    it('refuses a key nobody minted', () => {
      expect(service.admits(TOKEN, 'made-up')).toBe(false);
    });
  });
});
