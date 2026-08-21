import { Test, TestingModule } from '@nestjs/testing';
import { BikeEventService } from './bike-event.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// The service freezes wear baselines against ride data, so every test here fixes
// both dates: when the work happened and how much was ridden after it.
const SERVICE_DATE = new Date('2026-07-01T00:00:00.000Z');
// Rides on the day of the work count as ridden by it, so the wear window opens at its end.
const WINDOW_START = new Date('2026-07-01T23:59:59.999Z');
const OWNER_ID = 7;
const BIKE_ID = 15;

describe('BikeEventService', () => {
  let service: BikeEventService;

  const mockTx = {
    events_bikes: { create: jest.fn() },
    event_actions_done: { create: jest.fn() },
    action_done_component_map: { create: jest.fn(), createMany: jest.fn() },
    components_mounted: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    bike_event_attachments: { createMany: jest.fn() },
    component_types: { findUnique: jest.fn() },
    rides: { aggregate: jest.fn() },
    bikes: { findFirst: jest.fn() },
  };

  const mockPrisma = {
    bikes: { findFirst: jest.fn() },
    events_bikes: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    component_groups: { findUnique: jest.fn() },
    events_action: { findMany: jest.fn() },
    rides: { aggregate: jest.fn() },
    $transaction: jest.fn(),
  };

  type RideSum = { distance_m?: number; duration_min?: number; drivetrain_meters?: number; suspension_min?: number };

  const aggregateResult = (sum: RideSum): { _sum: Record<string, number | null> } => ({
    _sum: {
      distance_m: sum.distance_m ?? null,
      duration_min: sum.duration_min ?? null,
      drivetrain_meters: sum.drivetrain_meters ?? null,
      suspension_min: sum.suspension_min ?? null,
    },
  });

  // The service asks rides two questions - what was ridden after the window opened, and
  // what the bike had ridden up to it - so the mock answers by which one it was asked.
  const rides = (after: RideSum, upTo: RideSum = {}): void => {
    const answer = (args: {
      where: { started_at?: { gt?: Date; lte?: Date } };
    }): { _sum: Record<string, number | null> } =>
      args.where.started_at?.gt !== undefined ? aggregateResult(after) : aggregateResult(upTo);
    mockTx.rides.aggregate.mockImplementation(answer);
  };

  // Rides ridden after the service date, in the shape prisma's aggregate returns.
  const ridesAfter = aggregateResult;

  const dto = (overrides: Partial<Create_BikeEventDto> = {}): Create_BikeEventDto =>
    ({
      bike_id: BIKE_ID,
      total_cost: 100,
      note: 'Service',
      service_date: SERVICE_DATE.toISOString(),
      actions_done: [],
      ...overrides,
    }) as Create_BikeEventDto;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BikeEventService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BikeEventService>(BikeEventService);

    // Caller owns the bike unless a test says otherwise.
    mockPrisma.bikes.findFirst.mockResolvedValue({
      id: BIKE_ID,
      user_id: OWNER_ID,
      total_km: 5000,
      total_time_min: 12000,
    });
    mockTx.bikes.findFirst.mockResolvedValue({ id: BIKE_ID, user_id: OWNER_ID, total_km: 5000, total_time_min: 12000 });
    mockTx.events_bikes.create.mockResolvedValue({ id: 99 });
    mockTx.event_actions_done.create.mockResolvedValue({ id: 500 });
    rides({});
    mockPrisma.rides.aggregate.mockResolvedValue(ridesAfter({}));
    mockPrisma.events_bikes.findFirst.mockResolvedValue({ id: 99 });
    mockPrisma.events_bikes.findUnique.mockResolvedValue({
      id: 99,
      bike_id: BIKE_ID,
      note: 'Service',
      total_cost: 100,
      service_date: SERVICE_DATE,
      created_at: SERVICE_DATE,
      updated_at: null,
      event_actions_done: [],
      bike_event_attachments: [],
      bikes: { user_id: OWNER_ID },
    });
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));
  });

  it('rewinds a baseline by the rides ridden after the service date', async () => {
    // ARRANGE: component sits at 1000 km today, 200 km of which came after the work.
    mockTx.components_mounted.findMany.mockResolvedValue([
      { id: 45, total_km: 1000, total_time_min: 3000, drivetrain_km: 900, suspension_min: 2000 },
    ]);
    rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

    // ACT
    await service.create(
      dto({
        actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [45] }],
      } as Partial<Create_BikeEventDto>),
      OWNER_ID,
    );

    // ASSERT: only the rides taken after the work count, deleted ones excluded.
    expect(mockTx.rides.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bike_id: BIKE_ID, is_deleted: { not: true }, started_at: { gt: WINDOW_START } },
      }),
    );

    // The baseline is the bike as it stood on the service date, not today.
    expect(mockTx.action_done_component_map.createMany).toHaveBeenCalledWith({
      data: [
        {
          event_action_done_id: 500,
          component_mounted_id: 45,
          km_at_time: 800,
          time_min_at_time: 2400,
          drivetrain_km_at_time: 750,
          suspension_min_at_time: 1600,
        },
      ],
    });
  });

  it('begins the replacement component at the service date, carrying the wear ridden since', async () => {
    // ARRANGE: fork fitted a month ago, 200 km ridden on it since.
    mockTx.components_mounted.findMany.mockResolvedValue([]);
    mockTx.components_mounted.create.mockResolvedValue({ id: 46 });
    mockTx.component_types.findUnique.mockResolvedValue({ component_type: 'Fork' });
    rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

    // ACT
    await service.create(
      dto({
        actions_replaced: [
          {
            old_component_mounted_id: 45,
            component_type_id: 21,
            new_component_desc: 'Fox 36 Factory',
            action_id: 2,
          },
        ],
      }),
      OWNER_ID,
    );

    // ASSERT: the old part stops being worn on the day it came off ...
    expect(mockTx.components_mounted.update).toHaveBeenCalledWith({
      where: { id: 45 },
      data: { is_active: false, removed_at: SERVICE_DATE },
    });

    // ... and the new one starts carrying what it genuinely rode since being fitted.
    expect(mockTx.components_mounted.create).toHaveBeenCalledWith({
      data: {
        bike_id: BIKE_ID,
        component_type_id: 21,
        component_desc: 'Fox 36 Factory',
        is_active: true,
        mounted_at: SERVICE_DATE,
        total_km: 200,
        total_time_min: 600,
        drivetrain_km: 150,
        suspension_min: 400,
      },
    });

    // Its baseline is zero: on the day it was fitted it had been ridden nowhere.
    expect(mockTx.action_done_component_map.create).toHaveBeenCalledWith({
      data: {
        event_action_done_id: 500,
        component_mounted_id: 46,
        km_at_time: 0,
        time_min_at_time: 0,
        drivetrain_km_at_time: 0,
        suspension_min_at_time: 0,
      },
    });
  });

  it("freezes today's accumulators when the work happened today", async () => {
    // ARRANGE: nothing was ridden after a service entered as it happened.
    mockTx.components_mounted.findMany.mockResolvedValue([
      { id: 45, total_km: 1000, total_time_min: 3000, drivetrain_km: 900, suspension_min: 2000 },
    ]);
    rides({});

    // ACT
    await service.create(
      dto({
        service_date: undefined,
        actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [45] }],
      }),
      OWNER_ID,
    );

    // ASSERT: the ordinary path is untouched by the rewind.
    expect(mockTx.action_done_component_map.createMany).toHaveBeenCalledWith({
      data: [
        {
          event_action_done_id: 500,
          component_mounted_id: 45,
          km_at_time: 1000,
          time_min_at_time: 3000,
          drivetrain_km_at_time: 900,
          suspension_min_at_time: 2000,
        },
      ],
    });
  });

  it('clamps a baseline at zero for a component mounted after the service date', async () => {
    // ARRANGE: the bike rode 200 km since the work, but this part only saw 50 of them.
    mockTx.components_mounted.findMany.mockResolvedValue([
      { id: 47, total_km: 50, total_time_min: 100, drivetrain_km: 40, suspension_min: 30 },
    ]);
    rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

    // ACT
    await service.create(
      dto({ actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [47] }] }),
      OWNER_ID,
    );

    // ASSERT: no negative wear.
    expect(mockTx.action_done_component_map.createMany).toHaveBeenCalledWith({
      data: [
        {
          event_action_done_id: 500,
          component_mounted_id: 47,
          km_at_time: 0,
          time_min_at_time: 0,
          drivetrain_km_at_time: 0,
          suspension_min_at_time: 0,
        },
      ],
    });
  });

  it('records the bike odometer as it stood on the service date', async () => {
    // ARRANGE: 5000 km of stated mileage, 300 km ridden up to the work, 200 km after it.
    mockTx.components_mounted.findMany.mockResolvedValue([]);
    rides({ distance_m: 200_000, duration_min: 600 }, { distance_m: 300_000, duration_min: 900 });

    // ACT
    await service.create(
      dto({ actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [] }] }),
      OWNER_ID,
    );

    // ASSERT: 5000 km of stated mileage plus the 300 km ridden up to that date.
    expect(mockTx.event_actions_done.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bike_km_at_time: 5300, bike_minutes_at_time: 12900 }),
      }),
    );
  });

  describe('ownership', () => {
    const STRANGER_ID = 99;

    beforeEach(() => {
      // The bike is not the caller's, so no row comes back for either lookup.
      mockPrisma.bikes.findFirst.mockResolvedValue(null);
      mockPrisma.events_bikes.findFirst.mockResolvedValue(null);
    });

    it("refuses to create a service on someone else's bike", async () => {
      await expect(service.create(dto(), STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to list the services of someone else's bike", async () => {
      await expect(service.findAllBikeEvents(BIKE_ID, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to read someone else's service", async () => {
      await expect(service.findById(99, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to soft delete someone else's service", async () => {
      await expect(service.softDelete(99, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to hard delete someone else's service", async () => {
      await expect(service.hardDelete(99, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to list the actions available on someone else's bike", async () => {
      await expect(service.actionsGroupComponents(1, BIKE_ID, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('history', () => {
    const historyRow = {
      id: 99,
      bike_id: BIKE_ID,
      service_date: SERVICE_DATE,
      created_at: SERVICE_DATE,
      total_cost: new Prisma.Decimal(350.5),
      bikes: { bikename: 'Trail bike', bike_brand: 'Santa Cruz', bike_model: 'Hightower' },
      event_actions_done: [
        { events_action: { action_name: 'Chain Replacement', i18n_key: 'action.chainReplacement' } },
        { events_action: { action_name: 'Brake bleed', i18n_key: 'action.bleed' } },
      ],
    };

    it('returns cards with a total, newest work first', async () => {
      // ARRANGE
      mockPrisma.events_bikes.findMany.mockResolvedValue([historyRow]);
      mockPrisma.events_bikes.count.mockResolvedValue(12);

      // ACT
      const result = await service.history(OWNER_ID, 3, 0);

      // ASSERT: everything a card renders, and the total it pages against.
      expect(result.total).toBe(12);
      expect(result.items).toEqual([
        {
          id: 99,
          bike_id: BIKE_ID,
          bike_name: 'Trail bike',
          service_date: SERVICE_DATE,
          action_count: 2,
          action_names: ['Chain Replacement', 'Brake bleed'],
          total_cost: 350.5,
        },
      ]);

      // Sorted by when the work happened, not when it was typed in.
      expect(mockPrisma.events_bikes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { service_date: { sort: 'desc', nulls: 'last' } },
          take: 3,
          skip: 0,
        }),
      );
    });

    it('falls back to a default page when no limit is asked for', async () => {
      // ARRANGE: an absent query parameter reaches the service as NaN.
      mockPrisma.events_bikes.findMany.mockResolvedValue([]);
      mockPrisma.events_bikes.count.mockResolvedValue(0);

      // ACT
      await service.history(OWNER_ID, Number.NaN, Number.NaN);

      // ASSERT: a page, not an empty one.
      expect(mockPrisma.events_bikes.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20, skip: 0 }));
    });

    it("refuses to page through someone else's bike", async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(null);

      await expect(service.history(OWNER_ID, Number.NaN, Number.NaN, 4711)).rejects.toThrow(ForbiddenException);
    });
  });

  it('subtracts nothing for a service dated today, whatever was ridden today', async () => {
    // ARRANGE: the wizard sends a day, so a service recorded this evening arrives as
    // midnight - with this morning's ride sitting after it.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    mockTx.components_mounted.findMany.mockResolvedValue([]);
    rides({});

    // ACT
    await service.create(dto({ service_date: today.toISOString(), actions_done: [] }), OWNER_ID);

    // ASSERT: the window opens after every hour of today, so no ride can fall inside it.
    const windowCall = mockTx.rides.aggregate.mock.calls.find(
      ([args]: [{ where: { started_at?: { gt?: Date } } }]) => args.where.started_at?.gt !== undefined,
    );
    const windowStart = (windowCall as [{ where: { started_at: { gt: Date } } }])[0].where.started_at.gt;
    expect(windowStart.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not seed suspension minutes onto a part that never sees them', async () => {
    // ARRANGE: a chain. Ride sync adds suspension minutes to forks and shocks only.
    mockTx.components_mounted.findMany.mockResolvedValue([]);
    mockTx.components_mounted.create.mockResolvedValue({ id: 46 });
    mockTx.component_types.findUnique.mockResolvedValue({ component_type: 'Chain' });
    rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

    // ACT
    await service.create(
      dto({
        actions_replaced: [
          {
            old_component_mounted_id: 45,
            component_type_id: 16,
            new_component_desc: 'Shimano XT Chain HG-701',
            action_id: 2,
          },
        ],
      }),
      OWNER_ID,
    );

    // ASSERT: distance and drivetrain carry over, suspension does not.
    expect(mockTx.components_mounted.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ total_km: 200, drivetrain_km: 150, suspension_min: 0 }),
      }),
    );
  });
});
