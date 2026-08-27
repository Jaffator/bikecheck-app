import { BadGatewayException, BadRequestException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../prisma/prisma.service';
import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, Page } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SearchBikeExternalResponseDto } from '../dto/response-bike.dto';
import { AssembleBikeComponentsDto } from '../../component/dto/response-components';
import type { component_types as ComponentType } from '@prisma/client';
import { errors as playwrightErrors } from 'playwright';

chromium.use(stealthPlugin());

// The only site this service scrapes. Every URL it opens is checked against it,
// because the ones reaching the drill-in endpoints come from the client.
const PROVIDER_HOST = '99spokes.com';

@Injectable()
export class BikeDataScrapeService {
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(BikeDataScrapeService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Searches the provider for bikes matching a name and year.
   * @param bikeTitle The brand and model to search for
   * @param year The model year to limit the search to
   * @returns The cards the search page rendered, bikes and collections alike
   */
  async searchBikeList(bikeTitle: string, year: string): Promise<SearchBikeExternalResponseDto[]> {
    return await this.fetchBikeCards(this.buildSearchUrl(bikeTitle, year));
  }

  /**
   * Opens a collection card and reads the bikes filed under it. The URL is the
   * one the provider put on the card - it carries the original query, so there
   * is nothing to rebuild here.
   * @param url The collection URL returned by a previous search
   * @returns The cards the collection page rendered
   */
  async searchFamilyList(url: string): Promise<SearchBikeExternalResponseDto[]> {
    this.assertProviderUrl(url);

    return await this.fetchBikeCards(url);
  }

  /**
   * Reads every result card off one provider listing page. Both entry points
   * land on the same markup, so they share this.
   * @param url The listing page to read
   * @returns One entry per card, each marked as a bike or a collection
   */
  private async fetchBikeCards(url: string): Promise<SearchBikeExternalResponseDto[]> {
    const startedAt = Date.now();

    try {
      const bikes = await this.withPage(async (page) => {
        await page.goto(url, { waitUntil: 'load' });
        // A listing answers with bike cards, with collection cards, or with
        // neither - a search with no hits renders no cards at all, so the
        // selector never appears. That is an empty result, not a failure:
        // swallow the timeout and let the evaluate below return an empty array.
        await page
          .waitForSelector('a[href*="/bikes/"], a[href*="family="]', { timeout: 4000 })
          .catch(() => null);

        return page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('a[href*="/bikes"]'));
          const results: {
            name: string;
            bikeBrand: string;
            imageUrl: string | null;
            bikeUrl: string;
            kind: 'model' | 'family';
          }[] = [];

          for (const card of cards) {
            const anchor = card as HTMLAnchorElement;
            // A bike sits at /bikes/<brand>/<year>/<model>; a collection is the
            // search page narrowed to one family. Both render as the same card,
            // so the URL is the only thing telling them apart - and anything
            // matching neither shape is site navigation, not a result.
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
      });

      this.logger.info({ url, resultCount: bikes.length, durationMs: Date.now() - startedAt }, 'Bike list fetched');

      return bikes;
    } catch (error) {
      this.logger.error({ err: error, url, durationMs: Date.now() - startedAt }, 'Failed to fetch bike list');

      if (error instanceof playwrightErrors.TimeoutError) {
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
  async externalGetBikeComponents(url: string): Promise<AssembleBikeComponentsDto[]> {
    this.assertProviderUrl(url);

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

      const componentsTypes = await this.prisma.component_types.findMany({});

      const extractedBikeComponents = await this.assembleBikeComponents(bikeComponents.reverse(), componentsTypes);

      const mountedComponents = componentsTypes.flatMap((item) => {
        const found = extractedBikeComponents.filter((comp) => comp.component.component_type_id === item.id);
        if (found.length > 0) {
          return found;
        } else {
          return this.buildBikeMountedComponent(item, '', undefined);
        }
      });
      return mountedComponents;
    } catch (error) {
      if (error instanceof playwrightErrors.TimeoutError) {
        throw new GatewayTimeoutException('Bike component provider timed out');
      }

      throw new BadGatewayException('Failed to fetch bike components from external provider');
    }
  }

  private async assembleBikeComponents(
    dataArray: any[],
    components: ComponentType[],
    result: AssembleBikeComponentsDto[] = [],
  ): Promise<AssembleBikeComponentsDto[]> {
    if (dataArray.length === 0) {
      return result;
    }
    const componentNameExt: string = dataArray[0];

    // It's array continue to search for string components
    if (Array.isArray(componentNameExt)) {
      await this.assembleBikeComponents(componentNameExt, components, result);
    } else {
      const component = components.find((item) => {
        return componentNameExt.toLowerCase().includes(item.component_type.toLowerCase());
      });
      // It's string, try to find component type in db and build component object
      if (typeof componentNameExt === 'string') {
        let description: string = dataArray[1] as string;
        const findedMark = description.indexOf('\n');
        if (findedMark > -1) description = description.slice(0, findedMark);
        // Try to find words rear or front
        const foundedPosititon = componentNameExt.toLowerCase().includes('rear')
          ? 'rear'
          : componentNameExt.toLowerCase().includes('front')
            ? 'front'
            : undefined;

        // Component found in DB
        if (component && !result.some((item) => item.component.component_type_id === component.id)) {
          const mountedComponents = this.buildBikeMountedComponent(component, description, foundedPosititon);
          mountedComponents?.forEach((comp) => result.push(comp));
        }
      }
    }

    for (let i = 1; i < dataArray.length; i++) {
      const item = dataArray[i];
      if (Array.isArray(item)) {
        await this.assembleBikeComponents(item, components, result);
      }
    }

    return result;
  }

  private buildBikeMountedComponent(
    component: ComponentType,
    desc: string,
    foundedPosititon: string | undefined,
  ): AssembleBikeComponentsDto[] {
    const baseComponent: AssembleBikeComponentsDto = {
      component: {
        bike_id: 0,
        component_type_id: 0,
        component_desc: desc,
        mounted_at: undefined,
        total_km: 0,
        is_active: true,
        note: undefined,
        position: undefined,
        interval_id: undefined,
      },
      component_name: component.component_type,
      component_group_id: component.component_group_id,
      component_i18n_key: component.i18n_key,
      has_position: component.has_position,
      essential: component.essential,
    };
    if (component && foundedPosititon) {
      // Position defined in description, return single component with position
      return [
        {
          ...baseComponent,
          component: { ...baseComponent.component, component_type_id: component.id, position: foundedPosititon },
        },
      ];
    }
    if (component && component.has_position && !foundedPosititon) {
      // Position not defined, but components are in pair (front/rear), return two components with front/rear position
      return [
        {
          ...baseComponent,
          component: { ...baseComponent.component, component_type_id: component.id, position: 'rear' },
        },
        {
          ...baseComponent,
          component: { ...baseComponent.component, component_type_id: component.id, position: 'front' },
        },
      ];
    }
    // Just return component without position
    return [
      {
        ...baseComponent,
        component: { ...baseComponent.component, component_type_id: component.id },
      },
    ];
  }

  private buildSearchUrl(bikeTitle: string, year: string): string {
    const searchQuery = bikeTitle.trim();

    return `https://${PROVIDER_HOST}/en-EU/bikes?frameset=0&q=${encodeURIComponent(searchQuery)}&year=${encodeURIComponent(year ?? '')}`;
  }

  /**
   * Refuses any URL that does not belong to the provider. The scraper drives a
   * real browser, so a URL arriving from the client is followed only when it
   * points where we expect - never at an address of the caller's choosing.
   * @param url The URL a client asked the scraper to open
   */
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
