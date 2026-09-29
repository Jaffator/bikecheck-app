import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RideService } from './ride.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';

const PRAGUE = 'Europe/Prague';
const SEPTEMBER = { from: '2026-09-01', to: '2026-09-30', tz: PRAGUE };

interface SummedRide {
  started_at: Date | null;
  distance_m: number | null;
  duration_min: number | null;
  elevation_up_m: number | null;
  elevation_down_m: number | null;
}

// A ride as the figures read it.
function summed(startedAt: string | null, km: number, minutes: number, up = 0, down = 0): SummedRide {
  return {
    started_at: startedAt === null ? null : new Date(startedAt),
    distance_m: km * 1000,
    duration_min: minutes,
    elevation_up_m: up,
    elevation_down_m: down,
  };
}

// A ride as the page lists it.
function listed(id: number, startedAt: string | null): object {
  return {
    id,
    activity_strava_id: null,
    bike_id: 7,
    bikes: { bike_brand: 'Orbea', bike_model: 'Rallon', year: 2024 },
    started_at: startedAt === null ? null : new Date(startedAt),
    json_data: null,
    check_in: null,
  };
}

interface FindManyArgs {
  where: { started_at?: { gte?: Date; lt?: Date } };
  select?: object;
}

describe('RideService page of rides', () => {
  let service: RideService;

  const mockServiceTracking = { getWoreOff: jest.fn() };
  const mockPrisma = {
    rides: { findMany: jest.fn(), count: jest.fn() },
  };

  // The listed page, the rides inside the filter and those in the period before it.
  function rides(page: object[], inFilter: SummedRide[], before: SummedRide[] = []): void {
    mockPrisma.rides.count.mockResolvedValue(page.length);
    mockPrisma.rides.findMany.mockImplementation((args: FindManyArgs) => {
      if (args.select === undefined) return Promise.resolve(page);
      const gte = args.where.started_at?.gte;
      const isBefore = gte !== undefined && gte < new Date('2026-08-31T22:00:00.000Z');
      return Promise.resolve(isBefore ? before : inFilter);
    });
  }

  function listCall(): FindManyArgs {
    const calls = mockPrisma.rides.findMany.mock.calls as [FindManyArgs][];
    return calls.map(([args]) => args).find((args) => args.select === undefined) as FindManyArgs;
  }

  function sumCalls(): FindManyArgs[] {
    const calls = mockPrisma.rides.findMany.mock.calls as [FindManyArgs][];
    return calls.map(([args]) => args).filter((args) => args.select !== undefined);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockServiceTracking.getWoreOff.mockResolvedValue(new Map());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RideService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ServiceTrackingService, useValue: mockServiceTracking },
      ],
    }).compile();

    service = module.get<RideService>(RideService);
  });

  // Days are the rider's own: September in Prague starts at 22:00 UTC on 31 August.
  it('lists the rides started within the days asked for, in the rider time zone', async () => {
    rides([], []);

    await service.findPage(1, 20, 0, undefined, SEPTEMBER);

    expect(listCall().where.started_at).toEqual({
      gte: new Date('2026-08-31T22:00:00.000Z'),
      lt: new Date('2026-09-30T22:00:00.000Z'),
    });
    expect(mockPrisma.rides.count.mock.calls[0][0].where).toEqual(listCall().where);
  });

  // October starts in summer time and ends in winter time.
  it('ends a month on the rider midnight across a clock change', async () => {
    rides([], []);

    await service.findPage(1, 20, 0, undefined, { from: '2026-10-01', to: '2026-10-31', tz: PRAGUE });

    expect(listCall().where.started_at).toEqual({
      gte: new Date('2026-09-30T22:00:00.000Z'),
      lt: new Date('2026-10-31T23:00:00.000Z'),
    });
  });

  // A span that is not whole months is compared with as many days just before it.
  it('reads the previous period of a week as the week before', async () => {
    rides([], []);

    await service.findPage(1, 20, 0, undefined, { from: '2026-09-14', to: '2026-09-20', tz: 'UTC' });

    const starts = sumCalls().map((args) => args.where.started_at);
    expect(starts).toContainEqual({
      gte: new Date('2026-09-07T00:00:00.000Z'),
      lt: new Date('2026-09-14T00:00:00.000Z'),
    });
  });

  it('adds up the whole filter, not just the page, beside the previous month distance', async () => {
    rides(
      [listed(1, '2026-09-20T08:00:00.000Z')],
      [
        summed('2026-09-20T08:00:00.000Z', 40, 120, 800, 900),
        summed('2026-09-03T08:00:00.000Z', 30, 95, 400, 380),
      ],
      [summed('2026-08-10T08:00:00.000Z', 50, 150)],
    );

    const page = await service.findPage(1, 20, 0, undefined, SEPTEMBER);

    expect(page.figures).toEqual({
      count: 2,
      distance_m: 70000,
      time_min: 215,
      elevation_up_m: 1200,
      elevation_down_m: 1280,
      previous_distance_m: 50000,
    });
  });

  // September is compared with all of August, from 1 August Prague time.
  it('reads the previous period as the whole previous month', async () => {
    rides([], []);

    await service.findPage(1, 20, 0, 7, SEPTEMBER);

    expect(sumCalls().map((args) => args.where)).toContainEqual({
      user_id: 1,
      is_deleted: { not: true },
      bike_id: 7,
      started_at: { gte: new Date('2026-07-31T22:00:00.000Z'), lt: new Date('2026-08-31T22:00:00.000Z') },
    });
  });

  // A week split across pages repeats its header with the full total, so the page's weeks count every ride in them.
  it('totals each week on the page over all of its rides in the filter, newest week first', async () => {
    rides(
      [listed(1, '2026-09-22T16:00:00.000Z'), listed(2, '2026-09-14T08:00:00.000Z')],
      [
        summed('2026-09-22T16:00:00.000Z', 30, 90),
        // Monday 00:30 in Prague, still Sunday in UTC: it belongs to the Prague week.
        summed('2026-09-20T22:30:00.000Z', 20.5, 60),
        summed('2026-09-14T08:00:00.000Z', 10, 40),
        // Not on the page, and neither is its week.
        summed('2026-09-03T08:00:00.000Z', 50, 200),
      ],
    );

    const page = await service.findPage(1, 20, 0, undefined, SEPTEMBER);

    expect(page.weeks).toEqual([
      { start: '2026-09-21', count: 2, km: 50.5, time_min: 150 },
      { start: '2026-09-14', count: 1, km: 10, time_min: 40 },
    ]);
  });

  it('gives a ride without a start no week', async () => {
    rides([listed(1, null)], [summed(null, 12, 30)]);

    const page = await service.findPage(1, 20, 0, undefined, { tz: PRAGUE });

    expect(page.weeks).toEqual([]);
  });

  it('refuses an unknown time zone or a malformed day', async () => {
    rides([], []);

    await expect(service.findPage(1, 20, 0, undefined, { tz: 'Mars/Olympus' })).rejects.toThrow(BadRequestException);
    await expect(service.findPage(1, 20, 0, undefined, { from: '2026-02-30' })).rejects.toThrow(BadRequestException);
  });

  describe('findMonths', () => {
    it('lists the rider months with a ride, newest first, in their time zone', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        { started_at: new Date('2026-09-20T08:00:00.000Z') },
        // 1 September 00:30 in Prague, still August in UTC.
        { started_at: new Date('2026-08-31T22:30:00.000Z') },
        { started_at: new Date('2026-07-04T08:00:00.000Z') },
        { started_at: null },
      ]);

      const months = await service.findMonths(1, PRAGUE);

      expect(months).toEqual(['2026-09', '2026-07']);
      expect(mockPrisma.rides.findMany.mock.calls[0][0].where).toEqual({
        user_id: 1,
        is_deleted: { not: true },
        bikes: { is_deleted: { not: true } },
      });
    });
  });

  it('has no previous period when every ride is asked for', async () => {
    rides([], [summed('2026-09-20T08:00:00.000Z', 40, 120)]);

    const page = await service.findPage(1, 20, 0);

    expect(page.figures.previous_distance_m).toBeNull();
    expect(page.figures.distance_m).toBe(40000);
  });
});
