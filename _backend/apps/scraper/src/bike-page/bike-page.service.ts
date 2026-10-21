import { BadGatewayException, BadRequestException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, Page } from 'playwright';
import { errors as playwrightErrors } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { ScrapedBikeCard } from '@contracts/bike-scraper.contract';

chromium.use(stealthPlugin());

// Only scraped site; the monolith passes client URLs on, and this browser sits on a home network.
const PROVIDER_HOST = '99spokes.com';
const CARD_SELECTOR = 'a[href*="/bikes/"], a[href*="family="]';
// The XHR that brings the cards; its statuses tell a Cloudflare 403 from a slow answer (#282).
const RESULTS_API_PATH = '/api/trpc/bikes.listBikes';
// Cards read only the image URL, so the files would just eat the home uplink.
const BLOCKED_RESOURCES = new Set(['image', 'font', 'media']);
// Cloudflare's challenge ("Just a moment...") and its block page ("Attention Required! | Cloudflare").
const CLOUDFLARE_PAGE_TITLE = /^Just a moment\.\.\.$|\| Cloudflare$/;
// At home about 1 attempt in 20 still meets a challenge, and a fresh browser passes (ADR 0042).
const MAX_SCRAPE_ATTEMPTS = 2;

type ResultsApiResponse = { status: number; atMs: number };
type BikeCardsAttempt = {
  cards: ScrapedBikeCard[];
  pageTitle: string;
  cardsTimedOut: boolean;
  resultsApiResponses: ResultsApiResponse[];
};

@Injectable()
export class BikePageService {
  constructor(
    @InjectPinoLogger(BikePageService.name)
    private readonly logger: PinoLogger,
  ) {}

  /** Search and collection pages share the same markup, so both read cards here. */
  async readBikeCards(url: string): Promise<ScrapedBikeCard[]> {
    this.assertProviderUrl(url);
    const startedAt = Date.now();

    try {
      for (let attempt = 1; ; attempt++) {
        const result = await this.scrapeBikeCards(url);
        const blocked = this.isBlockedByCloudflare(result);
        const { cards, ...diagnostics } = result;
        this.logger.info(
          { url, attempt, blocked, resultCount: cards.length, durationMs: Date.now() - startedAt, ...diagnostics },
          'Bike list fetched',
        );

        if (!blocked || attempt === MAX_SCRAPE_ATTEMPTS) return cards;
      }
    } catch (error) {
      this.logger.error({ err: error, url, durationMs: Date.now() - startedAt }, 'Failed to fetch bike list');
      throw this.toProviderException(error);
    }
  }

  /** Every table on a bike page as rows of cell texts; the monolith matches them to component types. */
  async readBikeTables(url: string): Promise<string[][][]> {
    this.assertProviderUrl(url);

    try {
      return await this.withPage(async (page) => {
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForSelector('table', { timeout: 15_000 });

        return page.evaluate(() => {
          const tables = Array.from(document.querySelectorAll('table'));

          return tables.map((table) => {
            const rows = Array.from(table.querySelectorAll('tr'));
            return rows.map((row) => {
              const cells = Array.from(row.querySelectorAll('td, th'));
              return cells.map((cell) => (cell as HTMLElement).innerText.trim());
            });
          });
        });
      });
    } catch (error) {
      this.logger.error({ err: error, url }, 'Failed to fetch bike tables');
      throw this.toProviderException(error);
    }
  }

