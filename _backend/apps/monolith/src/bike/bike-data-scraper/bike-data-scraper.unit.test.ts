// Calls the scraper client with plain parameters, the way the controller does. The scraper
// app on the Pi is stubbed at axios, so no browser opens and nothing leaves the machine.
import { BadRequestException, GatewayTimeoutException } from '@nestjs/common';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { BikeDataScrapeService } from './bike-data-scraper.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { PinoLogger } from 'nestjs-pino';
import type { ScrapedBikeCard } from '@contracts/bike-scraper.contract';

// The service only ever writes to the logger, so recording calls is enough.
const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
} as unknown as PinoLogger;

const SCRAPER_URL = 'http://scraper.test:3003';
const SCRAPER_SECRET = 'scraper-secret';

const card: ScrapedBikeCard = {
  name: 'Spectral CF 8',
  bikeBrand: '2025 Canyon',
  imageUrl: 'https://cdn.example/spectral.webp',
  bikeUrl: 'https://99spokes.com/en-EU/bikes/canyon/2025/spectral-cf-8',
  kind: 'model',
};

describe('BikeDataScrapeService.searchBikeList', () => {
  // Prisma is untouched on this path, so an empty stub stands in for it.
  const scrapeService = new BikeDataScrapeService({} as PrismaService, logger);
  let post: jest.SpyInstance;

  beforeEach((): void => {
    process.env.SCRAPER_SERVICE_URL = SCRAPER_URL;
    process.env.SCRAPER_API_SECRET = SCRAPER_SECRET;
    post = jest.spyOn(axios, 'post');
  });

  afterEach((): void => {
    post.mockRestore();
  });

  it('asks the scraper for the search page and returns its cards', async (): Promise<void> => {
    // ARRANGE
    post.mockResolvedValue({ data: { cards: [card] } });

    // ACT
    const bikes = await scrapeService.searchBikeList(' Canyon Spectral ', '2025');

    // ASSERT
    expect(bikes).toEqual([card]);
    expect(post).toHaveBeenCalledWith(
      `${SCRAPER_URL}/bike-cards`,
      { url: 'https://99spokes.com/en-EU/bikes?frameset=0&q=Canyon%20Spectral&year=2025' },
      expect.objectContaining({ headers: { 'x-internal-secret': SCRAPER_SECRET } }),
    );
  });

  it('answers 504 when the provider page timed out on the scraper', async (): Promise<void> => {
    // ARRANGE - the scraper reports a page that never loaded as 504.
    const response = { status: 504, statusText: '', data: {}, headers: {}, config: { headers: new AxiosHeaders() } };
    post.mockRejectedValue(new AxiosError('timeout', 'ERR_BAD_RESPONSE', undefined, undefined, response));

    // ACT + ASSERT
    await expect(scrapeService.searchBikeList('Canyon Spectral', '2025')).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });

  it('refuses a URL that does not belong to the provider', async (): Promise<void> => {
    // ARRANGE - the URL arrives from the client, so its host is never assumed.
    const foreignUrl = 'https://example.com/en-EU/bikes?family=canyon-spectral';

    // ACT + ASSERT
    await expect(scrapeService.searchFamilyList(foreignUrl)).rejects.toBeInstanceOf(BadRequestException);
    expect(post).not.toHaveBeenCalled();
  });
});
