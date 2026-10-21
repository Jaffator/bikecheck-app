import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import type {
  ScrapeBikeCardsResponse,
  ScrapeBikePageRequest,
  ScrapeBikeTablesResponse,
} from '@contracts/bike-scraper.contract';
import { InternalAuthGuard } from '../common/internal-auth.guard';
import { BikePageService } from './bike-page.service';

@Controller()
@UseGuards(InternalAuthGuard)
export class BikePageController {
  constructor(private readonly bikePageService: BikePageService) {}

  // POST, not GET: the provider URL carries its own query string.
  @Post('bike-cards')
  @HttpCode(HttpStatus.OK)
  async readBikeCards(@Body() body: ScrapeBikePageRequest): Promise<ScrapeBikeCardsResponse> {
    return { cards: await this.bikePageService.readBikeCards(body.url) };
  }

  @Post('bike-tables')
  @HttpCode(HttpStatus.OK)
  async readBikeTables(@Body() body: ScrapeBikePageRequest): Promise<ScrapeBikeTablesResponse> {
    return { tables: await this.bikePageService.readBikeTables(body.url) };
  }
}
