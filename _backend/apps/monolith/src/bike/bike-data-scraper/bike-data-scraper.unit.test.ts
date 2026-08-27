// Calls the scraper with plain parameters, the way the controller does. No Nest
// module and no database - searchBikeList only reaches for the provider - but a
// real browser does open and go out to the network, so this is a smoke test.
import { BadRequestException } from '@nestjs/common';
import { BikeDataScrapeService } from './bike-data-scraper.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { PinoLogger } from 'nestjs-pino';

// The service only ever writes to the logger, so recording calls is enough.
const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
} as unknown as PinoLogger;

describe('BikeDataScrapeService.searchBikeList', () => {
  // Prisma is untouched on this path, so an empty stub stands in for it.
  const scrapeService = new BikeDataScrapeService({} as PrismaService, logger);

  it('finds bikes for a brand and year', async (): Promise<void> => {
    // ARRANGE
    const query = { brand: 'Canyon Spectral', year: '2025' };

    // ACT
    try {
      const bikes = await scrapeService.searchBikeList(query.brand, query.year);

      // ASSERT
      console.log('Bikes found:', bikes);
      expect(bikes.length).toBeGreaterThan(0);
      bikes.forEach((bike) => {
        expect(bike.name).toBeTruthy();
        expect(bike.bikeBrand).toBeTruthy();
        expect(() => new URL(bike.bikeUrl)).not.toThrow();
        expect(() => new URL(bike.imageUrl ?? '')).not.toThrow();
      });
    } catch (error) {
      console.error('Error occurred while searching for bikes:', error);
      throw error;
    }
  }, 60_000); // Launching the browser and loading the provider takes far longer than the 5s default.

  it('returns nothing for a bike that does not exist', async (): Promise<void> => {
    // ARRANGE
    const query = { brand: 'Nonexistent Bike Brand Xyzzy', year: '2023' };

    // ACT
    const bikes = await scrapeService.searchBikeList(query.brand, query.year);

    // ASSERT - a search with no hits is an empty list, not an error.
    expect(bikes).toEqual([]);
  }, 60_000);

  it(
    'marks collection cards and opens one of them',
    async (): Promise<void> => {
      // ARRANGE - this query is answered with collections, not with bikes.
      const query = { brand: 'Canyon Spectral', year: '2025' };

      // ACT
      const collections = await scrapeService.searchBikeList(query.brand, query.year);

      // ASSERT - the same search may also return bikes, so only the collections
      // among the results are what this is about.
      const collection = collections.find((result) => result.kind === 'family');
      expect(collection).toBeDefined();
      expect(collection?.bikeUrl).toContain('family=');

      // ACT - opening a collection has to answer with the bikes inside it.
      const bikes = await scrapeService.searchFamilyList(collection?.bikeUrl ?? '');

      // ASSERT
      expect(bikes.length).toBeGreaterThan(0);
      bikes.forEach((bike) => {
        expect(bike.kind).toBe('model');
        expect(() => new URL(bike.bikeUrl)).not.toThrow();
      });
    },
    120_000,
  );

  it('refuses a URL that does not belong to the provider', async (): Promise<void> => {
    // ARRANGE - the URL arrives from the client, so its host is never assumed.
    const foreignUrl = 'https://example.com/en-EU/bikes?family=canyon-spectral';

    // ACT + ASSERT
    await expect(scrapeService.searchFamilyList(foreignUrl)).rejects.toBeInstanceOf(BadRequestException);
  });
});
