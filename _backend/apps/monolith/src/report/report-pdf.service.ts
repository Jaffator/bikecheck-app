// Prints a Report by opening the public page itself in headless chromium. The document is
// designed once, in React, and printed - this server never builds HTML of its own
// (ADR 0012). Chromium is already a production dependency, so this costs a service rather
// than an architecture.
import { GatewayTimeoutException, Injectable } from '@nestjs/common';
import { chromium, errors as playwrightErrors } from 'playwright';

// The page raises this once it has finished drawing. Capturing before it appears yields a
// half-drawn document.
const SETTLED_MARKER = '[data-report-settled="true"]';

// Our own page on our own network. Long enough for a cold render, short enough that a
// wedged browser answers the caller rather than holding the request open.
const PAGE_TIMEOUT_MS = 20_000;

// The paper's own margins rather than the document's own padding: padding is laid out once
// per box, so a report running past one page would otherwise print page two edge to edge.
const A4_MARGIN = { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' };

@Injectable()
export class ReportPdfService {
  /**
   * Prints one page to A4, background graphics and all.
   * @param url The page to open - the print variant of a report's public address
   * @returns The PDF bytes
   */
  async print(url: string): Promise<Buffer> {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
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
