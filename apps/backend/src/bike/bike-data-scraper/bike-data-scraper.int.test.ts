import { Test, TestingModule } from '@nestjs/testing';
import { BikeDataScrapeService } from './bike-data-scraper.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { getLoggerToken } from 'nestjs-pino';
import type { BikeListItem } from './bike-data-scraper.types';

describe('BikeDataScrapeService (integration)', () => {
  let scrapeService: BikeDataScrapeService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;
  let bikelist: BikeListItem[] = [];
  beforeAll(async (): Promise<void> => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('⚠️ Test must run against test database! Check DATABASE_URL');
    }

    moduleRef = await Test.createTestingModule({
      providers: [
        BikeDataScrapeService,
        PrismaService,
        {
          provide: getLoggerToken(BikeDataScrapeService.name),
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
          },
        },
      ],
    }).compile();

    scrapeService = moduleRef.get(BikeDataScrapeService);
    prisma = moduleRef.get(PrismaService);

    await prisma.$connect();
  });

  beforeEach(async (): Promise<void> => {
    // Pouze test DB
    // await prisma.bikes.deleteMany({});
  });

  afterAll(async (): Promise<void> => {
    await prisma.$disconnect();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await moduleRef.close();
  });

  it('Try to find bike list', async (): Promise<void> => {
    // ARRANGE
    const query = { brand: 'Orbea Rallon', year: '2023' };
    // ACT
    bikelist = await scrapeService.findBikeList(query.brand, query.year);

    // ASSERT
    expect(bikelist.length).toBeGreaterThan(0);
    bikelist.forEach((item) => {
      expect(item.url).toBeTruthy();
      expect(() => new URL(item.url)).not.toThrow();
      expect(item.image).toBeTruthy();
      expect(() => new URL(item.image!)).not.toThrow();
      expect(item.name).toBeTruthy();
    });
  });

  it('Try to find components on first bike from list', async (): Promise<void> => {
    // ARRANGE
    const firstBike = bikelist[0];
    // ACT
    const components = await scrapeService.extractBikeComponents(firstBike.url);
    // ASSERT
    expect(components.length).toBeGreaterThan(0);
    expect(components[0]).toMatchObject({
      component: expect.any(String),
      desc: expect.any(String),
    });
  });
});
