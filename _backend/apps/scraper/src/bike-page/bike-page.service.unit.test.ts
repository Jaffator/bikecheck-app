// Calls the scraper with provider URLs, the way the monolith does. No Nest module, but a
// real browser does open and go out to the network, so this is a smoke test that runs locally only.
import { BadRequestException } from '@nestjs/common';
import { BikePageService } from './bike-page.service';
import type { PinoLogger } from 'nestjs-pino';

// The service only ever writes to the logger, so recording calls is enough.
const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
} as unknown as PinoLogger;

const searchUrl = (query: string, year: string): string =>
  `https://99spokes.com/en-EU/bikes?frameset=0&q=${encodeURIComponent(query)}&year=${year}`;

describe('BikePageService', () => {
  const bikePageService = new BikePageService(logger);

  it('finds bikes for a brand and year', async (): Promise<void> => {
    // ACT
    const bikes = await bikePageService.readBikeCards(searchUrl('Canyon Spectral', '2025'));

    // ASSERT
    expect(bikes.length).toBeGreaterThan(0);
    bikes.forEach((bike) => {
      expect(bike.name).toBeTruthy();
      expect(bike.bikeBrand).toBeTruthy();
      expect(() => new URL(bike.bikeUrl)).not.toThrow();
      expect(() => new URL(bike.imageUrl ?? '')).not.toThrow();
    });
  }, 60_000); // Launching the browser and loading the provider takes far longer than the 5s default.

  it('returns nothing for a bike that does not exist', async (): Promise<void> => {
    // ACT
    const bikes = await bikePageService.readBikeCards(searchUrl('Nonexistent Bike Brand Xyzzy', '2023'));

    // ASSERT - a search with no hits is an empty list, not an error.
    expect(bikes).toEqual([]);
  }, 60_000);

  it('marks collection cards and opens one of them', async (): Promise<void> => {
    // ARRANGE - this query is answered with collections, not with bikes.
    const collections = await bikePageService.readBikeCards(searchUrl('Canyon Spectral', '2025'));
    const collection = collections.find((result) => result.kind === 'family');
    expect(collection?.bikeUrl).toContain('family=');

    // ACT - opening a collection has to answer with the bikes inside it.
    const bikes = await bikePageService.readBikeCards(collection?.bikeUrl ?? '');

    // ASSERT
    expect(bikes.length).toBeGreaterThan(0);
    bikes.forEach((bike) => expect(bike.kind).toBe('model'));
  }, 120_000);

  it('reads the spec tables of a bike page', async (): Promise<void> => {
    // ARRANGE - a bike page, not a search: only those carry the spec tables.
    const bikeUrl = 'https://99spokes.com/en-EU/bikes/canyon/2026/endurace-young-hero';

    // ACT
    const tables = await bikePageService.readBikeTables(bikeUrl);

    // ASSERT - every table is rows of cell texts.
    expect(tables.length).toBeGreaterThan(0);
    expect(typeof tables[0][0][0]).toBe('string');
  }, 120_000);

  it('refuses a URL that does not belong to the provider', async (): Promise<void> => {
    // ARRANGE - this browser runs on a home network, so it must never follow a foreign host.
    const foreignUrl = 'http://192.168.1.1/admin';

    // ACT + ASSERT
    await expect(bikePageService.readBikeCards(foreignUrl)).rejects.toBeInstanceOf(BadRequestException);
    await expect(bikePageService.readBikeTables(foreignUrl)).rejects.toBeInstanceOf(BadRequestException);
  });
});
