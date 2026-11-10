// Prints a Report by opening the public page itself in headless chromium. The document is
// designed once, in React, and printed - this server never builds HTML of its own
// (ADR 0012). Chromium is already a production dependency, so this costs a service rather
// than an architecture.
import { randomBytes } from 'crypto';
import { GatewayTimeoutException, Injectable } from '@nestjs/common';
import { chromium, errors as playwrightErrors, type Page } from 'playwright';
import { ReportPdfFile } from './report.types';

// The page raises this once it has finished drawing. Capturing before it appears yields a
// half-drawn document.
const SETTLED_MARKER = '[data-report-settled="true"]';

// Our own page on our own network. Long enough for a cold render, short enough that a
// wedged browser answers the caller rather than holding the request open.
const PAGE_TIMEOUT_MS = 20_000;

// The paper's own margins rather than the document's own padding: padding is laid out once
// per box, so a report running past one page would otherwise print page two edge to edge.
const A4_MARGIN = { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' };

// A header rather than the address, so no referrer or page script ever holds the key. Both
// access logs drop it: the monolith's redact and the Caddyfile filter (ADR 0012).
export const PRINT_KEY_HEADER = 'x-report-print-key';

const SECRET_BYTES = 32;

// Outlasts both page waits above; a print is over long before this, and retires its key itself.
const PRINT_KEY_TTL_MS = 60_000;

// The phone opens the address right after it gets it, so a minute is generous, and it bounds
// how long an unclaimed file stays in memory.
const PDF_TICKET_TTL_MS = 60_000;

// The one address with a secret in it. The Caddyfile filter blanks the same path (ADR 0012).
const PDF_TICKET_ADDRESS = /(\/reports\/pdf-ticket\/)[^/?]+/;

interface LoggedRequest {
  url: string;
  params: unknown;
}

// Pino writes the path twice, as the address and as route params, and redact cannot reach into
// a string. A throttled read is logged with its ticket still live.
export function hidePdfTicket(req: LoggedRequest): LoggedRequest {
  if (PDF_TICKET_ADDRESS.test(req.url)) {
    req.url = req.url.replace(PDF_TICKET_ADDRESS, '$1-');
    req.params = {};
  }

  return req;
}

interface PrintKey {
  token: string;
  expiresAt: number;
}

@Injectable()
export class ReportPdfService {
  // In memory: this process mints each key and reads it back, so it is never stored or sent out.
  private readonly printKeys = new Map<string, PrintKey>();
  // In memory for the same reason as the keys, and holding the printed file, so the address
  // opens no Report and needs no browser launch from a caller without a session.
  private readonly heldFiles = new Map<string, ReportPdfFile>();

  /**
   * Prints one page to A4, background graphics and all.
   * @param url The page to open - the print variant of a report's public address
   * @returns The PDF bytes
   */
  async print(url: string): Promise<Buffer> {
    return await this.capture(url);
  }

  // The Share Link may be closed, so chromium presents a key minted for this one print.
  async printWithKey(url: string, token: string): Promise<Buffer> {
    const key = randomBytes(SECRET_BYTES).toString('hex');
    this.printKeys.set(key, { token, expiresAt: Date.now() + PRINT_KEY_TTL_MS });

    try {
      return await this.capture(url, (page) => presentKey(page, key, token));
    } finally {
      this.printKeys.delete(key);
    }
  }

  admits(token: string, key: string): boolean {
    const printKey = this.printKeys.get(key);

    return printKey !== undefined && printKey.token === token && printKey.expiresAt > Date.now();
  }

  // Unref'd so a held file never keeps a shutting-down process alive.
  hold(file: ReportPdfFile): string {
    const ticket = randomBytes(SECRET_BYTES).toString('hex');
    this.heldFiles.set(ticket, file);
    setTimeout(() => this.heldFiles.delete(ticket), PDF_TICKET_TTL_MS).unref();

    return ticket;
  }

  claim(ticket: string): ReportPdfFile | null {
    const file = this.heldFiles.get(ticket) ?? null;
    this.heldFiles.delete(ticket);

    return file;
  }

  private async capture(url: string, prepare?: (page: Page) => Promise<void>): Promise<Buffer> {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await prepare?.(page);
      // The print variant is chosen by the URL, not by a print stylesheet, so what is
      // captured is what a reader would see at that address (ADR 0012).
      await page.emulateMedia({ media: 'screen' });
      await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
      await page.waitForSelector(SETTLED_MARKER, { state: 'attached', timeout: PAGE_TIMEOUT_MS });

      return await page.pdf({ format: 'A4', printBackground: true, margin: A4_MARGIN });
    } catch (error) {
      // A page of ours that never settles is a render that failed, not a document.
      if (error instanceof playwrightErrors.TimeoutError) {
        throw new GatewayTimeoutException('The report page did not finish rendering in time');
      }

      throw error;
    } finally {
      await browser.close();
    }
  }
}

// Only on the read of this report: a header set for the whole page would also go to the CDN
// serving the bike photo.
async function presentKey(page: Page, key: string, token: string): Promise<void> {
  await page.route(
    (address) => address.pathname.endsWith(`/reports/public/${token}`),
    async (route) => {
      await route.continue({ headers: { ...route.request().headers(), [PRINT_KEY_HEADER]: key } });
    },
  );
}
