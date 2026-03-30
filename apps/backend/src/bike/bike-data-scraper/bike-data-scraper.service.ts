import { BadGatewayException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../prisma/prisma.service';
import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, Page } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { BikeListItem, BikeSearchQuery, BikeComponentsArray } from './bike-data-scraper.types';
import type { component_types as ComponentType } from '@prisma/client';
import { TimeoutError } from 'rxjs';

chromium.use(stealthPlugin());

@Injectable()
export class BikeDataScrapeService {
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(BikeDataScrapeService.name)
    private readonly logger: PinoLogger,
  ) {}

  /** FindBikeList
   * Fetches a list of bikes from an external provider based on the search query.
   * @param query The search query for fetching bikes.
   * @returns Array of {name: string, image: string, url: string}
   */
  async findBikeList(query: BikeSearchQuery): Promise<BikeListItem[]> {
    const url = this.buildSearchUrl(query);
    const startedAt = Date.now();

    try {
      const bikes = await this.withPage(async (page) => {
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForSelector('a[href*="/bikes/"]', { timeout: 8000 });

        return page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('a[href*="/bikes/"]'));

          return cards
            .map((card) => {
              const anchor = card as HTMLAnchorElement;
              const nameElement = anchor.querySelector('span');
              const imageElement = anchor.querySelector('img');

              return {
                name: nameElement ? nameElement.innerText.trim() : 'Unknown name',
                image: imageElement ? imageElement.getAttribute('src') : null,
                url: anchor.href.toString(),
              };
            })
            .filter((bike) => bike.image && !bike.image.includes('placeholder'));
        });
      });

      this.logger.info(
        { url, query, resultCount: bikes.length, durationMs: Date.now() - startedAt },
        'Bike list fetched',
      );

      return bikes;
    } catch (error) {
      this.logger.error({ err: error, url, query, durationMs: Date.now() - startedAt }, 'Failed to fetch bike list');

      if (error instanceof TimeoutError) {
        throw new GatewayTimeoutException('Bike provider did not respond in time');
      }

      throw new BadGatewayException('Failed to fetch bike list from external provider');
    }
  }

  /**
   * Fetches the components of a bike from an external provider based on the bike URL.
   * @param url The URL of the bike for fetching components.
   * @returns Array of {id: number, component: string, desc: string}
   */
  async getBikeComponents(url: string): Promise<BikeComponentsArray[]> {
    try {
      const bikeComponents = await this.withPage(async (page) => {
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForSelector('table', { timeout: 6000 });

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

      const components = await this.prisma.component_types.findMany({});
      const result = await this.createBikeComponentsArray(bikeComponents, components);

      return result;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new GatewayTimeoutException('Bike component provider timed out');
      }

      throw new BadGatewayException('Failed to fetch bike components from external provider');
    }
  }

  private async createBikeComponentsArray(
    dataArray: any[],
    components: ComponentType[],
    result: BikeComponentsArray[] = [],
  ): Promise<BikeComponentsArray[]> {
    if (dataArray.length === 0) {
      return result;
    }
    const first: string = dataArray[0];
    if (Array.isArray(first)) {
      await this.createBikeComponentsArray(first, components, result);
    } else {
      if (typeof first === 'string' && components.some((item) => item.component_type === first)) {
        const componentId = components.find((item) => item.component_type === first)?.id;
        if (!componentId) throw new Error("id not found, component doesn't exist in db");

        let desc: string = dataArray[1] as string;
        if (!result.some((item) => item.component.component_type_id === componentId)) {
          const findedMark = desc.indexOf('\n');
          if (findedMark > -1) desc = desc.slice(0, findedMark);
          result.push({
            component: {
              bike_id: 0, // Placeholder, should be set to the actual bike ID
              component_type_id: componentId,
              component_desc: desc,
              mounted_at: undefined,
              total_mileage_km: 0,
              is_active: false,
              note: '',
              interval_id: undefined,
              brake_load_since_service: undefined,
              last_serviced_at: undefined,
            },
            component_name: first,
          });
        }
      }
    }

    for (let i = 1; i < dataArray.length; i++) {
      const item = dataArray[i];
      if (Array.isArray(item)) {
        await this.createBikeComponentsArray(item, components, result);
      }
    }

    return result;
  }

  private buildSearchUrl(query: BikeSearchQuery): string {
    const searchQuery = `${query.brand} ${query.model}`.trim();

    return `https://99spokes.com/en-EU/bikes?frameset=0&q=${encodeURIComponent(searchQuery)}&year=${encodeURIComponent(query.year ?? '')}`;
  }

  private async withPage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
    const browser = await chromium.launch({ headless: true });
    const context = await this.createContext(browser);
    const page = await context.newPage();
    try {
      return await callback(page);
    } finally {
      await browser.close();
    }
  }
  private async createContext(browser: Browser): Promise<BrowserContext> {
    return browser.newContext({
      userAgent: this.userAgent,
      viewport: { width: 1280, height: 720 },
    });
  }
}
