import { BadGatewayException, BadRequestException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../prisma/prisma.service';
import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, LaunchOptions, Page } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SearchBikeExternalResponseDto } from '../dto/response-bike.dto';
import { AssembleBikeComponentsDto } from '../../component/dto/response-components';
import type { component_types as ComponentType } from '@prisma/client';
import { errors as playwrightErrors } from 'playwright';

chromium.use(stealthPlugin());

// Only scraped site; drill-in URLs come from the client, so each is checked against it.
const PROVIDER_HOST = '99spokes.com';
const CARD_SELECTOR = 'a[href*="/bikes/"], a[href*="family="]';
// Cards read only the image URL, so the files would just eat the proxy's home uplink.
const BLOCKED_RESOURCES = new Set(['image', 'font', 'media']);

@Injectable()
export class BikeDataScrapeService {
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(BikeDataScrapeService.name)
    private readonly logger: PinoLogger,
  ) {}

  /** Returns bike and collection cards alike. */
  async searchBikeList(bikeTitle: string, year: string): Promise<SearchBikeExternalResponseDto[]> {
    return await this.fetchBikeCards(this.buildSearchUrl(bikeTitle, year));
  }

  /** Collection URL comes from the provider's card and carries the original query - nothing to rebuild. */
  async searchFamilyList(url: string): Promise<SearchBikeExternalResponseDto[]> {
    this.assertProviderUrl(url);

    return await this.fetchBikeCards(url);
  }

  /** Search and collection pages share the same markup, so both read cards here. */
  private async fetchBikeCards(url: string): Promise<SearchBikeExternalResponseDto[]> {
    const startedAt = Date.now();

    try {
      const { bikes, pageTitle, cardsTimedOut } = await this.withPage(async (page) => {
        await page.goto(url, { waitUntil: 'load' });
        // No hits render no cards, so the timeout means an empty result, not a failure.
        // Results arrive by XHR through the home proxy, which sometimes takes over 10 s.
        const card = await page.waitForSelector(CARD_SELECTOR, { timeout: 15_000 }).catch(() => null);

        const cards = await page.evaluate(() => {
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

        // An empty list is either no hits or a page that never drew cards (a Cloudflare challenge); the title tells which.
        return { bikes: cards, pageTitle: await page.title(), cardsTimedOut: card === null };
      });

      this.logger.info(
        { url, resultCount: bikes.length, durationMs: Date.now() - startedAt, pageTitle, cardsTimedOut },
        'Bike list fetched',
      );

      return bikes;
    } catch (error) {
      this.logger.error({ err: error, url, durationMs: Date.now() - startedAt }, 'Failed to fetch bike list');

      if (error instanceof playwrightErrors.TimeoutError) {
        throw new GatewayTimeoutException('Bike provider did not respond in time');
      }

      throw new BadGatewayException('Failed to fetch bike list from external provider');
    }
  }

  /** Every active component type is returned, unmatched ones with an empty description. */
  async externalGetBikeComponents(url: string): Promise<AssembleBikeComponentsDto[]> {
    this.assertProviderUrl(url);

    try {
      const bikeComponents = await this.withPage(async (page) => {
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

      // A removed type is offered to nobody, here as in the picker (ADR 0021).
      const componentsTypes = await this.prisma.component_types.findMany({ where: { is_deleted: { not: true } } });

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

  /** Scraper drives a real browser, so a client URL is followed only to the provider host. */
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

  /** Cloudflare blocks the prod datacenter IP (#246), so prod goes out through a proxy on a home IP. */
  private proxyFromEnv(): LaunchOptions['proxy'] {
    const raw = process.env.SCRAPER_PROXY_URL;
    if (!raw) return undefined;

    const url = new URL(raw);
    return {
      server: `${url.protocol}//${url.host}`,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  }

  private async withPage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
    const browser = await chromium.launch({ headless: true, proxy: this.proxyFromEnv() });
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
    return browser.newContext({
      userAgent: this.userAgent,
      viewport: { width: 1280, height: 720 },
    });
  }
}
