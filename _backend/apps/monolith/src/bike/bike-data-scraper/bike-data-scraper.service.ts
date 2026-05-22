import { BadGatewayException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../prisma/prisma.service';
import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, Page } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SearchBikeExternalResponseDto } from '../dto/response-bike.dto';
import { AssembleBikeComponentsDto } from '../../component/dto/response-components';
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

  /** SearchBikeList
   * Fetches a list of bikes from an external provider based on the search query.
   * @param query The search query for fetching bikes.
   * @returns Array of {name: string, image: string, url: string}
   */
  async searchBikeList(bikeTitle: string, year: string): Promise<SearchBikeExternalResponseDto[]> {
    const url = this.buildSearchUrl(bikeTitle, year);
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
                imageUrl: imageElement ? imageElement.getAttribute('src') : null,
                bikeUrl: anchor.href.toString(),
              };
            })
            .filter((bike) => bike.imageUrl && !bike.imageUrl.includes('placeholder'));
        });
      });

      this.logger.info(
        { url, bikeTitle, year, resultCount: bikes.length, durationMs: Date.now() - startedAt },
        'Bike list fetched',
      );

      return bikes;
    } catch (error) {
      this.logger.error(
        { err: error, url, bikeTitle, year, durationMs: Date.now() - startedAt },
        'Failed to fetch bike list',
      );

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
  async externalGetBikeComponents(url: string): Promise<AssembleBikeComponentsDto[]> {
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
      if (error instanceof TimeoutError) {
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
        total_mileage_km: 0,
        is_active: true,
        note: undefined,
        position: undefined,
        interval_id: undefined,
        brake_load_since_service: undefined,
        last_serviced_at: undefined,
      },
      component_name: '',
    };
    if (component && foundedPosititon) {
      // Position defined in description, return single component with position
      return [
        {
          component: { ...baseComponent.component, component_type_id: component.id, position: foundedPosititon },
          component_name: component.component_type,
        },
      ];
    }
    if (component && component.has_position && !foundedPosititon) {
      // Position not defined, but components are in pair (front/rear), return two components with front/rear position
      return [
        {
          component: { ...baseComponent.component, component_type_id: component.id, position: 'rear' },
          component_name: component.component_type,
        },
        {
          component: { ...baseComponent.component, component_type_id: component.id, position: 'front' },
          component_name: component.component_type,
        },
      ];
    }
    // Just return component without position
    return [
      {
        component: {
          ...baseComponent.component,
          component_type_id: component.id,
        },
        component_name: component.component_type,
      },
    ];
  }

  private buildSearchUrl(bikeTitle: string, year: string): string {
    const searchQuery = bikeTitle.trim();

    return `https://99spokes.com/en-EU/bikes?frameset=0&q=${encodeURIComponent(searchQuery)}&year=${encodeURIComponent(year ?? '')}`;
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
