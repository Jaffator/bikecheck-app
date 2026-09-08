import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServiceTrackingService } from './service-tracking.service';
import { PrismaService } from '../../prisma/prisma.service';

const OWNER_ID = 7;
const BIKE_ID = 21;

// The kinds of part the fixtures build on. A Chain carries its own drivetrain reading, a
// Fork its own suspension reading, a Brake pad a wear index, and a Tyre none of the three.
const CHAIN_TYPE = 12;
const FORK_TYPE = 13;
const PAD_TYPE = 14;
const TYRE_TYPE = 15;

// The actions the bike keeps intervals for, one per axis.
const CHAIN_REPLACEMENT = 101;
const FORK_SERVICE = 102;
const PADS_REPLACEMENT = 103;
const TYRE_REPLACEMENT = 104;

// One Mounted Component as the read loads it: the part, the kind of part it is, its
// accumulators, the work recorded against it and any state it has of its own.
function mountedPart(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 55,
    bike_id: BIKE_ID,
    component_type_id: CHAIN_TYPE,
    component_desc: 'Shimano XT M8100',
    position: null,
    is_active: true,
    is_deleted: false,
    total_km: 0,
    total_time_min: 0,
    drivetrain_km: 0,
    suspension_min: 0,
    health_index: 0,
    component_types: typeRow(CHAIN_TYPE),
    action_done_component_map: [],
    tracked_action_state: [],
    ...overrides,
  };
}

function typeRow(componentTypeId: number): Record<string, unknown> {
  const names: Record<number, string> = {
    [CHAIN_TYPE]: 'Chain',
    [FORK_TYPE]: 'Fork',
    [PAD_TYPE]: 'Brake pad',
    [TYRE_TYPE]: 'Tyre',
  };
  return { component_type: names[componentTypeId], i18n_key: null };
}

// The bike's own plan for one action: how much wear may pass, and which parts it applies to.
function intervalRow(
  actionId: number,
  axes: { km?: number; min?: number; healthIndex?: number },
  targets: number[],
): Record<string, unknown> {
  return {
    id: actionId,
    bike_id: BIKE_ID,
    event_actions_id: actionId,
    service_interval_km: axes.km ?? null,
    service_interval_min: axes.min ?? null,
    health_index_interval: axes.healthIndex ?? null,
    events_action: {
      id: actionId,
      action_name: `Action ${String(actionId)}`,
      i18n_key: null,
      event_action_targets: targets.map((component_type_id) => ({ component_type_id })),
    },
  };
}

// A recorded occasion that froze the part's accumulators for one action - the Wear
// Baseline everything since is measured against.
function baseline(
  actionId: number,
  frozen: { km?: number; timeMin?: number; drivetrainKm?: number; suspensionMin?: number },
  serviceDate = '2025-01-01T00:00:00.000Z',
  isDeleted = false,
): Record<string, unknown> {
  return {
    km_at_time: frozen.km ?? null,
    time_min_at_time: frozen.timeMin ?? null,
    drivetrain_km_at_time: frozen.drivetrainKm ?? null,
    suspension_min_at_time: frozen.suspensionMin ?? null,
    event_actions_done: {
      event_action_id: actionId,
      events_bikes: { service_date: new Date(serviceDate), is_deleted: isDeleted },
    },
  };
}

// An Extension in force on one Tracked Action, which lengthens its interval.
function stateRow(
  actionId: number,
  extension: { km?: number; min?: number; healthIndex?: number },
): Record<string, unknown> {
  return {
    event_actions_id: actionId,
    extended_by_km: extension.km ?? 0,
    extended_by_min: extension.min ?? 0,
    extended_by_healthIndex: extension.healthIndex ?? 0,
  };
}

// The two filters the read puts on the parts it loads. Applied here rather than asserted
// on, so "a dismounted part produces nothing" is exercised as behaviour.
function applyWhere(
  rows: Record<string, unknown>[],
  where: { is_active?: unknown; is_deleted?: unknown } = {},
): Record<string, unknown>[] {
  return rows.filter((row) => {
    if (where.is_active === true && row.is_active !== true) return false;
    if (typeof where.is_deleted === 'object' && row.is_deleted === true) return false;
    return true;
  });
}

