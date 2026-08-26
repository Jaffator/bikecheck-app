import { Test, TestingModule } from '@nestjs/testing';
import { RideService } from './ride.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RideService', () => {
  let service: RideService;

  const mockPrisma = {
    rides: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RideService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<RideService>(RideService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findPage', () => {
    it('asks only for the user own rides, newest first, hiding deleted ones', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([]);
      mockPrisma.rides.count.mockResolvedValue(0);

      await service.findPage(1, 20, 0);

      const args = mockPrisma.rides.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ user_id: 1, is_deleted: { not: true } });
      // Nulls last: a ride with no start date must not head the list.
      expect(args.orderBy).toEqual({ started_at: { sort: 'desc', nulls: 'last' } });
      expect(args.take).toBe(20);
      expect(args.skip).toBe(0);
    });

    it('serialises the BigInt activity id as a string', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        {
          id: 5,
          activity_strava_id: BigInt('13579246810'),
          bike_id: 7,
          bikes: { bikename: 'Tarmac' },
          started_at: new Date('2026-08-19T06:12:00.000Z'),
          distance_m: 42000,
          duration_min: 96,
          elevation_up_m: 612,
          elevation_down_m: 598,
          speed_avg: 26,
          max_speed_kmh: 54,
          json_data: null,
        },
      ]);
      mockPrisma.rides.count.mockResolvedValue(1);

      const page = await service.findPage(1, 20, 0);

      expect(page.items[0].activity_strava_id).toBe('13579246810');
      expect(page.total).toBe(1);
    });

    it('flattens the bike name onto the ride', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        { id: 5, activity_strava_id: null, bike_id: 7, bikes: { bikename: 'Tarmac' }, json_data: null },
      ]);
      mockPrisma.rides.count.mockResolvedValue(1);

      const page = await service.findPage(1, 20, 0);

      expect(page.items[0].bike_name).toBe('Tarmac');
      // The relation itself does not travel to the client.
      expect(page.items[0]).not.toHaveProperty('bikes');
    });

    it('falls back to the model when the bike has no nickname', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        {
          id: 5,
          activity_strava_id: null,
          bike_id: 7,
          bikes: { bikename: null, bike_brand: 'Specialized', bike_model: 'Epic EVO' },
          json_data: null,
        },
      ]);
      mockPrisma.rides.count.mockResolvedValue(1);

      const page = await service.findPage(1, 20, 0);

      expect(page.items[0].bike_name).toBe('Specialized Epic EVO');
    });

    it('lifts the name and the route out of the payload, and leaves the payload behind', async () => {
      // Stored the way the Strava sync writes it: a stringified activity in a Json
      // column, which Prisma hands back as the string it was given.
      mockPrisma.rides.findMany.mockResolvedValue([
        {
          id: 5,
          activity_strava_id: null,
          bike_id: 7,
          bikes: { bikename: 'Tarmac' },
          json_data: JSON.stringify({
            name: 'Morning Mountain Bike Ride',
            map: { summary_polyline: 'ki}fHuqrbBGx@_@lA' },
            segment_efforts: ['the rest of the blob, which the client never sees'],
          }),
        },
      ]);
      mockPrisma.rides.count.mockResolvedValue(1);

      const page = await service.findPage(1, 20, 0);

      expect(page.items[0].name).toBe('Morning Mountain Bike Ride');
      expect(page.items[0].summary_polyline).toBe('ki}fHuqrbBGx@_@lA');
      // The whole point of lifting them out: the blob does not travel.
      expect(page.items[0]).not.toHaveProperty('json_data');
    });

    it('reads a ride recorded without GPS as having no route', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        {
          id: 5,
          activity_strava_id: null,
          bike_id: 7,
          bikes: { bikename: 'Tarmac' },
          json_data: { name: 'Indoor Ride', map: { summary_polyline: '' } },
        },
      ]);
      mockPrisma.rides.count.mockResolvedValue(1);

      const page = await service.findPage(1, 20, 0);

      // An empty polyline is no route, not a route of length zero.
      expect(page.items[0].summary_polyline).toBeNull();
      expect(page.items[0].name).toBe('Indoor Ride');
    });

    it('clamps the page size, so one request cannot ask for the whole table', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([]);
      mockPrisma.rides.count.mockResolvedValue(0);

      await service.findPage(1, 5000, 0);

      expect(mockPrisma.rides.findMany.mock.calls[0][0].take).toBe(100);
    });

    it('falls back to sane paging when given rubbish', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([]);
      mockPrisma.rides.count.mockResolvedValue(0);

      await service.findPage(1, Number.NaN, -10);

      const args = mockPrisma.rides.findMany.mock.calls[0][0];
      expect(args.take).toBe(20);
      expect(args.skip).toBe(0);
    });
  });
});
