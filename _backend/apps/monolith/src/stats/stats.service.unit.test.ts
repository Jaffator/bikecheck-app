import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';

const OWNER_ID = 7;
const TODAY = new Date('2026-09-25T10:00:00.000Z');

const RALLON = { id: 21, bike_brand: 'Orbea', bike_model: 'Rallon', year: 2024 };
const STUMPY = { id: 22, bike_brand: 'Specialized', bike_model: 'Stumpjumper', year: 2021 };
const TREK = { id: 23, bike_brand: 'Trek', bike_model: null, year: null };

// The Component Categories as seeded, by id.
const DRIVETRAIN = 1;
const SUSPENSION = 2;
const BRAKES = 3;
const WHEELS = 4;
const GROUPS = [
  { id: DRIVETRAIN, group_name: 'Drivetrain', i18n_key: 'componentGroup.drivetrain' },
  { id: SUSPENSION, group_name: 'Suspension', i18n_key: 'componentGroup.suspension' },
  { id: BRAKES, group_name: 'Brakes', i18n_key: 'componentGroup.brakes' },
  { id: WHEELS, group_name: 'Wheels', i18n_key: 'componentGroup.wheels' },
];

type Row = Record<string, unknown>;

// One Action done, answering "which category?" through the part types it targets.
function action(group: number, partial: number | null = null): Row {
  return {
    partial_cost: partial === null ? null : new Prisma.Decimal(partial),
    events_action: {
      component_group_id: null,
      event_action_targets: [{ component_types: { component_group_id: group } }],
    },
  };
}

// One ride as the distance read loads it; the forecast reads the wear columns too.
function ride(bike: Row, startedAt: string, meters: number | null, wear: Row = {}): Row {
  return { bike_id: bike.id, started_at: new Date(startedAt), distance_m: meters, ...wear };
}

// A window's metres per day: zero everywhere but the days given, by index from its first day.
function days(length: number, ridden: Record<number, number>): number[] {
  return Array.from({ length }, (_, day) => ridden[day] ?? 0);
}

// One Tracked Action as Service Tracking hands it over: the figures behind its percentage and when its wear began.
function reading(
  bike: Row,
  wear: { measure?: string; current: number; interval: number; percentage: number; level?: string },
  wearBaselineAt: string | null = '2026-06-01T00:00:00.000Z',
  componentMountedId = 55,
): Row {
  return {
    action: {
      bike_id: bike.id,
      bike_brand: bike.bike_brand,
      bike_model: bike.bike_model,
      year: bike.year,
      component_mounted_id: componentMountedId,
      event_action_id: 101,
      component_type: 'Chain',
      measure: wear.measure ?? 'total_km',
      current: wear.current,
      interval: wear.interval,
      percentage: wear.percentage,
      level: wear.level ?? 'good',
    },
    wearBaselineAt: wearBaselineAt === null ? null : new Date(wearBaselineAt),
  };
}

// One Service as the spend read loads it; null is a Service with no Service Date.
function service(bike: Row, date: string | null, total: number | null, actions: Row[]): Row {
  return {
    bike_id: bike.id,
    service_date: date === null ? null : new Date(date),
    total_cost: total === null ? null : new Prisma.Decimal(total),
    bikes: bike,
    event_actions_done: actions,
  };
}