  /** One browser, one page load; the diagnostics tell a real empty result from a blocked one. */
  private async scrapeBikeCards(url: string): Promise<BikeCardsAttempt> {
    const startedAt = Date.now();
    const resultsApiResponses: ResultsApiResponse[] = [];

    return await this.withPage(async (page) => {
      // Status 0 marks a request that never got an answer.
      page.on('response', (response) => {
        if (response.url().includes(RESULTS_API_PATH)) {
          resultsApiResponses.push({ status: response.status(), atMs: Date.now() - startedAt });
        }
      });
      page.on('requestfailed', (request) => {
        if (request.url().includes(RESULTS_API_PATH)) {
          resultsApiResponses.push({ status: 0, atMs: Date.now() - startedAt });
        }
      });
      await page.goto(url, { waitUntil: 'load' });
      const pageTitle = await page.title();
      // A Cloudflare page never draws cards, so waiting for them would only delay the retry.
      // No hits render no cards either, so the timeout means an empty result, not a failure.
      const card = CLOUDFLARE_PAGE_TITLE.test(pageTitle)
        ? null
        : await page.waitForSelector(CARD_SELECTOR, { timeout: 15_000 }).catch(() => null);

      const cards = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/bikes"]'));
        const results: {
          name: string;
          bikeBrand: string;
          imageUrl: string | null;
          bikeUrl: string;
          kind: 'model' | 'family';
        }[] = [];

        for (const element of anchors) {
          const anchor = element as HTMLAnchorElement;
          // Bikes and collections share the card markup, only the URL tells them apart.
          // Links matching neither shape are site navigation.
          const family = new URL(anchor.href).searchParams.get('family');
          const isModel = /\/bikes\/[^/?]+\/[^/?]+\/[^/?]+/.test(anchor.pathname);
          if (!family && !isModel) continue;

          const imageElement = anchor.querySelector('img');
          const imageUrl = imageElement ? imageElement.getAttribute('src') : null;
          // A card drawn with the placeholder image has no photo to offer.
          if (!imageUrl || imageUrl.includes('placeholder')) continue;

          const bikeBrand = anchor.querySelector('p');
          const nameElement = anchor.querySelector('span');

          results.push({
            name: nameElement ? nameElement.innerText.trim() : 'Unknown name',
            bikeBrand: bikeBrand ? bikeBrand.innerText.trim() : 'Unknown brand',
            imageUrl,
            bikeUrl: anchor.href.toString(),
            kind: family ? 'family' : 'model',
          });
        }

        return results;
      });

      return { cards, pageTitle, cardsTimedOut: card === null, resultsApiResponses };
    });
  }

  /** The page gives up after a row of 403s; a single 200 means an empty list is the real answer. */
  private isBlockedByCloudflare(attempt: BikeCardsAttempt): boolean {
    if (CLOUDFLARE_PAGE_TITLE.test(attempt.pageTitle)) return true;
    const { cardsTimedOut, resultsApiResponses } = attempt;

    return cardsTimedOut && resultsApiResponses.length > 0 && resultsApiResponses.every((r) => r.status !== 200);
  }

  /** The monolith turns a 504 into its own timeout answer and anything else into a 502. */
  private toProviderException(error: unknown): GatewayTimeoutException | BadGatewayException {
    if (error instanceof playwrightErrors.TimeoutError) {
      return new GatewayTimeoutException('Bike provider did not respond in time');
    }

    return new BadGatewayException('Failed to read the bike provider page');
  }

  /** This browser runs on a home network, so it follows a URL only to the provider host. */
  private assertProviderUrl(url: string): void {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Unsupported bike provider URL');
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== PROVIDER_HOST) {
      throw new BadRequestException('Unsupported bike provider URL');
    }
  }

  private async withPage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
    const browser = await chromium.launch({ headless: true });
    const context = await this.createContext(browser);
    const page = await context.newPage();
    try {
      await page.route('**/*', (route) =>
        BLOCKED_RESOURCES.has(route.request().resourceType()) ? route.abort() : route.continue(),
      );
      return await callback(page);
    } finally {
      await browser.close();
    }
  }

  private async createContext(browser: Browser): Promise<BrowserContext> {
    // No fixed user agent: the stealth plugin sets one, and a pinned version only goes stale (#282).
    return browser.newContext({ viewport: { width: 1280, height: 720 } });
  }
}