describe('ServiceTrackingService', () => {
  let service: ServiceTrackingService;

  const mockPrismaService = {
    bikes: { findFirst: jest.fn() },
    bike_service_interval: { findMany: jest.fn() },
    components_mounted: { findMany: jest.fn() },
  };

  // The bike, its plan and its parts - the three reads every case sets up.
  function garage(intervals: Record<string, unknown>[], parts: Record<string, unknown>[]): void {
    mockPrismaService.bike_service_interval.findMany.mockResolvedValue(intervals);
    mockPrismaService.components_mounted.findMany.mockImplementation(
      ({ where }: { where?: { is_active?: unknown; is_deleted?: unknown } }) =>
        Promise.resolve(applyWhere(parts, where)),
    );
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceTrackingService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ServiceTrackingService>(ServiceTrackingService);

    // The owner's own bike, in use, unless a test says otherwise.
    mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID, is_deleted: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBikeTrackedActions', () => {
    // A part nobody has serviced measures from zero, so the mileage entered when a used
    // part was added counts as wear the owner has to answer for.
    it('measures a part with no recorded Service from zero', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 3200 })]);

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.current).toBe(3200);
      expect(action.interval).toBe(4000);
      expect(action.percentage).toBe(80);
    });

    // Once the job has been recorded the reading starts again from what it froze, so
    // finished work stops nagging.
    it('measures a serviced part from its Wear Baseline', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 5000,
            action_done_component_map: [baseline(CHAIN_REPLACEMENT, { drivetrainKm: 4000 })],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.current).toBe(1000);
      expect(action.percentage).toBe(25);
    });

    // A baseline frozen by one action says nothing about another one.
    it('ignores a baseline frozen by a different action', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 5000,
            action_done_component_map: [baseline(TYRE_REPLACEMENT, { drivetrainKm: 4000 })],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.current).toBe(5000);
    });

    // The most recent time the job was done is the one that counts.
    it('measures from the most recent Service of that action', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 5000,
            action_done_component_map: [
              baseline(CHAIN_REPLACEMENT, { drivetrainKm: 1000 }, '2024-01-01T00:00:00.000Z'),
              baseline(CHAIN_REPLACEMENT, { drivetrainKm: 4500 }, '2025-06-01T00:00:00.000Z'),
            ],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.current).toBe(500);
    });

    // A deleted Service is no longer part of the record, so it no longer holds a baseline
    // either - the same rule the build reads a part's last service by.
    it('ignores a baseline frozen by a deleted Service', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 5000,
            action_done_component_map: [
              baseline(CHAIN_REPLACEMENT, { drivetrainKm: 4000 }, '2025-01-01T00:00:00.000Z', true),
            ],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.current).toBe(5000);
    });

    // Each axis reads the accumulator that actually grows for that kind of part: a chain
    // wears by the kilometres it drove, a fork by the minutes it worked.
    it('reads a drivetrain part in kilometres', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE])],
        [mountedPart({ total_km: 9000, drivetrain_km: 500 })],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.axis).toBe('km');
      expect(action.current).toBe(500);
      expect(action.percentage).toBe(50);
    });

    it('reads a suspension part in minutes', async () => {
      garage(
        [intervalRow(FORK_SERVICE, { min: 3000 }, [FORK_TYPE])],
        [
          mountedPart({
            id: 56,
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            total_time_min: 9000,
            suspension_min: 1500,
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.axis).toBe('min');
      expect(action.current).toBe(1500);
      expect(action.percentage).toBe(50);
    });

    it('reads a part with a wear index on the health index', async () => {
      garage(
        [intervalRow(PADS_REPLACEMENT, { healthIndex: 50000 }, [PAD_TYPE])],
        [
          mountedPart({
            id: 57,
            component_type_id: PAD_TYPE,
            component_types: typeRow(PAD_TYPE),
            health_index: 40000,
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.axis).toBe('health_index');
      expect(action.current).toBe(40000);
      expect(action.percentage).toBe(80);
    });

    // A part with no accumulator of its own is measured on the bike's own totals.
    it('reads a part without its own accumulator on the total kilometres', async () => {
      garage(
        [intervalRow(TYRE_REPLACEMENT, { km: 2000 }, [TYRE_TYPE])],
        [
          mountedPart({
            id: 58,
            component_type_id: TYRE_TYPE,
            component_types: typeRow(TYRE_TYPE),
            total_km: 1000,
            drivetrain_km: 0,
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.axis).toBe('km');
      expect(action.current).toBe(1000);
      expect(action.percentage).toBe(50);
    });

    // An interval that names more than one axis is answered by whichever is furthest
    // along: the part is due when the first of its measures says so.
    it('takes the highest percentage when an interval sets more than one axis', async () => {
      garage(
        [intervalRow(FORK_SERVICE, { km: 4000, min: 3000 }, [FORK_TYPE])],
        [
          mountedPart({
            id: 56,
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            total_km: 1000,
            suspension_min: 2700,
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.axis).toBe('min');
      expect(action.percentage).toBe(90);
    });

    // Never capped: "just due" and "2 000 km overdue" have to read differently.
    it('reports a percentage above 100 as it is', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 1320 })]);

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.percentage).toBe(132);
      expect(action.level).toBe('overdue');
    });

    // An Extension lengthens the interval it is measured against, which is what drops the
    // percentage when an overdue action is put off.
    it('measures against the interval an Extension has lengthened', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 1000,
            tracked_action_state: [stateRow(CHAIN_REPLACEMENT, { km: 100 })],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.interval).toBe(1100);
      expect(action.percentage).toBe(90);
      expect(action.extended).toBe(true);
    });

    // The band boundaries, which are the whole of the colour rule. Each edge is hit exactly
    // and then missed by one kilometre, so a reading can never band as due before it is.
    it.each([
      [7900, 'good', 79],
      [7999, 'good', 79],
      [8000, 'warning', 80],
      [9400, 'warning', 94],
      [9499, 'warning', 94],
      [9500, 'critical', 95],
      [9900, 'critical', 99],
      [9999, 'critical', 99],
      [10000, 'overdue', 100],
    ])('reads %i km against 10 000 as %s', async (km, level, percentage) => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 10000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: km })]);

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.percentage).toBe(percentage);
      expect(action.level).toBe(level);
    });

    // A percentage the bike has no plan for cannot be shown, so the pairing is not a
    // Tracked Action at all.
    it('yields nothing for an action the bike keeps no Service Interval for', async () => {
      garage([], [mountedPart({ drivetrain_km: 3200 })]);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    // An action targets the kinds of part it applies to; a chain job says nothing about a
    // fork.
    it('yields nothing for an action that does not target the part', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            id: 56,
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            total_km: 3200,
          }),
        ],
      );

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    // A bike put away stays put away.
    it('yields nothing for an Archived Bike', async () => {
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID, is_deleted: true });
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 3200 })]);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    // A bike is only reachable through its owner, and an unknown one leaks nothing.
    it('refuses a bike the caller does not own', async () => {
      mockPrismaService.bikes.findFirst.mockResolvedValue(null);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
    });

    // The list matches what is actually on the bike.
    it('yields nothing for a part that has been taken off', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 3200, is_active: false })],
      );

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    it('yields nothing for a part that has been deleted', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 3200, is_deleted: true })],
      );

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    // A fresh rear tyre must not hide behind a worn front one.
    it('reads two parts of the same type as two Tracked Actions', async () => {
      garage(
        [intervalRow(TYRE_REPLACEMENT, { km: 2000 }, [TYRE_TYPE])],
        [
          mountedPart({
            id: 60,
            component_type_id: TYRE_TYPE,
            component_types: typeRow(TYRE_TYPE),
            position: 'front',
            total_km: 1800,
          }),
          mountedPart({
            id: 61,
            component_type_id: TYRE_TYPE,
            component_types: typeRow(TYRE_TYPE),
            position: 'rear',
            total_km: 200,
          }),
        ],
      );

      const actions = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(actions).toHaveLength(2);
      expect(actions.map((action) => [action.component_mounted_id, action.percentage])).toEqual([
        [60, 90],
        [61, 10],
      ]);
    });

    // One part can owe more than one job, and each is read on its own.
    it('reads one part against every action the bike plans for it', async () => {
      garage(
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE]),
          intervalRow(TYRE_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE]),
        ],
        [mountedPart({ drivetrain_km: 800 })],
      );

      const actions = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(actions.map((action) => action.event_action_id)).toEqual([TYRE_REPLACEMENT, CHAIN_REPLACEMENT]);
    });

    // The page leads with what needs doing first.
    it('sorts worst first', async () => {
      garage(
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE]),
          intervalRow(FORK_SERVICE, { min: 3000 }, [FORK_TYPE]),
        ],
        [
          mountedPart({ drivetrain_km: 200 }),
          mountedPart({
            id: 56,
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            suspension_min: 3300,
          }),
        ],
      );

      const actions = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(actions.map((action) => action.percentage)).toEqual([110, 20]);
    });

    // What the row has to carry to be read without opening anything else.
    it('names the part and the action on every reading', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 3200 })]);

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action).toMatchObject({
        bike_id: BIKE_ID,
        component_mounted_id: 55,
        component_type: 'Chain',
        component_desc: 'Shimano XT M8100',
        event_action_id: CHAIN_REPLACEMENT,
        action_name: `Action ${String(CHAIN_REPLACEMENT)}`,
        level: 'warning',
        extended: false,
      });
    });

    // An interval set to zero cannot say how far along anything is, so it says nothing
    // rather than dividing by it.
    it('yields nothing for an interval of zero', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 0 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 3200 })]);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    // A baseline above the accumulator is a corrected part, not negative wear.
    it('never reads below zero', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 100,
            action_done_component_map: [baseline(CHAIN_REPLACEMENT, { drivetrainKm: 900 })],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.current).toBe(0);
      expect(action.percentage).toBe(0);
      expect(action.level).toBe('good');
    });
  });
});