describe('StatsService', () => {
  let stats: StatsService;
  let services: Row[];
  let garage: Row[];
  let rides: Row[];
  let readings: Row[];

  const mockServiceTracking = { getGarageReadings: jest.fn() };

  const mockPrisma = {
    events_bikes: { findMany: jest.fn() },
    component_groups: { findMany: jest.fn() },
    users: { findUnique: jest.fn() },
    rides: { findMany: jest.fn() },
    bikes: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ServiceTrackingService, useValue: mockServiceTracking },
      ],
    }).compile();

    stats = module.get<StatsService>(StatsService);
    jest.useFakeTimers().setSystemTime(TODAY);

    services = [];
    // The database narrows by Service Date; the rest of the filter is asserted where it matters.
    mockPrisma.events_bikes.findMany.mockImplementation(
      ({ where }: { where: { service_date?: { gte?: Date; lt?: Date } } }) =>
        Promise.resolve(
          services.filter((row) => {
            const date = row.service_date as Date | null;
            const window = where.service_date;
            if (window === undefined) return true;
            // An undated Service falls in no bounded Period.
            return (
              date !== null &&
              (window.gte === undefined || date >= window.gte) &&
              (window.lt === undefined || date < window.lt)
            );
          }),
        ),
    );
    mockPrisma.component_groups.findMany.mockImplementation(({ where }: { where: { id: { in: number[] } } }) =>
      Promise.resolve(GROUPS.filter((group) => where.id.in.includes(group.id))),
    );
    mockPrisma.users.findUnique.mockResolvedValue({ currency: 'CZK' });

    garage = [];
    rides = [];
    // The database narrows by start time and leaves deleted rides and Archived Bikes out when asked to.
    const archived = (bikeId: unknown): boolean =>
      garage.some((bike) => bike.id === bikeId && bike.is_deleted === true);
    mockPrisma.bikes.findMany.mockImplementation(({ where }: { where: { is_deleted?: unknown } }) =>
      Promise.resolve(garage.filter((bike) => where.is_deleted === undefined || bike.is_deleted !== true)),
    );
    mockPrisma.rides.findMany.mockImplementation(
      ({
        where,
      }: {
        where: {
          is_deleted?: unknown;
          bike_id?: { in: number[] };
          started_at: { gte?: Date; lt?: Date };
          bikes?: { is_deleted?: unknown };
        };
      }) =>
        Promise.resolve(
          rides.filter((row) => {
            const date = row.started_at as Date | null;
            // Postgres compares nothing with a missing start, so an undated ride only answers an unbounded read.
            const inSpan =
              (where.started_at.gte === undefined || (date !== null && date >= where.started_at.gte)) &&
              (where.started_at.lt === undefined || (date !== null && date < where.started_at.lt));
            const deleted = where.is_deleted !== undefined && row.is_deleted === true;
            const onBikes = where.bike_id === undefined || where.bike_id.in.includes(row.bike_id as number);
            const archivedOut = where.bikes?.is_deleted !== undefined && archived(row.bike_id);
            return inSpan && !deleted && onBikes && !archivedOut;
          }),
        ),
    );

    readings = [];
    mockServiceTracking.getGarageReadings.mockImplementation(() => Promise.resolve(readings));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getSpend', () => {
    it('puts the whole total of a service whose work is all in one category into that category', async () => {
      // ARRANGE: chain and cassette replaced, one receipt, no price per action.
      services = [service(RALLON, '2026-05-10', 3000, [action(DRIVETRAIN), action(DRIVETRAIN)])];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT
      expect(result).toEqual({
        from: '2026-01-01',
        to: '2026-12-31',
        currency: 'CZK',
        total: 3000,
        categories: [
          {
            key: 'group:1',
            component_group_id: DRIVETRAIN,
            group_name: 'Drivetrain',
            i18n_key: 'componentGroup.drivetrain',
            amount: 3000,
          },
        ],
        bikes: [
          {
            bike_id: 21,
            bike_brand: 'Orbea',
            bike_model: 'Rallon',
            year: 2024,
            total: 3000,
            service_count: 1,
          },
        ],
      });
    });

    it('leaves a mixed service without prices wholly unassigned', async () => {
      // ARRANGE: fork service and a new chain on one receipt, nothing priced per action.
      services = [service(RALLON, '2026-05-10', 5000, [action(SUSPENSION), action(DRIVETRAIN)])];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT: nothing is guessed - the whole receipt is unassigned.
      expect(result.total).toBe(5000);
      expect(result.categories).toEqual([
        { key: 'unassigned', component_group_id: null, group_name: null, i18n_key: null, amount: 5000 },
      ]);
    });

    it('puts each priced action into its category and leaves the rest of the total unassigned', async () => {
      // ARRANGE: 2 400 for the fork, 900 for the chain, on a 4 000 receipt.
      services = [service(RALLON, '2026-05-10', 4000, [action(SUSPENSION, 2400), action(DRIVETRAIN, 900)])];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT
      expect(result.total).toBe(4000);
      expect(result.categories.map(({ key, amount }) => ({ key, amount }))).toEqual([
        { key: 'group:2', amount: 2400 },
        { key: 'group:1', amount: 900 },
        { key: 'unassigned', amount: 700 },
      ]);
    });

    it('scales prices that add up to more than the total, so the service still adds up to its total', async () => {
      // ARRANGE: 2 400 + 1 600 typed per action, but the receipt says 3 000.
      services = [service(RALLON, '2026-05-10', 3000, [action(SUSPENSION, 2400), action(DRIVETRAIN, 1600)])];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT: both shrink by a quarter, and nothing is left unassigned.
      expect(result.total).toBe(3000);
      expect(result.categories.map(({ key, amount }) => ({ key, amount }))).toEqual([
        { key: 'group:2', amount: 1800 },
        { key: 'group:1', amount: 1200 },
      ]);
    });

    it('scales to the cent, leaving no stray remainder unassigned', async () => {
      // ARRANGE: 2 990 + 700 typed on a 1 000 receipt - a ratio floats cannot hold exactly.
      services = [service(RALLON, '2026-05-10', 1000, [action(SUSPENSION, 2990), action(DRIVETRAIN, 700)])];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT
      expect(result.total).toBe(1000);
      expect(result.categories.map(({ key, amount }) => ({ key, amount }))).toEqual([
        { key: 'group:2', amount: 810.3 },
        { key: 'group:1', amount: 189.7 },
      ]);
    });

    it('puts the whole total of a one-category service into it, whatever its prices say', async () => {
      // ARRANGE: chain and cassette priced at 1 300 together on a 3 000 receipt.
      services = [service(RALLON, '2026-05-10', 3000, [action(DRIVETRAIN, 500), action(DRIVETRAIN, 800)])];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT
      expect(result.categories.map(({ key, amount }) => ({ key, amount }))).toEqual([{ key: 'group:1', amount: 3000 }]);
    });

    it('leaves a service with no actions wholly unassigned', async () => {
      // ARRANGE
      services = [service(RALLON, '2026-05-10', 700, [])];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT
      expect(result.categories.map(({ key, amount }) => ({ key, amount }))).toEqual([
        { key: 'unassigned', amount: 700 },
      ]);
    });

    it('puts a catch-all replacement into its own category', async () => {
      // ARRANGE: a catch-all Replacement targets no part type and names its category itself.
      const catchAll = { partial_cost: null, events_action: { component_group_id: WHEELS, event_action_targets: [] } };
      services = [service(RALLON, '2026-05-10', 1500, [catchAll])];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT
      expect(result.categories.map(({ key, amount }) => ({ key, amount }))).toEqual([{ key: 'group:4', amount: 1500 }]);
    });

    it('reads a service without a price as nothing spent, and leaves a bike that spent nothing out', async () => {
      // ARRANGE
      services = [
        service(RALLON, '2026-05-10', 1000, [action(BRAKES)]),
        service(STUMPY, '2026-06-01', null, [action(DRIVETRAIN)]),
      ];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT
      expect(result.total).toBe(1000);
      expect(result.bikes.map((bike) => bike.bike_id)).toEqual([RALLON.id]);
    });

    it('names the garage-wide top three, folds the rest into other, and ranks the bikes by what they spent', async () => {
      // ARRANGE: five categories and a large unassigned receipt across two bikes.
      services = [
        service(RALLON, '2026-02-01', 4000, [action(SUSPENSION)]),
        service(RALLON, '2026-03-01', 1000, [action(WHEELS)]),
        service(STUMPY, '2026-04-01', 3000, [action(DRIVETRAIN)]),
        service(STUMPY, '2026-05-01', 2000, [action(BRAKES)]),
        service(STUMPY, '2026-06-01', 9000, [action(SUSPENSION), action(DRIVETRAIN)]),
      ];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT: unassigned is the biggest slice but never one of the three.
      expect(result.total).toBe(19000);
      expect(result.categories.map(({ key, amount }) => ({ key, amount }))).toEqual([
        { key: 'group:2', amount: 4000 },
        { key: 'group:1', amount: 3000 },
        { key: 'group:3', amount: 2000 },
        { key: 'other', amount: 1000 },
        { key: 'unassigned', amount: 9000 },
      ]);
      // ASSERT: the bike that spent more comes first; how a bike splits is not served, colour tells bikes apart.
      expect(result.bikes).toEqual([
        {
          bike_id: STUMPY.id,
          bike_brand: 'Specialized',
          bike_model: 'Stumpjumper',
          year: 2021,
          total: 14000,
          service_count: 3,
        },
        { bike_id: RALLON.id, bike_brand: 'Orbea', bike_model: 'Rallon', year: 2024, total: 5000, service_count: 2 },
      ]);
    });

    it('serves last year while this year has nothing priced yet, and says which year it served', async () => {
      // ARRANGE: January - this year's only service carries no price.
      jest.setSystemTime(new Date('2026-01-12T10:00:00.000Z'));
      services = [
        service(RALLON, '2025-08-01', 2500, [action(BRAKES)]),
        service(RALLON, '2026-01-05', null, [action(BRAKES)]),
      ];

      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT
      expect([result.from, result.to]).toEqual(['2025-01-01', '2025-12-31']);
      expect(result.total).toBe(2500);
    });

    it('stays on this year when last year has nothing priced either', async () => {
      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT: an empty card for the current year, not an empty one for last year.
      expect(result).toEqual({
        from: '2026-01-01',
        to: '2026-12-31',
        currency: 'CZK',
        total: 0,
        categories: [],
        bikes: [],
      });
    });

    it('serves this month from its 1st, open-ended as the history reads it', async () => {
      // ARRANGE: 25 September.
      services = [
        service(RALLON, '2026-08-31', 900, [action(BRAKES)]),
        service(RALLON, '2026-09-01', 1200, [action(BRAKES)]),
        service(STUMPY, '2026-09-20', 800, [action(DRIVETRAIN)]),
      ];

      // ACT
      const result = await stats.getSpend(OWNER_ID, 'month');

      // ASSERT
      expect([result.from, result.to]).toEqual(['2026-09-01', null]);
      expect(result.total).toBe(2000);
    });

    it('serves the year from 1 January, with no fallback to last year', async () => {
      // ARRANGE: January, and only last year was priced.
      jest.setSystemTime(new Date('2026-01-12T10:00:00.000Z'));
      services = [service(RALLON, '2025-08-01', 2500, [action(BRAKES)])];

      // ACT
      const result = await stats.getSpend(OWNER_ID, 'year');

      // ASSERT
      expect([result.from, result.to]).toEqual(['2026-01-01', null]);
      expect(result.total).toBe(0);
    });

    it('counts only the Services dated in the year', async () => {
      // ARRANGE: 25 September; the last day of last year and an undated Service fall outside.
      services = [
        service(RALLON, '2025-12-31', 900, [action(BRAKES)]),
        service(RALLON, null, 700, [action(BRAKES)]),
        service(RALLON, '2026-01-01', 1200, [action(BRAKES)]),
        service(STUMPY, '2026-09-20', 800, [action(DRIVETRAIN)]),
      ];

      // ACT
      const result = await stats.getSpend(OWNER_ID, 'year');

      // ASSERT
      expect([result.from, result.to]).toEqual(['2026-01-01', null]);
      expect(result.total).toBe(2000);
    });

    it('serves all time with both ends open, counting every year and the undated Services', async () => {
      // ARRANGE
      services = [
        service(RALLON, '2019-05-01', 1000, [action(BRAKES)]),
        service(RALLON, null, 700, [action(DRIVETRAIN)]),
        service(STUMPY, '2026-09-20', 800, [action(DRIVETRAIN)]),
      ];

      // ACT
      const result = await stats.getSpend(OWNER_ID, 'all');

      // ASSERT
      expect([result.from, result.to]).toEqual([null, null]);
      expect(result.total).toBe(2500);
      expect(result.bikes.map(({ bike_id, total }) => ({ bike_id, total }))).toEqual([
        { bike_id: RALLON.id, total: 1700 },
        { bike_id: STUMPY.id, total: 800 },
      ]);
    });

    it('counts every Service of a bike, the free ones too, but lists no bike that spent nothing', async () => {
      // ARRANGE: Rallon paid once and was lubed for free; Stumpy was only lubed.
      services = [
        service(RALLON, '2026-05-01', 1200, [action(BRAKES)]),
        service(RALLON, '2026-06-01', null, [action(DRIVETRAIN)]),
        service(STUMPY, '2026-07-01', null, [action(DRIVETRAIN)]),
      ];

      // ACT
      const result = await stats.getSpend(OWNER_ID, 'year');

      // ASSERT
      expect(result.bikes.map(({ bike_id, service_count }) => ({ bike_id, service_count }))).toEqual([
        { bike_id: RALLON.id, service_count: 2 },
      ]);
    });

    it('rejects a period Home does not know', async () => {
      // ACT + ASSERT
      await expect(stats.getSpend(OWNER_ID, 'decade')).rejects.toThrow(BadRequestException);
    });

    it('counts what History Totals counts: no deleted services and no archived bikes', async () => {
      // ACT
      await stats.getSpend(OWNER_ID);

      // ASSERT: the same filter as History Totals over the calendar year (ADR 0024).
      expect(mockPrisma.events_bikes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_deleted: { not: true },
            bikes: { user_id: OWNER_ID, is_deleted: { not: true } },
            service_date: { gte: new Date(2026, 0, 1), lt: new Date(2027, 0, 1) },
          },
        }),
      );
    });
  });

  describe('getDistance', () => {
    beforeEach(() => {
      // Wednesday 28 January keeps each bike to 28 days.
      jest.setSystemTime(new Date('2026-01-28T10:00:00.000Z'));
      garage = [{ ...RALLON, is_deleted: false }];
    });

    it('serves metres per UTC day from 1 January to today, each ride on its own day', async () => {
      // ARRANGE
      rides = [
        // 23:30 UTC on 31 December - already 1 January in Prague, still last year here.
        ride(RALLON, '2025-12-31T23:30:00.000Z', 99000, { duration_min: 300 }),
        ride(RALLON, '2026-01-01T09:00:00.000Z', 12400, { duration_min: 45 }),
        ride(RALLON, '2026-01-11T06:00:00.000Z', 8000, { duration_min: 30 }),
        ride(RALLON, '2026-01-11T23:30:00.000Z', 30200, { duration_min: 95 }),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT: last year's ride is out, and the two rides of 11 January share its day.
      expect(result).toEqual({
        from: '2026-01-01',
        to: '2026-01-28',
        bikes: [
          {
            bike_id: 21,
            bike_brand: 'Orbea',
            bike_model: 'Rallon',
            year: 2024,
            color_index: 0,
            daily_m: days(28, { 0: 12400, 10: 38200 }),
            total_km: 51,
            ride_count: 3,
            time_min: 170,
          },
        ],
      });
    });

    it('adds up to exactly the metres ridden, with total_km that sum in whole km', async () => {
      // ARRANGE: 2 998 m that would read 4 km if each ride were rounded first.
      rides = [ride(RALLON, '2026-01-05T09:00:00.000Z', 1499), ride(RALLON, '2026-01-06T09:00:00.000Z', 1499)];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT
      const [bike] = result.bikes;
      expect(bike.daily_m.reduce((total, metres) => total + metres, 0)).toBe(2998);
      expect(bike.total_km).toBe(3);
    });

    it('puts a ride stamped after today on today', async () => {
      // ARRANGE
      rides = [ride(RALLON, '2026-02-03T09:00:00.000Z', 20000)];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT
      expect(result.bikes[0].daily_m).toEqual(days(28, { 27: 20000 }));
    });

    it("ranks a bike's colour among all the owner's bikes, so archiving one repaints nothing", async () => {
      // ARRANGE: the middle bike by id is archived, and was ridden this year.
      garage = [
        { ...RALLON, is_deleted: false },
        { ...STUMPY, is_deleted: true },
        { ...TREK, is_deleted: false },
      ];
      rides = [
        ride(RALLON, '2026-01-06T09:00:00.000Z', 20000),
        ride(STUMPY, '2026-01-07T09:00:00.000Z', 90000),
        ride(TREK, '2026-01-08T09:00:00.000Z', 30000),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT: the archived bike's rides are not counted, yet it still holds its colour slot.
      expect(result.bikes.map(({ bike_id, color_index, total_km }) => ({ bike_id, color_index, total_km }))).toEqual([
        { bike_id: TREK.id, color_index: 2, total_km: 30 },
        { bike_id: RALLON.id, color_index: 0, total_km: 20 },
      ]);
    });

    it('serves last year while this year has no ride yet, every day of it', async () => {
      // ARRANGE
      rides = [ride(RALLON, '2025-03-04T09:00:00.000Z', 40000), ride(RALLON, '2025-12-31T09:00:00.000Z', 10000)];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT: 4 March is day 62 of 2025, 31 December its 365th.
      expect([result.from, result.to]).toEqual(['2025-01-01', '2025-12-31']);
      expect(result.bikes[0].daily_m).toEqual(days(365, { 62: 40000, 364: 10000 }));
      expect(result.bikes[0].total_km).toBe(50);
    });

    it('serves every day of a leap year it falls back to', async () => {
      // ARRANGE
      jest.setSystemTime(new Date('2025-01-10T10:00:00.000Z'));
      rides = [ride(RALLON, '2024-12-31T12:00:00.000Z', 15000)];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT
      expect([result.from, result.to]).toEqual(['2024-01-01', '2024-12-31']);
      expect(result.bikes[0].daily_m).toEqual(days(366, { 365: 15000 }));
    });

    it('serves last year while this year has no ride long enough to draw', async () => {
      // ARRANGE: this year only a ride without a distance and one that rounds to 0 km.
      rides = [
        ride(RALLON, '2025-06-10T09:00:00.000Z', 40000),
        ride(RALLON, '2026-01-06T09:00:00.000Z', null),
        ride(RALLON, '2026-01-07T09:00:00.000Z', 300),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT
      expect(result.from).toBe('2025-01-01');
      expect(result.bikes.map(({ bike_id, total_km }) => ({ bike_id, total_km }))).toEqual([
        { bike_id: RALLON.id, total_km: 40 },
      ]);
    });

    it('stays on this year when last year has no ride either', async () => {
      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT: an empty card for the current year, not an empty one for last year.
      expect(result).toEqual({ from: '2026-01-01', to: '2026-01-28', bikes: [] });
    });

    it('counts no deleted ride', async () => {
      // ARRANGE
      rides = [
        ride(RALLON, '2026-01-06T09:00:00.000Z', 20000),
        { ...ride(RALLON, '2026-01-07T09:00:00.000Z', 50000), is_deleted: true },
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT
      expect(result.bikes[0].total_km).toBe(20);
    });

    it('serves this month from its 1st to today, leaving out the last day of the month before', async () => {
      // ARRANGE: Friday 25 September.
      jest.setSystemTime(TODAY);
      rides = [
        ride(RALLON, '2026-08-31T22:00:00.000Z', 40000, { duration_min: 120 }),
        ride(RALLON, '2026-09-01T07:00:00.000Z', 20000, { duration_min: 60 }),
        ride(RALLON, '2026-09-25T06:00:00.000Z', 15000, { duration_min: 50 }),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID, 'month');

      // ASSERT
      expect(result).toEqual({
        from: '2026-09-01',
        to: '2026-09-25',
        bikes: [
          {
            bike_id: 21,
            bike_brand: 'Orbea',
            bike_model: 'Rallon',
            year: 2024,
            color_index: 0,
            daily_m: days(25, { 0: 20000, 24: 15000 }),
            total_km: 35,
            ride_count: 2,
            time_min: 110,
          },
        ],
      });
    });

    it('serves the year from 1 January to today', async () => {
      // ARRANGE: 25 September is day 267 of 2026.
      jest.setSystemTime(TODAY);
      rides = [ride(RALLON, '2025-12-31T12:00:00.000Z', 40000), ride(RALLON, '2026-09-25T06:00:00.000Z', 15000)];

      // ACT
      const result = await stats.getDistance(OWNER_ID, 'year');

      // ASSERT
      expect([result.from, result.to]).toEqual(['2026-01-01', '2026-09-25']);
      expect(result.bikes[0].daily_m).toEqual(days(268, { 267: 15000 }));
    });

    it('stays on the year when asked for it, however empty January is', async () => {
      // ARRANGE: 28 January, and only last year was ridden.
      rides = [ride(RALLON, '2025-06-10T09:00:00.000Z', 40000)];

      // ACT
      const result = await stats.getDistance(OWNER_ID, 'year');

      // ASSERT
      expect(result).toEqual({ from: '2026-01-01', to: '2026-01-28', bikes: [] });
    });

    it("serves all time from the day of the garage's earliest dated ride to today", async () => {
      // ARRANGE: the archived bike and the undated ride are older, but neither is counted.
      garage = [
        { ...RALLON, is_deleted: false },
        { ...STUMPY, is_deleted: true },
      ];
      rides = [
        ride(STUMPY, '2023-05-01T09:00:00.000Z', 90000),
        { ...ride(RALLON, '2020-01-01T09:00:00.000Z', 70000), started_at: null },
        ride(RALLON, '2025-12-30T20:00:00.000Z', 10000),
        ride(RALLON, '2026-01-02T08:00:00.000Z', 5000),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID, 'all');

      // ASSERT: 30 December to 28 January is 30 days.
      expect([result.from, result.to]).toEqual(['2025-12-30', '2026-01-28']);
      expect(result.bikes.map(({ bike_id, daily_m, ride_count }) => ({ bike_id, daily_m, ride_count }))).toEqual([
        { bike_id: RALLON.id, daily_m: days(30, { 0: 10000, 3: 5000 }), ride_count: 2 },
      ]);
    });

    it('serves all time as today alone when nothing was ever ridden', async () => {
      // ACT
      const result = await stats.getDistance(OWNER_ID, 'all');

      // ASSERT
      expect(result).toEqual({ from: '2026-01-28', to: '2026-01-28', bikes: [] });
    });

    it("lists a bike ridden for time but no distance, and counts only the window's rides of garage bikes", async () => {
      // ARRANGE: the Stumpy's rides carry no distance worth a km; the Trek is archived.
      garage = [
        { ...RALLON, is_deleted: false },
        { ...STUMPY, is_deleted: false },
        { ...TREK, is_deleted: true },
      ];
      rides = [
        ride(RALLON, '2025-12-20T09:00:00.000Z', 30000, { duration_min: 90 }),
        ride(RALLON, '2026-01-06T09:00:00.000Z', 5000, { duration_min: 25 }),
        ride(STUMPY, '2026-01-07T09:00:00.000Z', null, { duration_min: 40 }),
        ride(STUMPY, '2026-01-08T09:00:00.000Z', 300, { duration_min: null }),
        ride(TREK, '2026-01-09T09:00:00.000Z', 20000, { duration_min: 60 }),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID, 'month');

      // ASSERT
      expect(
        result.bikes.map(({ bike_id, total_km, ride_count, time_min }) => ({
          bike_id,
          total_km,
          ride_count,
          time_min,
        })),
      ).toEqual([
        { bike_id: RALLON.id, total_km: 5, ride_count: 1, time_min: 25 },
        { bike_id: STUMPY.id, total_km: 0, ride_count: 2, time_min: 40 },
      ]);
    });

    it.each([
      ['this month', 'month'],
      ['the year', 'year'],
      ['all time', 'all'],
      ['no period', undefined],
    ])("adds each bike's days up to exactly its rides' metres over %s", async (_label, period) => {
      // ARRANGE: odd metres across both years and the month boundary.
      rides = [
        ride(RALLON, '2025-11-30T23:59:00.000Z', 1234),
        ride(RALLON, '2026-01-01T00:00:00.000Z', 1499),
        ride(RALLON, '2026-01-27T23:59:59.000Z', 2501),
        ride(RALLON, '2026-01-28T08:00:00.000Z', 3333),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID, period);

      // ASSERT: in January every Period but all time leaves out November's ride.
      const expected = period === 'all' ? 8567 : 7333;
      expect(result.bikes[0].daily_m.reduce((total, metres) => total + metres, 0)).toBe(expected);
    });

    it('counts every Service of a bike, the free ones too, but lists no bike that spent nothing', async () => {
      // ARRANGE: Rallon paid once and was lubed for free; Stumpy was only lubed.
      services = [
        service(RALLON, '2026-05-01', 1200, [action(BRAKES)]),
        service(RALLON, '2026-06-01', null, [action(DRIVETRAIN)]),
        service(STUMPY, '2026-07-01', null, [action(DRIVETRAIN)]),
      ];

      // ACT
      const result = await stats.getSpend(OWNER_ID, 'year');

      // ASSERT
      expect(result.bikes.map(({ bike_id, service_count }) => ({ bike_id, service_count }))).toEqual([
        { bike_id: RALLON.id, service_count: 2 },
      ]);
    });

    it('rejects a period Home does not know', async () => {
      // ACT + ASSERT
      await expect(stats.getDistance(OWNER_ID, 'week')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWearForecast', () => {
    const paceAndDate = (items: { pace_per_week: number | null; projected_date: string | null }[]): Row[] =>
      items.map(({ pace_per_week, projected_date }) => ({ pace_per_week, projected_date }));

    it("paces a part by its bike's last 4 weeks of rides and projects the day it reaches 100 %", async () => {
      // ARRANGE: 3 000 of 4 000 drivetrain km; 160 km in the last 28 days.
      readings = [reading(RALLON, { measure: 'drivetrain_km', current: 3000, interval: 4000, percentage: 75 })];
      rides = [
        // Before the 28 days, deleted, or on another bike: none of them sets the pace.
        ride(RALLON, '2026-08-20T09:00:00.000Z', 60000, { drivetrain_meters: 50000 }),
        ride(RALLON, '2026-09-10T09:00:00.000Z', 90000, { drivetrain_meters: 90000, is_deleted: true }),
        ride(STUMPY, '2026-09-21T09:00:00.000Z', 900000, { drivetrain_meters: 900000 }),
        ride(RALLON, '2026-09-01T09:00:00.000Z', 120000, { drivetrain_meters: 100000 }),
        ride(RALLON, '2026-09-20T09:00:00.000Z', 70000, { drivetrain_meters: 60000 }),
      ];

      // ACT
      const { items } = await stats.getWearForecast(OWNER_ID);

      // ASSERT: 160 km / 4 = 40 km a week; 1 000 km left is 25 weeks (175 days) after 25 September.
      expect(paceAndDate(items)).toEqual([{ pace_per_week: 40, projected_date: '2027-03-19' }]);
    });

    it('projects nothing for a bike not ridden in the last 4 weeks', async () => {
      // ARRANGE
      readings = [reading(RALLON, { current: 300, interval: 1000, percentage: 30 })];
      rides = [ride(RALLON, '2026-08-01T09:00:00.000Z', 50000)];

      // ACT
      const { items } = await stats.getWearForecast(OWNER_ID);

      // ASSERT
      expect(paceAndDate(items)).toEqual([{ pace_per_week: null, projected_date: null }]);
    });

    it('projects nothing for an overdue part, however fast it is ridden', async () => {
      // ARRANGE
      readings = [reading(RALLON, { current: 1200, interval: 1000, percentage: 120, level: 'overdue' })];
      rides = [ride(RALLON, '2026-09-20T09:00:00.000Z', 80000)];

      // ACT
      const { items } = await stats.getWearForecast(OWNER_ID);

      // ASSERT
      expect(paceAndDate(items)).toEqual([{ pace_per_week: 20, projected_date: null }]);
    });

    // 30, 20 and 10 units ridden after a baseline on Monday 7 September, read against 200.
    it.each([
      ['total_km', { distance_m: 30000 }, { distance_m: 20000 }, { distance_m: 10000 }],
      ['drivetrain_km', { drivetrain_meters: 30000 }, { drivetrain_meters: 20000 }, { drivetrain_meters: 10000 }],
      ['total_time_min', { duration_min: 30 }, { duration_min: 20 }, { duration_min: 10 }],
      ['suspension_min', { suspension_min: 30 }, { suspension_min: 20 }, { suspension_min: 10 }],
      ['health_index', { health_index_brake_pad: 30 }, { health_index_brake_pad: 20 }, { health_index_brake_pad: 10 }],
    ])('rebuilds the %s curve backwards from today, week end by week end', async (measure, first, second, third) => {
      // ARRANGE: every column is filled, so only the measure's own column may count.
      const noise = {
        distance_m: 99000,
        drivetrain_meters: 99000,
        duration_min: 99,
        suspension_min: 99,
        health_index_brake_pad: 99,
      };
      readings = [reading(RALLON, { measure, current: 60, interval: 200, percentage: 30 }, '2026-09-07T00:00:00.000Z')];
      rides = [
        ride(RALLON, '2026-09-10T09:00:00.000Z', null, { ...noise, ...first }),
        ride(RALLON, '2026-09-16T09:00:00.000Z', null, { ...noise, ...second }),
        ride(RALLON, '2026-09-24T09:00:00.000Z', null, { ...noise, ...third }),
      ];

      // ACT
      const { items } = await stats.getWearForecast(OWNER_ID);

      // ASSERT: 0 at the baseline, then 60 - 30 and 60 - 10 at the two Sundays, then today's reading.
      expect(items[0].points).toEqual([
        { date: '2026-09-07', percentage: 0 },
        { date: '2026-09-13', percentage: 15 },
        { date: '2026-09-20', percentage: 25 },
        { date: '2026-09-25', percentage: 30 },
      ]);
    });

    it('draws one point on the day of a baseline that falls on a Sunday', async () => {
      // ARRANGE: that Sunday also ends its week.
      readings = [reading(RALLON, { current: 60, interval: 200, percentage: 30 }, '2026-09-13T10:00:00.000Z')];
      rides = [ride(RALLON, '2026-09-13T15:00:00.000Z', 20000), ride(RALLON, '2026-09-16T09:00:00.000Z', 40000)];

      // ACT
      const { items } = await stats.getWearForecast(OWNER_ID);

      // ASSERT: the baseline point keeps the day, measured before the Sunday ride.
      expect(items[0].points).toEqual([
        { date: '2026-09-13', percentage: 0 },
        { date: '2026-09-20', percentage: 30 },
        { date: '2026-09-25', percentage: 30 },
      ]);
    });

    it('never draws the curve below 0 where the wear was corrected by hand', async () => {
      // ARRANGE: 60 km ridden since the baseline, but only 10 left on the part.
      readings = [reading(RALLON, { current: 10, interval: 200, percentage: 5 }, '2026-09-07T00:00:00.000Z')];
      rides = [
        ride(RALLON, '2026-09-10T09:00:00.000Z', 30000),
        ride(RALLON, '2026-09-16T09:00:00.000Z', 20000),
        ride(RALLON, '2026-09-24T09:00:00.000Z', 10000),
      ];

      // ACT
      const { items } = await stats.getWearForecast(OWNER_ID);

      // ASSERT
      expect(items[0].points.map((point) => point.percentage)).toEqual([0, 0, 0, 5]);
    });

    it('keeps the 5 that run out soonest: overdue first, then by date, those without a date last', async () => {
      // ARRANGE: the Rallon rides 10 km a week, the Stumpy not at all.
      readings = [
        reading(RALLON, { current: 500, interval: 1000, percentage: 50 }, undefined, 1),
        reading(STUMPY, { current: 950, interval: 1000, percentage: 95 }, undefined, 2),
        reading(RALLON, { current: 1050, interval: 1000, percentage: 105, level: 'overdue' }, undefined, 3),
        reading(RALLON, { current: 700, interval: 1000, percentage: 70 }, undefined, 4),
        reading(RALLON, { current: 900, interval: 1000, percentage: 90 }, undefined, 5),
        reading(RALLON, { current: 1200, interval: 1000, percentage: 120, level: 'overdue' }, undefined, 6),
        reading(RALLON, { current: 600, interval: 1000, percentage: 60 }, undefined, 7),
      ];
      rides = [ride(RALLON, '2026-09-20T09:00:00.000Z', 40000)];

      // ACT
      const { items } = await stats.getWearForecast(OWNER_ID);

      // ASSERT: 120 % and 105 % overdue, then 10, 30 and 40 weeks out; 50 weeks and no date are cut.
      expect(items.map((item) => [item.component_mounted_id, item.projected_date])).toEqual([
        [6, null],
        [3, null],
        [5, '2026-12-04'],
        [4, '2027-04-23'],
        [7, '2027-07-02'],
      ]);
    });
  });
});
