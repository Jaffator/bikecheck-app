import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';

const OWNER_ID = 7;
const TODAY = new Date('2026-09-25T10:00:00.000Z');

const RALLON = { id: 21, bike_brand: 'Orbea', bike_model: 'Rallon', year: 2024 };
const STUMPY = { id: 22, bike_brand: 'Specialized', bike_model: 'Stumpjumper', year: 2021 };

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

  const mockPrisma = {
    events_bikes: { findMany: jest.fn() },
    component_groups: { findMany: jest.fn() },
    users: { findUnique: jest.fn() },
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
});
