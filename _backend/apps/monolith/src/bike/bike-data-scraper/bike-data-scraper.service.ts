import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import axios from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchBikeExternalResponseDto } from '../dto/response-bike.dto';
import { AssembleBikeComponentsDto } from '../../component/dto/response-components';
import type { component_types as ComponentType } from '@prisma/client';
import type {
  ScrapeBikeCardsResponse,
  ScrapeBikePageRequest,
  ScrapeBikeTablesResponse,
} from '@contracts/bike-scraper.contract';

// Only scraped site; drill-in URLs come from the client, so each is checked against it.
const PROVIDER_HOST = '99spokes.com';
// The scraper may load a page twice when Cloudflare turns the first browser away.
const SCRAPER_TIMEOUT_MS = 90_000;

@Injectable()
export class BikeDataScrapeService {
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
      const { cards } = await this.callScraper<ScrapeBikeCardsResponse>('bike-cards', url);
      this.logger.info({ url, resultCount: cards.length, durationMs: Date.now() - startedAt }, 'Bike list fetched');

      return cards;
    } catch (error) {
      this.logger.error({ err: error, url, durationMs: Date.now() - startedAt }, 'Failed to fetch bike list');

      if (this.isTimeout(error)) {
        throw new GatewayTimeoutException('Bike provider did not respond in time');
      }

      throw new BadGatewayException('Failed to fetch bike list from external provider');
    }
  }

  /** Every active component type is returned, unmatched ones with an empty description. */
  async externalGetBikeComponents(url: string): Promise<AssembleBikeComponentsDto[]> {
    this.assertProviderUrl(url);

    try {
      const { tables } = await this.callScraper<ScrapeBikeTablesResponse>('bike-tables', url);

      // A removed type is offered to nobody, here as in the picker (ADR 0021).
      const componentsTypes = await this.prisma.component_types.findMany({ where: { is_deleted: { not: true } } });

      const extractedBikeComponents = await this.assembleBikeComponents(tables.reverse(), componentsTypes);

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
      if (this.isTimeout(error)) {
        throw new GatewayTimeoutException('Bike component provider timed out');
      }

      throw new BadGatewayException('Failed to fetch bike components from external provider');
    }
  }

  /** The browser runs on the home Pi: Cloudflare lets a browser at home through, not one on Hetzner (ADR 0042). */
  private async callScraper<T>(path: string, url: string): Promise<T> {
    const body: ScrapeBikePageRequest = { url };
    const response = await axios.post<T>(`${process.env.SCRAPER_SERVICE_URL}/${path}`, body, {
      headers: { 'x-internal-secret': process.env.SCRAPER_API_SECRET },
      timeout: SCRAPER_TIMEOUT_MS,
    });

    return response.data;
  }

  /** A 504 is the provider page timing out on the Pi; ECONNABORTED is the Pi itself taking too long. */
  private isTimeout(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;

    return error.code === 'ECONNABORTED' || error.response?.status === HttpStatus.GATEWAY_TIMEOUT;
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

  /** The scraper drives a real browser on a home network, so a client URL is passed on only for the provider host. */
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
}
