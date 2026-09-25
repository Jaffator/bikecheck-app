import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';

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

// One ride as the distance read loads it.
function ride(bike: Row, startedAt: string, meters: number | null): Row {
  return { bike_id: bike.id, started_at: new Date(startedAt), distance_m: meters };
}

// One Service as the spend read loads it.
function service(bike: Row, date: string, total: number | null, actions: Row[]): Row {
  return {
    bike_id: bike.id,
    service_date: new Date(date),
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

  const mockPrisma = {
    events_bikes: { findMany: jest.fn() },
    component_groups: { findMany: jest.fn() },
    users: { findUnique: jest.fn() },
    rides: { findMany: jest.fn() },
    bikes: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    stats = module.get<StatsService>(StatsService);
    jest.useFakeTimers().setSystemTime(TODAY);

    services = [];
    // The database narrows by Service Date; the rest of the filter is asserted where it matters.
    mockPrisma.events_bikes.findMany.mockImplementation(
      ({ where }: { where: { service_date?: { gte: Date; lt: Date } } }) =>
        Promise.resolve(
          services.filter((row) => {
            const date = row.service_date as Date;
            return where.service_date === undefined || (date >= where.service_date.gte && date < where.service_date.lt);
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
        where: { is_deleted?: unknown; started_at: { gte: Date; lt: Date }; bikes: { is_deleted?: unknown } };
      }) =>
        Promise.resolve(
          rides.filter((row) => {
            const date = row.started_at as Date;
            const inYear = date >= where.started_at.gte && date < where.started_at.lt;
            const deleted = where.is_deleted !== undefined && row.is_deleted === true;
            return inYear && !deleted && (where.bikes.is_deleted === undefined || !archived(row.bike_id));
          }),
        ),
    );
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
        year: 2026,
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
            segments: [{ key: 'group:1', amount: 3000 }],
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
      expect(result.bikes[0].segments).toEqual([{ key: 'unassigned', amount: 5000 }]);
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

    it('names the garage-wide top three, folds the rest into other, and cuts every bike the same way', async () => {
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
      // ASSERT: the bike that spent more comes first, and both carry every slice in the same order.
      expect(result.bikes.map(({ bike_id, total, segments }) => ({ bike_id, total, segments }))).toEqual([
        {
          bike_id: STUMPY.id,
          total: 14000,
          segments: [
            { key: 'group:2', amount: 0 },
            { key: 'group:1', amount: 3000 },
            { key: 'group:3', amount: 2000 },
            { key: 'other', amount: 0 },
            { key: 'unassigned', amount: 9000 },
          ],
        },
        {
          bike_id: RALLON.id,
          total: 5000,
          segments: [
            { key: 'group:2', amount: 4000 },
            { key: 'group:1', amount: 0 },
            { key: 'group:3', amount: 0 },
            { key: 'other', amount: 1000 },
            { key: 'unassigned', amount: 0 },
          ],
        },
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
      expect(result.year).toBe(2025);
      expect(result.total).toBe(2500);
    });

    it('stays on this year when last year has nothing priced either', async () => {
      // ACT
      const result = await stats.getSpend(OWNER_ID);

      // ASSERT: an empty card for the current year, not an empty one for last year.
      expect(result).toEqual({ year: 2026, currency: 'CZK', total: 0, categories: [], bikes: [] });
    });

    it('serves exactly the year asked for', async () => {
      // ARRANGE: last year has spend, the year asked for has none.
      services = [service(RALLON, '2025-08-01', 2500, [action(BRAKES)])];

      // ACT
      const result = await stats.getSpend(OWNER_ID, 2024);

      // ASSERT
      expect(result.year).toBe(2024);
      expect(result.total).toBe(0);
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
      // A Wednesday in late January keeps each line to five weeks.
      jest.setSystemTime(new Date('2026-01-28T10:00:00.000Z'));
      garage = [{ ...RALLON, is_deleted: false }];
    });

    it('buckets rides into Monday weeks in UTC and adds them up week by week', async () => {
      // ARRANGE: 1 January is a Thursday, so the first week starts on the last Monday of 2025.
      rides = [
        ride(RALLON, '2025-12-30T09:00:00.000Z', 99000),
        ride(RALLON, '2026-01-01T09:00:00.000Z', 12400),
        // Late on a Sunday in UTC - already Monday in Prague, still the week before here.
        ride(RALLON, '2026-01-11T23:30:00.000Z', 30200),
        ride(RALLON, '2026-01-12T06:00:00.000Z', 8000),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT: last year's ride is out; values rise and stop at the current week.
      expect(result).toEqual({
        year: 2026,
        weeks: ['2025-12-29', '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'],
        bikes: [
          {
            bike_id: 21,
            bike_brand: 'Orbea',
            bike_model: 'Rallon',
            year: 2024,
            color_index: 0,
            cumulative_km: [12, 43, 51, 51, 51],
            total_km: 51,
          },
        ],
      });
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

      // ASSERT: the archived bike has no line, yet still holds its colour slot.
      expect(result.bikes.map(({ bike_id, color_index, total_km }) => ({ bike_id, color_index, total_km }))).toEqual([
        { bike_id: TREK.id, color_index: 2, total_km: 30 },
        { bike_id: RALLON.id, color_index: 0, total_km: 20 },
      ]);
    });

    it('serves last year while this year has no ride yet, with weeks running to its last week', async () => {
      // ARRANGE
      rides = [ride(RALLON, '2025-03-04T09:00:00.000Z', 40000), ride(RALLON, '2025-12-31T09:00:00.000Z', 10000)];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT: 1 January 2025 was a Wednesday and 31 December too - 53 Monday weeks.
      expect(result.year).toBe(2025);
      expect(result.weeks).toHaveLength(53);
      expect(result.weeks[0]).toBe('2024-12-30');
      expect(result.weeks[52]).toBe('2025-12-29');
      expect(result.bikes[0].cumulative_km[8]).toBe(0);
      expect(result.bikes[0].cumulative_km[9]).toBe(40);
      expect(result.bikes[0].cumulative_km[52]).toBe(50);
      expect(result.bikes[0].total_km).toBe(50);
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
      expect(result.year).toBe(2025);
      expect(result.bikes.map(({ bike_id, total_km }) => ({ bike_id, total_km }))).toEqual([
        { bike_id: RALLON.id, total_km: 40 },
      ]);
    });

    it('stays on this year when last year has no ride either', async () => {
      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT: an empty card for the current year, not an empty one for last year.
      expect(result).toEqual({
        year: 2026,
        weeks: ['2025-12-29', '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'],
        bikes: [],
      });
    });

    it('serves exactly the year asked for', async () => {
      // ARRANGE: last year has rides, the year asked for has none.
      rides = [ride(RALLON, '2025-03-04T09:00:00.000Z', 40000)];

      // ACT
      const result = await stats.getDistance(OWNER_ID, 2024);

      // ASSERT
      expect(result.year).toBe(2024);
      expect(result.bikes).toEqual([]);
    });

    it('leaves out a bike that rode no distance this year', async () => {
      // ARRANGE: a ride without a distance, and one short enough to round to nothing.
      garage = [
        { ...RALLON, is_deleted: false },
        { ...STUMPY, is_deleted: false },
      ];
      rides = [
        ride(RALLON, '2026-01-06T09:00:00.000Z', 5000),
        ride(STUMPY, '2026-01-07T09:00:00.000Z', null),
        ride(STUMPY, '2026-01-08T09:00:00.000Z', 300),
      ];

      // ACT
      const result = await stats.getDistance(OWNER_ID);

      // ASSERT
      expect(result.bikes.map((bike) => bike.bike_id)).toEqual([RALLON.id]);
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
  });
});
