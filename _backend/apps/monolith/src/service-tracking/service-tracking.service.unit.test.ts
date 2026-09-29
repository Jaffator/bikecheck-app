import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServiceTrackingService } from './service-tracking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import type { Response_WoreOffLineDto } from './dto/response-wore-off-line';
import type { WearRide } from './ride-wear';

const OWNER_ID = 7;
const BIKE_ID = 21;
const OTHER_BIKE_ID = 22;

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
    mounted_at: new Date('2025-01-01T00:00:00.000Z'),
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

// The Component Category each kind of part sits in.
const GROUP_ID = 2;

function typeRow(componentTypeId: number): Record<string, unknown> {
  const names: Record<number, string> = {
    [CHAIN_TYPE]: 'Chain',
    [FORK_TYPE]: 'Fork',
    [PAD_TYPE]: 'Brake pad',
    [TYRE_TYPE]: 'Tyre',
  };
  return { component_type: names[componentTypeId], i18n_key: null, component_group_id: GROUP_ID };
}

// The bike's own plan for one action: how much wear may pass, and which parts it applies to.
function intervalRow(
  actionId: number,
  axes: { km?: number; min?: number; healthIndex?: number },
  targets: number[],
  bikeId = BIKE_ID,
  // Whether recording this job replaces the part, which is what names the drawer's button.
  replaceAction = false,
): Record<string, unknown> {
  return {
    id: actionId,
    bike_id: bikeId,
    event_actions_id: actionId,
    service_interval_km: axes.km ?? null,
    service_interval_min: axes.min ?? null,
    health_index_interval: axes.healthIndex ?? null,
    events_action: {
      id: actionId,
      action_name: `Action ${String(actionId)}`,
      i18n_key: null,
      replace_action: replaceAction,
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
  // When the occasion entered the record, which is what breaks a tie between two recorded
  // on one day. Defaults to the date on it, which is what a recording made on the day it
  // happened looks like once the time is dropped.
  recordedAt = serviceDate,
): Record<string, unknown> {
  return {
    km_at_time: frozen.km ?? null,
    time_min_at_time: frozen.timeMin ?? null,
    drivetrain_km_at_time: frozen.drivetrainKm ?? null,
    suspension_min_at_time: frozen.suspensionMin ?? null,
    event_actions_done: {
      event_action_id: actionId,
      events_bikes: {
        service_date: new Date(serviceDate),
        created_at: new Date(recordedAt),
        is_deleted: isDeleted,
      },
    },
  };
}

// What the owner set on one pairing; a plan is its day (YYYY-MM-DD) and when it was set.
interface Settings {
  intervalOverride?: number | null;
  notify?: boolean;
  plannedFor?: string | null;
  plannedAt?: string | null;
}

// The state of one Tracked Action: the band that has already been announced for it, and
// what the owner set - their own Service Interval, their mute and their plan.
function stateRow(
  actionId: number,
  reachedThreshold = 0,
  // No interval of their own, announcements on and no plan, unless said.
  settings: Settings = {},
): Record<string, unknown> {
  return {
    event_actions_id: actionId,
    reached_threshold: reachedThreshold,
    interval_override: settings.intervalOverride ?? null,
    notify: settings.notify ?? true,
    // A DATE column comes back as midnight UTC.
    planned_for: settings.plannedFor == null ? null : new Date(`${settings.plannedFor}T00:00:00.000Z`),
    planned_at: settings.plannedAt == null ? null : new Date(settings.plannedAt),
  };
}

// A pairing carrying nothing but a setting: nothing announced.
function settingRow(actionId: number, settings: Settings): Record<string, unknown> {
  return stateRow(actionId, 0, settings);
}

// What a read hands the mock: the filters it puts on the rows it loads.
interface WhereArg {
  is_active?: unknown;
  is_deleted?: unknown;
  bike_id?: unknown;
}

// The two filters the read puts on the parts it loads. Applied here rather than asserted
// on, so "a dismounted part produces nothing" is exercised as behaviour.
function applyWhere(
  rows: Record<string, unknown>[],
  where: { is_active?: unknown; is_deleted?: unknown; bike_id?: unknown } = {},
): Record<string, unknown>[] {
  return rows.filter((row) => {
    if (where.is_active === true && row.is_active !== true) return false;
    if (typeof where.is_deleted === 'object' && row.is_deleted === true) return false;
    if (!onBike(row.bike_id, where.bike_id)) return false;
    return true;
  });
}

// The read asks for one bike by id, or for the whole garage at once.
function onBike(bikeId: unknown, filter: unknown): boolean {
  if (filter === undefined) return true;
  if (typeof filter === 'number') return bikeId === filter;
  return ((filter as { in?: number[] }).in ?? []).includes(bikeId as number);
}

// One bike as the garage read loads it, named well enough for a row to say where it belongs.
function bikeRow(id: number, brand: string, isDeleted = false): Record<string, unknown> {
  return { id, bike_brand: brand, bike_model: 'Hightower', year: 2022, is_deleted: isDeleted };
}

// One ride on the bike with the wear it carries; nothing unless said.
function rideRow(
  id: number,
  startedAt: string | null,
  wear: {
    distanceM?: number;
    drivetrainM?: number;
    durationMin?: number;
    suspensionMin?: number;
    padIndex?: number;
    descentMin?: number | null;
    bikeId?: number;
    isDeleted?: boolean;
  } = {},
): Record<string, unknown> {
  return {
    id,
    bike_id: wear.bikeId ?? BIKE_ID,
    started_at: startedAt === null ? null : new Date(startedAt),
    distance_m: wear.distanceM ?? 0,
    drivetrain_meters: wear.drivetrainM ?? 0,
    duration_min: wear.durationMin ?? 0,
    suspension_min: wear.suspensionMin ?? 0,
    health_index_brake_pad: wear.padIndex ?? 0,
    // A ride imported before descent time was kept has none.
    descent_min: wear.descentMin ?? null,
    is_deleted: wear.isDeleted ?? false,
  };
}

// What a rides read hands the mock, answered the way the database would answer it.
interface RideWhere {
  is_deleted?: unknown;
  bike_id?: unknown;
  started_at?: { gt?: Date; gte?: Date };
  descent_min?: { not: null };
  OR?: RideWhere[];
}

function matchesRide(row: Record<string, unknown>, where: RideWhere = {}): boolean {
  if (where.OR !== undefined && !where.OR.some((clause) => matchesRide(row, clause))) return false;
  if (typeof where.is_deleted === 'object' && row.is_deleted === true) return false;
  if (where.descent_min !== undefined && row.descent_min === null) return false;
  if (!onBike(row.bike_id, where.bike_id)) return false;
  return withinStart(row.started_at as Date | null, where.started_at);
}

// Postgres compares nothing with a missing start, so an undated ride only answers an unbounded read.
function withinStart(start: Date | null, window: RideWhere['started_at']): boolean {
  if (window === undefined) return true;
  if (start === null) return false;
  return (window.gt === undefined || start > window.gt) && (window.gte === undefined || start >= window.gte);
}

describe('ServiceTrackingService', () => {
  let service: ServiceTrackingService;

  const mockPrismaService = {
    bikes: { findFirst: jest.fn(), findMany: jest.fn() },
    bike_service_interval: { findMany: jest.fn() },
    components_mounted: { findMany: jest.fn() },
    tracked_action_state: { upsert: jest.fn() },
    rides: { findMany: jest.fn() },
  };

  const mockNotifications = { create: jest.fn() };

  // The plans and the parts, filtered the way the database would filter them - so what a
  // read leaves out is exercised as behaviour rather than asserted on.
  function garage(intervals: Record<string, unknown>[], parts: Record<string, unknown>[]): void {
    mockPrismaService.bike_service_interval.findMany.mockImplementation(({ where }: { where?: WhereArg }) =>
      Promise.resolve(applyWhere(intervals, where)),
    );
    mockPrismaService.components_mounted.findMany.mockImplementation(({ where }: { where?: WhereArg }) =>
      Promise.resolve(applyWhere(parts, where)),
    );
  }

  // The same, with the owner's bikes in front of it - only the unarchived ones are served.
  function fleet(
    bikes: Record<string, unknown>[],
    intervals: Record<string, unknown>[],
    parts: Record<string, unknown>[],
  ): void {
    mockPrismaService.bikes.findMany.mockImplementation(({ where }: { where?: { is_deleted?: unknown } }) =>
      Promise.resolve(bikes.filter((bike) => where?.is_deleted === undefined || bike.is_deleted !== true)),
    );
    garage(intervals, parts);
  }

  // What one write asked of the state row, whichever column it landed on.
  interface StateUpsertArgs {
    where: { component_mounted_id_event_actions_id: { component_mounted_id: number; event_actions_id: number } };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }

  // The state rows a write leaves behind, kept on the fixtures the read then loads. Every
  // write answers with the reading as it now stands, so the stand-in database has to
  // actually keep what was written to it.
  function keepState(parts: Record<string, unknown>[]): void {
    mockPrismaService.tracked_action_state.upsert.mockImplementation(({ where, create, update }: StateUpsertArgs) => {
      const { component_mounted_id, event_actions_id } = where.component_mounted_id_event_actions_id;
      const part = parts.find((row) => row.id === component_mounted_id);
      const rows = (part?.tracked_action_state ?? []) as Record<string, unknown>[];
      const existing = rows.find((row) => row.event_actions_id === event_actions_id);

      if (existing === undefined) {
        rows.push({ ...stateRow(event_actions_id), ...create });
        return Promise.resolve({});
      }

      for (const [column, value] of Object.entries(update)) {
        existing[column] = value;
      }
      return Promise.resolve({});
    });
  }

  // What each pairing now holds in one column of its state row - the band it has reached,
  // or a setting the owner wrote.
  function held(parts: Record<string, unknown>[], column: string): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const part of parts) {
      for (const state of part.tracked_action_state as Record<string, unknown>[]) {
        values[`${String(part.id)}:${String(state.event_actions_id)}`] = state[column];
      }
    }
    return values;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceTrackingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<ServiceTrackingService>(ServiceTrackingService);

    // The owner's own bike, in use, unless a test says otherwise.
    mockPrismaService.bikes.findFirst.mockResolvedValue({
      id: BIKE_ID,
      is_deleted: false,
      bike_brand: 'Santa Cruz',
      bike_model: 'Hightower',
      year: 2022,
    });
    mockPrismaService.tracked_action_state.upsert.mockResolvedValue({});
    // No rides unless a test stores some.
    mockPrismaService.rides.findMany.mockResolvedValue([]);
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

    // The date on a Service carries no time, so two done on the same day tie on it. The
    // one written down last is the one that counts - whichever order the rows come in.
    it('measures from the Service recorded last when two share a day', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 5000,
            action_done_component_map: [
              baseline(
                CHAIN_REPLACEMENT,
                { drivetrainKm: 1000 },
                '2025-06-01T00:00:00.000Z',
                false,
                '2025-06-01T09:00:00.000Z',
              ),
              baseline(
                CHAIN_REPLACEMENT,
                { drivetrainKm: 4500 },
                '2025-06-01T00:00:00.000Z',
                false,
                '2025-06-01T18:00:00.000Z',
              ),
              baseline(
                CHAIN_REPLACEMENT,
                { drivetrainKm: 3000 },
                '2025-06-01T00:00:00.000Z',
                false,
                '2025-06-01T12:00:00.000Z',
              ),
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

    // The level boundaries, which are the whole of the colour rule. Each edge is hit exactly
    // and then missed by one kilometre, so a reading can never read as due before it is.
    it.each([
      [5900, 'very_good', 59],
      [5999, 'very_good', 59],
      [6000, 'good', 60],
      [7400, 'good', 74],
      [7499, 'good', 74],
      [7500, 'warning', 75],
      [8900, 'warning', 89],
      [8999, 'warning', 89],
      [9000, 'critical', 90],
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

    // What the row has to carry to be read without opening anything else - and to lead
    // into the service wizard, which names the part's category (ADR 0030).
    it('names the part and the action on every reading', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 3200 })]);

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action).toMatchObject({
        bike_id: BIKE_ID,
        component_mounted_id: 55,
        component_group_id: GROUP_ID,
        component_type: 'Chain',
        component_desc: 'Shimano XT M8100',
        event_action_id: CHAIN_REPLACEMENT,
        action_name: `Action ${String(CHAIN_REPLACEMENT)}`,
        level: 'warning',
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
      expect(action.level).toBe('very_good');
    });

    // Which accumulator a reading came from is not implied by the axis it is on: a chain
    // and a tyre are both read in kilometres, but only the chain's are the drivetrain's.
    it('names the accumulator each reading was taken from', async () => {
      garage(
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE]),
          intervalRow(TYRE_REPLACEMENT, { km: 3000 }, [TYRE_TYPE]),
          intervalRow(FORK_SERVICE, { min: 6000 }, [FORK_TYPE]),
          intervalRow(PADS_REPLACEMENT, { healthIndex: 50000 }, [PAD_TYPE]),
        ],
        [
          mountedPart({ id: 55 }),
          mountedPart({ id: 56, component_type_id: TYRE_TYPE, component_types: typeRow(TYRE_TYPE) }),
          mountedPart({ id: 57, component_type_id: FORK_TYPE, component_types: typeRow(FORK_TYPE) }),
          mountedPart({ id: 58, component_type_id: PAD_TYPE, component_types: typeRow(PAD_TYPE) }),
        ],
      );

      const actions = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);
      const measures = Object.fromEntries(actions.map((action) => [action.component_mounted_id, action.measure]));

      expect(measures).toEqual({
        55: 'drivetrain_km',
        56: 'total_km',
        57: 'suspension_min',
        58: 'health_index',
      });
    });

    // The owner knows their chain does 2 500 km rather than 3 000, and the reading says so.
    it('measures against the Interval Override where the owner set one', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 2000,
            tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { intervalOverride: 2500 })],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.interval).toBe(2500);
      expect(action.percentage).toBe(80);
      expect(action.interval_override).toBe(2500);
      expect(action.default_interval).toBe(4000);
    });

    // Nothing silently freezes at the value it happened to have: an untouched pairing goes
    // on following whatever the bike plans.
    it("measures against the bike's plan where no override was set", async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 2000 })]);

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.interval).toBe(4000);
      expect(action.percentage).toBe(50);
      expect(action.interval_override).toBeNull();
      expect(action.default_interval).toBe(4000);
    });

    // A fresh rear tyre is not judged by the front one's schedule: two tyres are two
    // Tracked Actions, and they are allowed two intervals.
    it('leaves the other part of the same kind on the bike plan', async () => {
      garage(
        [intervalRow(TYRE_REPLACEMENT, { km: 3000 }, [TYRE_TYPE])],
        [
          mountedPart({
            id: 55,
            component_type_id: TYRE_TYPE,
            component_types: typeRow(TYRE_TYPE),
            total_km: 1500,
            tracked_action_state: [settingRow(TYRE_REPLACEMENT, { intervalOverride: 2000 })],
          }),
          mountedPart({ id: 56, component_type_id: TYRE_TYPE, component_types: typeRow(TYRE_TYPE), total_km: 1500 }),
        ],
      );

      const byPart = new Map(
        (await service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).map((row) => [row.component_mounted_id, row]),
      );

      expect(byPart.get(55)?.interval).toBe(2000);
      expect(byPart.get(56)?.interval).toBe(3000);
      expect(byPart.get(56)?.interval_override).toBeNull();
    });

    // An override cannot make a Tracked Action out of an action the bike plans nothing for:
    // the plan is still what says whether an axis is read at all.
    it('reads an override only on the axis the bike plans for', async () => {
      garage(
        [intervalRow(FORK_SERVICE, { min: 6000 }, [FORK_TYPE])],
        [
          mountedPart({
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            suspension_min: 2000,
            total_km: 9000,
            tracked_action_state: [settingRow(FORK_SERVICE, { intervalOverride: 4000 })],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.axis).toBe('min');
      expect(action.interval).toBe(4000);
      expect(action.percentage).toBe(50);
    });

    // What the drawer cannot work out for itself: what a reset would restore, whether the
    // pairing is muted, and which button records the job.
    it('carries the bike plan, the mute and the button', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE], BIKE_ID, true)],
        [
          mountedPart({
            drivetrain_km: 2000,
            tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { intervalOverride: 2500, notify: false })],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.default_interval).toBe(4000);
      expect(action.notify).toBe(false);
      expect(action.replace_action).toBe(true);
      expect(action.mounted_at).toEqual(new Date('2025-01-01T00:00:00.000Z'));
    });

    // Which axis is read is the bike's plan's to decide, so the override lands on whichever
    // axis the reading is actually served on - never on a quieter one the plan also fills.
    it('applies the override to the axis the reading is served on', async () => {
      garage(
        [intervalRow(FORK_SERVICE, { km: 4000, min: 6000 }, [FORK_TYPE])],
        [
          mountedPart({
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            total_km: 1000,
            suspension_min: 4800,
            tracked_action_state: [settingRow(FORK_SERVICE, { intervalOverride: 4000 })],
          }),
        ],
      );

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      // Minutes read 80% against the plan and kilometres 25%, so minutes is the axis - and
      // the override is the interval it is read against, not the kilometre one.
      expect(action.axis).toBe('min');
      expect(action.interval).toBe(4000);
      expect(action.default_interval).toBe(6000);
      expect(action.interval_override).toBe(4000);
      expect(action.percentage).toBe(120);
    });

    // A pairing with no row of its own has never been muted, and announcing is the default.
    it('reads a pairing with no state row as announcing', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 2000 })]);

      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(action.notify).toBe(true);
    });
  });

  // How much descent is left on a pad, at the pace the bike's latest rides have worn it.
  describe('remaining_descent_min', () => {
    const PAD_PLAN = intervalRow(PADS_REPLACEMENT, { healthIndex: 1000 }, [PAD_TYPE], BIKE_ID, true);

    function pad(healthIndex: number, state: Record<string, unknown>[] = []): Record<string, unknown> {
      return mountedPart({
        component_type_id: PAD_TYPE,
        component_types: typeRow(PAD_TYPE),
        health_index: healthIndex,
        tracked_action_state: state,
      });
    }

    // The rides stored, served newest first and capped the way the database would serve them.
    function storeRides(rides: Record<string, unknown>[]): void {
      mockPrismaService.rides.findMany.mockImplementation(({ where, take }: { where?: RideWhere; take?: number }) =>
        Promise.resolve(
          rides
            .filter((ride) => matchesRide(ride, where))
            .sort((one, other) => (other.started_at as Date).getTime() - (one.started_at as Date).getTime())
            .slice(0, take),
        ),
      );
    }

    // `count` rides a day apart, later by id, each wearing `padIndex` over `descentMin` minutes of descent.
    function ridesAt(
      count: number,
      padIndex: number,
      descentMin: number | null,
      firstId = 1,
    ): Record<string, unknown>[] {
      return Array.from({ length: count }, (_, index) =>
        rideRow(firstId + index, `2026-09-${String(9 + firstId + index).padStart(2, '0')}T08:00:00.000Z`, {
          padIndex,
          descentMin,
        }),
      );
    }

    async function remaining(): Promise<number | null> {
      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);
      return action.remaining_descent_min;
    }

    // 2 index per minute, so the 600 left on the interval is 300 minutes of descent.
    it("divides what is left of the interval by the bike's descent rate", async () => {
      garage([PAD_PLAN], [pad(400)]);
      storeRides(ridesAt(5, 20, 10));

      expect(await remaining()).toBe(300);
    });

    // Two old rides at 100 index a minute would pull the rate far off if they were counted.
    it('reads the rate from the latest 10 rides only', async () => {
      garage([PAD_PLAN], [pad(400)]);
      storeRides([...ridesAt(2, 100, 1), ...ridesAt(10, 20, 10, 3)]);

      expect(await remaining()).toBe(300);
    });

    // An owner's own interval is the one in force, so it is the one counted down.
    it('counts down to the Interval Override', async () => {
      garage([PAD_PLAN], [pad(400, [settingRow(PADS_REPLACEMENT, { intervalOverride: 800 })])]);
      storeRides(ridesAt(5, 20, 10));

      expect(await remaining()).toBe(200);
    });

    // Rides imported before descent time was kept would count wear with no minutes behind it.
    it('ignores rides with no descent time', async () => {
      garage([PAD_PLAN], [pad(400)]);
      storeRides([...ridesAt(3, 20, 10), ...ridesAt(5, 500, null, 4)]);

      expect(await remaining()).toBe(300);
    });

    it('ignores deleted rides', async () => {
      garage([PAD_PLAN], [pad(400)]);
      storeRides([
        ...ridesAt(2, 20, 20),
        rideRow(9, '2026-09-20T08:00:00.000Z', { padIndex: 20, descentMin: 20, isDeleted: true }),
      ]);

      expect(await remaining()).toBeNull();
    });

    it('is null with fewer than 3 rides to read a rate from', async () => {
      garage([PAD_PLAN], [pad(400)]);
      storeRides(ridesAt(2, 20, 30));

      expect(await remaining()).toBeNull();
    });

    it('is null with under 30 minutes of descent behind the rate', async () => {
      garage([PAD_PLAN], [pad(400)]);
      storeRides(ridesAt(3, 20, 9));

      expect(await remaining()).toBeNull();
    });

    // Descent that wore nothing gives no pace to count down at.
    it('is null when the rides wore the pads by nothing', async () => {
      garage([PAD_PLAN], [pad(400)]);
      storeRides(ridesAt(5, 0, 10));

      expect(await remaining()).toBeNull();
    });

    // The percentage and its colour already say it is due; a time left would contradict them.
    it('is null once the interval is passed', async () => {
      garage([PAD_PLAN], [pad(1200)]);
      storeRides(ridesAt(5, 20, 10));

      expect(await remaining()).toBeNull();
    });

    it('is null off the health index axis', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 3200 })]);
      storeRides(ridesAt(5, 20, 10));

      expect(await remaining()).toBeNull();
      expect(mockPrismaService.rides.findMany).not.toHaveBeenCalled();
    });

    // The dashboard opens the same drawer, so its rows carry the same estimate.
    it('is carried on the garage list', async () => {
      fleet([bikeRow(BIKE_ID, 'Santa Cruz')], [PAD_PLAN], [pad(900)]);
      storeRides(ridesAt(5, 20, 10));

      const [action] = await service.getGarageTrackedActions(OWNER_ID, 80);

      expect(action.remaining_descent_min).toBe(50);
    });
  });

  describe('getGarageTrackedActions', () => {
    // The dashboard asks only about what has come far enough to be worth showing; the
    // quiet ones belong on the bike's own page.
    it('returns only the readings at or above the percentage asked for', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE]),
          intervalRow(TYRE_REPLACEMENT, { km: 1000 }, [TYRE_TYPE]),
        ],
        [
          mountedPart({ drivetrain_km: 850 }),
          mountedPart({
            id: 60,
            component_type_id: TYRE_TYPE,
            component_types: typeRow(TYRE_TYPE),
            total_km: 300,
          }),
        ],
      );

      const actions = await service.getGarageTrackedActions(OWNER_ID, 80);

      expect(actions).toHaveLength(1);
      expect(actions[0].percentage).toBe(85);
    });

    // The cutoff is the caller's, not the service's.
    it('honours a percentage other than 80', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 500 })],
      );

      await expect(service.getGarageTrackedActions(OWNER_ID, 50)).resolves.toHaveLength(1);
      await expect(service.getGarageTrackedActions(OWNER_ID, 51)).resolves.toEqual([]);
    });

    // A reading exactly on the cutoff is worth showing - the bands and the cutoff read the
    // same number, so 80% is a warning and appears.
    it('includes a reading exactly on the cutoff', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 800 })],
      );

      const [action] = await service.getGarageTrackedActions(OWNER_ID, 80);

      expect(action.percentage).toBe(80);
      expect(action.level).toBe('warning');
    });

    // One flat list across the whole garage, worst first - not a list per bike.
    it('sorts worst first across every bike', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz'), bikeRow(OTHER_BIKE_ID, 'Trek')],
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE]),
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE], OTHER_BIKE_ID),
        ],
        [
          mountedPart({ drivetrain_km: 850 }),
          mountedPart({ id: 70, bike_id: OTHER_BIKE_ID, drivetrain_km: 1320 }),
          mountedPart({ id: 71, bike_id: OTHER_BIKE_ID, drivetrain_km: 960 }),
        ],
      );

      const actions = await service.getGarageTrackedActions(OWNER_ID, 80);

      expect(actions.map((action) => [action.bike_id, action.percentage])).toEqual([
        [OTHER_BIKE_ID, 132],
        [OTHER_BIKE_ID, 96],
        [BIKE_ID, 85],
      ]);
    });

    // A row names the bike it belongs to, so the owner knows what is being asked of them
    // without opening anything.
    it('names the bike on every row', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz'), bikeRow(OTHER_BIKE_ID, 'Trek')],
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE]),
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE], OTHER_BIKE_ID),
        ],
        [mountedPart({ drivetrain_km: 850 }), mountedPart({ id: 70, bike_id: OTHER_BIKE_ID, drivetrain_km: 900 })],
      );

      const actions = await service.getGarageTrackedActions(OWNER_ID, 80);

      expect(actions.map((action) => [action.bike_id, action.bike_brand, action.bike_model, action.year])).toEqual([
        [OTHER_BIKE_ID, 'Trek', 'Hightower', 2022],
        [BIKE_ID, 'Santa Cruz', 'Hightower', 2022],
      ]);
    });

    // A bike's plan is its own: one bike's interval says nothing about another bike's part.
    it('reads each bike against its own plan', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz'), bikeRow(OTHER_BIKE_ID, 'Trek')],
        [intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 850 }), mountedPart({ id: 70, bike_id: OTHER_BIKE_ID, drivetrain_km: 5000 })],
      );

      const actions = await service.getGarageTrackedActions(OWNER_ID, 80);

      expect(actions.map((action) => action.bike_id)).toEqual([BIKE_ID]);
    });

    // A bike put away contributes nothing, however overdue it was when it was put away.
    it('leaves out an Archived Bike', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz'), bikeRow(OTHER_BIKE_ID, 'Trek', true)],
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE]),
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE], OTHER_BIKE_ID),
        ],
        [mountedPart({ drivetrain_km: 850 }), mountedPart({ id: 70, bike_id: OTHER_BIKE_ID, drivetrain_km: 5000 })],
      );

      const actions = await service.getGarageTrackedActions(OWNER_ID, 80);

      expect(actions.map((action) => action.bike_id)).toEqual([BIKE_ID]);
    });

    // The list matches what is actually on the bikes.
    it('leaves out a part that has been taken off or deleted', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE])],
        [
          mountedPart({ drivetrain_km: 900, is_active: false }),
          mountedPart({ id: 56, drivetrain_km: 900, is_deleted: true }),
        ],
      );

      await expect(service.getGarageTrackedActions(OWNER_ID, 80)).resolves.toEqual([]);
    });

    // An owner with no bikes has nothing to be told about.
    it('returns nothing for an owner with no bikes', async () => {
      fleet([], [], []);

      await expect(service.getGarageTrackedActions(OWNER_ID, 80)).resolves.toEqual([]);
    });
  });

  describe('getGarageReadings', () => {
    // Wear is counted from the last time that job was recorded on that part, deleted Services aside.
    it('dates the Wear Baseline by the latest recorded occasion of the action', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE]),
          intervalRow(TYRE_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE]),
        ],
        [
          mountedPart({
            drivetrain_km: 3200,
            action_done_component_map: [
              baseline(CHAIN_REPLACEMENT, { drivetrainKm: 1000 }, '2026-06-10T00:00:00.000Z'),
              baseline(CHAIN_REPLACEMENT, { drivetrainKm: 500 }, '2026-03-01T00:00:00.000Z'),
              baseline(CHAIN_REPLACEMENT, { drivetrainKm: 2000 }, '2026-08-01T00:00:00.000Z', true),
              baseline(TYRE_REPLACEMENT, { km: 0 }, '2026-09-01T00:00:00.000Z'),
            ],
          }),
        ],
      );

      const readings = await service.getGarageReadings(OWNER_ID);
      const chain = readings.find((reading) => reading.action.event_action_id === CHAIN_REPLACEMENT);

      expect(chain?.wearBaselineAt).toEqual(new Date('2026-06-10T00:00:00.000Z'));
    });

    // Never recorded, the part has worn since it went on.
    it('dates the Wear Baseline by the mounting when the action was never recorded', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 3200, mounted_at: new Date('2026-02-14T08:00:00.000Z') })],
      );

      const [reading] = await service.getGarageReadings(OWNER_ID);

      expect(reading.wearBaselineAt).toEqual(new Date('2026-02-14T08:00:00.000Z'));
    });

    // The mounting would count wear the undated Service already reset.
    it('leaves the Wear Baseline undated when the latest recorded occasion has no date', async () => {
      const undated = baseline(CHAIN_REPLACEMENT, { drivetrainKm: 1000 });
      (undated.event_actions_done as { events_bikes: Record<string, unknown> }).events_bikes.service_date = null;
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 3200, action_done_component_map: [undated] })],
      );

      const [reading] = await service.getGarageReadings(OWNER_ID);

      expect(reading.wearBaselineAt).toBeNull();
    });

    it('leaves out an Archived Bike', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz'), bikeRow(OTHER_BIKE_ID, 'Trek', true)],
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE]),
          intervalRow(CHAIN_REPLACEMENT, { km: 1000 }, [CHAIN_TYPE], OTHER_BIKE_ID),
        ],
        [mountedPart({ drivetrain_km: 100 }), mountedPart({ id: 70, bike_id: OTHER_BIKE_ID, drivetrain_km: 5000 })],
      );

      const readings = await service.getGarageReadings(OWNER_ID);

      expect(readings.map((reading) => reading.action.bike_id)).toEqual([BIKE_ID]);
    });
  });

  // The announcements. Everything below turns on one rule: the stored band is moved to
  // whichever band the reading now falls in, and only a move up - to 70, 95 or 100 - says
  // anything.
  describe('evaluateBike', () => {
    // What the evaluation wrote, by pairing - which is what "always set to the band the
    // current percentage falls in" means in the table.
    interface UpsertCall {
      where: { component_mounted_id_event_actions_id: { component_mounted_id: number; event_actions_id: number } };
      update: { reached_threshold: number };
    }

    function bandsWritten(): Record<string, number> {
      const written: Record<string, number> = {};
      for (const [call] of mockPrismaService.tracked_action_state.upsert.mock.calls as [UpsertCall][]) {
        const pair = call.where.component_mounted_id_event_actions_id;
        written[`${pair.component_mounted_id}:${pair.event_actions_id}`] = call.update.reached_threshold;
      }
      return written;
    }

    // The counts and the band one notification carried, or null when none was sent.
    function announced(): Record<string, number | string> | null {
      const calls = mockNotifications.create.mock.calls as [{ payload: Record<string, number | string> }][];
      if (calls.length === 0) return null;
      const { bikeId, soonCount, dueCount, overdueCount, level } = calls[0][0].payload;
      return { bikeId, soonCount, dueCount, overdueCount, level };
    }

    // Which jobs the notification named as having just moved, as the fixtures name them.
    function crossed(): string[] {
      const calls = mockNotifications.create.mock.calls as [{ payload: { crossed: { actionName: string }[] } }][];
      if (calls.length === 0) return [];
      return calls[0][0].payload.crossed.map((reading) => reading.actionName);
    }

    // Order the part before it is needed: this is the first band worth interrupting for.
    it('announces a Tracked Action reaching 95%', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 3800 })]);

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 1, overdueCount: 0, level: 'critical' });
      expect(mockNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: OWNER_ID, type: 'maintenance_due' }),
      );
    });

    // Riding on borrowed time now, which is its own piece of news.
    it('announces a Tracked Action reaching 100%', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 4000 })]);

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 0, overdueCount: 1, level: 'overdue' });
    });

    // 75 is the heads-up: the job is on the horizon, and the owner hears about it once.
    it('announces a Tracked Action reaching 75% as coming up', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 3000 })]);

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 1, dueCount: 0, overdueCount: 0, level: 'warning' });
      expect(bandsWritten()).toEqual({ '55:101': 75 });
      // The heads-up names the job, so the crossing travels with the part and the reading.
      const [call] = mockNotifications.create.mock.calls as [
        { payload: { crossed: { componentName: string; percentage: number }[] } },
      ][];
      expect(call[0].payload.crossed).toEqual([
        expect.objectContaining({ componentName: 'Chain', actionKey: null, percentage: 75 }),
      ]);
    });

    // Log service opens the wizard on the worst job, so each crossing carries the link's ids (ADR 0030).
    it('carries the ids the service wizard link is built from', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 4000 })]);

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      const [call] = mockNotifications.create.mock.calls as [{ payload: { crossed: Record<string, unknown>[] } }][];
      expect(call[0].payload.crossed).toEqual([
        expect.objectContaining({ componentMountedId: 55, actionId: CHAIN_REPLACEMENT, groupId: GROUP_ID }),
      ]);
    });

    // Good is a colour, not an interruption: it shares band 0 with very good, so crossing
    // into it writes nothing and says nothing.
    it('says nothing about a Tracked Action that has only reached good', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 2800 })]);

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(bandsWritten()).toEqual({});
    });

    // Every threshold is announced once. A second ride in the same band is not news.
    it('says nothing on a second evaluation in the same band', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 3900, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 90)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(bandsWritten()).toEqual({ '55:101': 90 });
    });

    // The band is written whether it moved or not, so the stored band is always the one
    // the current reading falls in.
    it('writes the current band on every evaluation', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 5300, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 95)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      // 132% of the interval, which is the fourth band above due.
      expect(bandsWritten()).toEqual({ '55:101': 130 });
    });

    // A pairing sitting quietly in the good band has nothing to record that the absent
    // row does not already say.
    it('writes no row for a quiet Tracked Action that has none', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 100 })]);

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });

    // Finished work stops nagging, and is armed again for the next time round.
    it('re-arms silently after a Service resets the reading', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 4100,
            action_done_component_map: [baseline(CHAIN_REPLACEMENT, { drivetrainKm: 4000 })],
            tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100)],
          }),
        ],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(bandsWritten()).toEqual({ '55:101': 0 });
    });

    // A new chain starts from zero and gets the same warnings the old one did.
    it('re-arms silently after a Replacement puts a fresh part on', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ id: 56, drivetrain_km: 0, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(bandsWritten()).toEqual({ '56:101': 0 });
    });

    // Adjusting a plan is not the same as turning a job off.
    it('re-arms silently after the Service Interval is lengthened', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 8000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 4000, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(bandsWritten()).toEqual({ '55:101': 0 });
    });

    // A re-armed Tracked Action warns again once it passes the threshold a second time.
    it('announces again once a re-armed Tracked Action crosses back up', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 8000,
            action_done_component_map: [baseline(CHAIN_REPLACEMENT, { drivetrainKm: 4000 })],
            tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 0)],
          }),
        ],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 0, overdueCount: 1, level: 'overdue' });
    });

    // Being overdue is not one state the app says once and then goes quiet about. The
    // interval is behind and the part is still on the bike, so every further tenth of it
    // is a band of its own - which is what tells 110% from 120% without opening the app.
    it('announces a Tracked Action reaching 110%', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 4400, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
      expect(bandsWritten()).toEqual({ '55:101': 110 });
    });

    // Inside a band nothing is new, however far into it the reading has come - 109% is
    // still the band 100 announced, and saying it twice would read as a stuck app.
    it('says nothing about a Tracked Action still inside the band it announced', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 4360, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(bandsWritten()).toEqual({ '55:101': 100 });
    });

    // Nothing caps the bands, because nothing caps the reading. A part ridden to twice its
    // interval is still a part the owner has not dealt with.
    it('keeps announcing a Tracked Action far past due', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 8000, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 190)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
      expect(bandsWritten()).toEqual({ '55:101': 200 });
    });

    // The counts say where the bike stands, and past 100 one level covers many bands - so
    // they are counted by level. Counting bands would report this chain as nothing at all.
    it('counts a Tracked Action past 100 as overdue whatever band it is in', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 5280, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 120)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 0, overdueCount: 1, level: 'overdue' });
    });

    // Raising the interval is what an owner who wants to be told later does now, so it has
    // to be able to quiet a reading that is already past due.
    it('re-arms silently when a raised interval pulls a reading back under due', async () => {
      const parts = [mountedPart({ drivetrain_km: 4400, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 110)] })];
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], parts);
      keepState(parts);

      await service.setTrackedActionInterval(55, CHAIN_REPLACEMENT, OWNER_ID, 5000);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(held(parts, 'reached_threshold')).toEqual({ '55:101': 75 });
    });

    // Syncing a month of rides must not fire a dozen pushes: one line says the size of
    // the job instead.
    it('sends one notification per bike, naming the counts', async () => {
      garage(
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE]),
          intervalRow(FORK_SERVICE, { min: 6000 }, [FORK_TYPE]),
          intervalRow(PADS_REPLACEMENT, { healthIndex: 100 }, [PAD_TYPE]),
        ],
        [
          mountedPart({ drivetrain_km: 3900 }),
          mountedPart({
            id: 56,
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            suspension_min: 5800,
          }),
          mountedPart({ id: 57, component_type_id: PAD_TYPE, component_types: typeRow(PAD_TYPE), health_index: 140 }),
        ],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 2, overdueCount: 1, level: 'overdue' });
    });

    // A crossing makes the app speak; what it says is the size of the job, which includes
    // the work already announced and still waiting.
    it('counts what is waiting, not only what just crossed', async () => {
      garage(
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE]),
          intervalRow(FORK_SERVICE, { min: 6000 }, [FORK_TYPE]),
        ],
        [
          // Announced as overdue last week, and still overdue.
          mountedPart({ drivetrain_km: 9000, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100)] }),
          // The fork is what crossed just now.
          mountedPart({
            id: 56,
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            suspension_min: 5800,
          }),
        ],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 1, overdueCount: 1, level: 'overdue' });
    });

    // A backfill lands in the band it ends in. The owner is told where the bike stands
    // now, not about every threshold it blew past on the way there - which past 100 is a
    // band every ten percent, so a season of rides would otherwise be a dozen pushes.
    it('settles a backfill into the band it ends in', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 9000 })]);

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 0, overdueCount: 1, level: 'overdue' });
      expect(bandsWritten()).toEqual({ '55:101': 220 });
    });

    // A ride Strava sent again, or corrected, moves nothing across a band.
    it('announces nothing when a re-synced ride crosses no band', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 4100, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    // A bike put away stays put away, however overdue it was when it was put away.
    it('never announces on an Archived Bike', async () => {
      mockPrismaService.bikes.findFirst.mockResolvedValue(null);
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 9000 })]);

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });

    // A part that came off, or one that should never have existed, owes the bike nothing.
    it('never announces on a removed or deleted part', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({ drivetrain_km: 9000, is_active: false }),
          mountedPart({ id: 56, drivetrain_km: 9000, is_deleted: true }),
        ],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });

    // A backfill can spread across the garage. Each bike is still evaluated once, so each
    // sends at most one notification.
    it('evaluates every bike a backfill touched, once each', async () => {
      garage([], []);

      await service.evaluateBikes([BIKE_ID, OTHER_BIKE_ID, BIKE_ID], OWNER_ID);

      expect(mockPrismaService.bikes.findFirst).toHaveBeenCalledTimes(2);
    });

    // A job the owner tracks themselves stops interrupting them - and the app does not stop
    // knowing the chain is finished, so the band moves on under the mute.
    it('says nothing about a muted Tracked Action but still moves its band', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [
          mountedPart({
            drivetrain_km: 4000,
            tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { notify: false })],
          }),
        ],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toBeNull();
      expect(bandsWritten()).toEqual({ '55:101': 100 });
    });

    // Muting one pairing silences that pairing and no other.
    it('still announces an unmuted Tracked Action beside a muted one', async () => {
      garage(
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE]),
          intervalRow(TYRE_REPLACEMENT, { km: 3000 }, [TYRE_TYPE]),
        ],
        [
          mountedPart({
            id: 55,
            drivetrain_km: 4000,
            tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { notify: false })],
          }),
          mountedPart({ id: 56, component_type_id: TYRE_TYPE, component_types: typeRow(TYRE_TYPE), total_km: 3000 }),
        ],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      // The muted chain is still counted - the app does not stop knowing it is finished -
      // but the tyre is the only thing named as having just moved.
      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 0, overdueCount: 2, level: 'overdue' });
      expect(crossed()).toEqual([`Action ${String(TYRE_REPLACEMENT)}`]);
    });

    // Unmuting hands back no backlog: the band kept moving while the mute was on, so there
    // is nothing left to cross.
    it('says nothing when a pairing is unmuted in the band it already reached', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 4000, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toBeNull();
    });

    // ... but silence does not become permanent: the band that moved under the mute is the
    // one the next genuine crossing is measured from, and that crossing announces.
    it('announces the first genuine crossing after a pairing is unmuted', async () => {
      garage(
        [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 3800, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 75)] })],
      );

      await service.evaluateBike(BIKE_ID, OWNER_ID);

      expect(announced()).toEqual({ bikeId: BIKE_ID, soonCount: 0, dueCount: 1, overdueCount: 0, level: 'critical' });
      expect(bandsWritten()).toEqual({ '55:101': 90 });
    });
  });

  describe('setTrackedActionInterval', () => {
    // The app measures the chain the way the owner actually rides it, from the moment they
    // say so - and answers with the reading their change produced.
    it('reads against the new interval the moment it is saved', async () => {
      const parts = [mountedPart({ drivetrain_km: 2000 })];
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], parts);
      keepState(parts);

      const action = await service.setTrackedActionInterval(55, CHAIN_REPLACEMENT, OWNER_ID, 2500);

      expect(held(parts, 'interval_override')).toEqual({ '55:101': 2500 });
      expect(action.interval).toBe(2500);
      expect(action.percentage).toBe(80);
      expect(action.interval_override).toBe(2500);
    });

    // Reset to default puts the bike's own plan back, which is why the plan is never written.
    it('restores the bike plan when the override is cleared', async () => {
      const parts = [
        mountedPart({
          drivetrain_km: 2000,
          tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { intervalOverride: 2500 })],
        }),
      ];
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], parts);
      keepState(parts);

      const action = await service.setTrackedActionInterval(55, CHAIN_REPLACEMENT, OWNER_ID, null);

      expect(held(parts, 'interval_override')).toEqual({ '55:101': null });
      expect(action.interval).toBe(4000);
      expect(action.percentage).toBe(50);
      expect(action.interval_override).toBeNull();
    });

    // A reading with nothing to divide by is not a reading.
    it.each([0, -1])('refuses an interval of %s', async (value) => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 2000 })]);

      await expect(service.setTrackedActionInterval(55, CHAIN_REPLACEMENT, OWNER_ID, value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });

    // Somebody else's bike is nobody's to re-plan.
    it('refuses a Tracked Action the caller does not own', async () => {
      mockPrismaService.bikes.findFirst.mockResolvedValue(null);
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 2000 })]);

      await expect(service.setTrackedActionInterval(55, CHAIN_REPLACEMENT, OWNER_ID, 2500)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });

    // A pairing the bike keeps no Service Interval for has no interval to override.
    it('refuses a pairing that is not a Tracked Action', async () => {
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 2000 })]);

      await expect(service.setTrackedActionInterval(55, TYRE_REPLACEMENT, OWNER_ID, 2500)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });
  });

  describe('setTrackedActionNotify', () => {
    // A job the owner tracks themselves stops interrupting them, and nothing else changes:
    // the percentage, the colour and the place on the dashboard all stand.
    it('mutes one pairing without touching its reading', async () => {
      const parts = [mountedPart({ drivetrain_km: 4000 })];
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], parts);
      keepState(parts);

      const action = await service.setTrackedActionNotify(55, CHAIN_REPLACEMENT, OWNER_ID, false);

      expect(held(parts, 'notify')).toEqual({ '55:101': false });
      expect(action.notify).toBe(false);
      expect(action.percentage).toBe(100);
      expect(action.level).toBe('overdue');
    });

    // Muting is never a one-way door.
    it('unmutes a pairing that was muted', async () => {
      const parts = [
        mountedPart({ drivetrain_km: 4000, tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { notify: false })] }),
      ];
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], parts);
      keepState(parts);

      const action = await service.setTrackedActionNotify(55, CHAIN_REPLACEMENT, OWNER_ID, true);

      expect(action.notify).toBe(true);
    });

    // Unmuting is quiet: the band went on moving under the mute, so there is no backlog to
    // hand back.
    it('announces nothing on unmuting', async () => {
      const parts = [
        mountedPart({
          drivetrain_km: 4000,
          tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 100, { notify: false })],
        }),
      ];
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], parts);
      keepState(parts);

      await service.setTrackedActionNotify(55, CHAIN_REPLACEMENT, OWNER_ID, true);

      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    // Somebody else's bike is nobody's to silence.
    it('refuses a Tracked Action the caller does not own', async () => {
      mockPrismaService.bikes.findFirst.mockResolvedValue(null);
      garage([intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])], [mountedPart({ drivetrain_km: 4000 })]);

      await expect(service.setTrackedActionNotify(55, CHAIN_REPLACEMENT, OWNER_ID, false)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });
  });

  // A plan is a day and nothing else; it stands until a Service records the Action after it was set.
  describe('a planned Tracked Action', () => {
    const INTERVALS = [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])];
    const PLANNED = { plannedFor: '2026-10-04', plannedAt: '2026-09-20T10:00:00.000Z' };

    // The chain with its plan, and whatever has been recorded against it.
    function plannedChain(recorded: Record<string, unknown>[] = []): Record<string, unknown> {
      return mountedPart({
        drivetrain_km: 3200,
        action_done_component_map: recorded,
        tracked_action_state: [settingRow(CHAIN_REPLACEMENT, PLANNED)],
      });
    }

    async function plannedFor(part: Record<string, unknown>): Promise<string | null> {
      garage(INTERVALS, [part]);
      const [action] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);
      return action.planned_for;
    }

    it('serves the day while nothing has recorded the Action since', async () => {
      expect(await plannedFor(plannedChain())).toBe('2026-10-04');
    });

    // Doing the work early counts: any later day ends the plan, before the planned day or not.
    it('ends at a Service of the Action dated a later day than the plan was set', async () => {
      const done = baseline(CHAIN_REPLACEMENT, { drivetrainKm: 3000 }, '2026-09-25T00:00:00.000Z');

      expect(await plannedFor(plannedChain([done]))).toBeNull();
    });

    // Back-filling old work does not cancel a booking.
    it('stands through a Service of the Action dated an earlier day', async () => {
      const old = baseline(
        CHAIN_REPLACEMENT,
        { drivetrainKm: 3000 },
        '2026-09-19T00:00:00.000Z',
        false,
        '2026-09-21T08:00:00.000Z',
      );

      expect(await plannedFor(plannedChain([old]))).toBe('2026-10-04');
    });

    // The same day is told apart by which was written last - the Wear Baseline's own tie-break.
    it('ends at a Service of the Action dated the same day and written after the plan', async () => {
      const done = baseline(
        CHAIN_REPLACEMENT,
        { drivetrainKm: 3000 },
        '2026-09-20T00:00:00.000Z',
        false,
        '2026-09-20T18:00:00.000Z',
      );

      expect(await plannedFor(plannedChain([done]))).toBeNull();
    });

    it('stands through a Service of the Action dated the same day and written before the plan', async () => {
      const done = baseline(
        CHAIN_REPLACEMENT,
        { drivetrainKm: 3000 },
        '2026-09-20T00:00:00.000Z',
        false,
        '2026-09-20T08:00:00.000Z',
      );

      expect(await plannedFor(plannedChain([done]))).toBe('2026-10-04');
    });

    // The plan follows what is on record, so deleting the Service brings it back.
    it('stands through a deleted Service of the Action', async () => {
      const deleted = baseline(CHAIN_REPLACEMENT, { drivetrainKm: 3000 }, '2026-09-25T00:00:00.000Z', true);

      expect(await plannedFor(plannedChain([deleted]))).toBe('2026-10-04');
    });

    it('stands through a Service of the Action with no Service Date', async () => {
      const undated = baseline(CHAIN_REPLACEMENT, { drivetrainKm: 3000 }, '2026-09-25T00:00:00.000Z');
      (undated.event_actions_done as { events_bikes: Record<string, unknown> }).events_bikes.service_date = null;

      expect(await plannedFor(plannedChain([undated]))).toBe('2026-10-04');
    });

    it('stands through a Service of another Action on the same part', async () => {
      const other = baseline(TYRE_REPLACEMENT, { drivetrainKm: 3000 }, '2026-09-25T00:00:00.000Z');

      expect(await plannedFor(plannedChain([other]))).toBe('2026-10-04');
    });

    // Two tyres are two Tracked Actions (ADR 0027): the rear's Service says nothing about the front's plan.
    it('stands through the same Action done on the other tyre', async () => {
      const tyre = (id: number, position: string, extra: Record<string, unknown>): Record<string, unknown> =>
        mountedPart({ id, component_type_id: TYRE_TYPE, component_types: typeRow(TYRE_TYPE), position, ...extra });
      garage(
        [intervalRow(TYRE_REPLACEMENT, { km: 2000 }, [TYRE_TYPE])],
        [
          tyre(60, 'front', { tracked_action_state: [settingRow(TYRE_REPLACEMENT, PLANNED)] }),
          tyre(61, 'rear', {
            action_done_component_map: [baseline(TYRE_REPLACEMENT, { km: 0 }, '2026-09-25T00:00:00.000Z')],
          }),
        ],
      );

      const actions = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(actions.map((action) => [action.component_mounted_id, action.planned_for])).toEqual([
        [60, '2026-10-04'],
        [61, null],
      ]);
    });

    // A missed booking is not silently lost.
    it('serves a day that has already passed', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-20T10:00:00.000Z'));
      const day = await plannedFor(plannedChain());
      jest.useRealTimers();

      expect(day).toBe('2026-10-04');
    });

    it('serves no day where the pairing has no row or no plan', async () => {
      expect(await plannedFor(mountedPart({ drivetrain_km: 3200 }))).toBeNull();
      expect(
        await plannedFor(mountedPart({ tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { notify: false })] })),
      ).toBeNull();
    });

    // A plan touches no interval, so the reading is the same with or without it.
    it('reads the same percentage, level and interval as the Action unplanned', async () => {
      garage(INTERVALS, [plannedChain()]);
      const [planned] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);
      garage(INTERVALS, [mountedPart({ drivetrain_km: 3200 })]);
      const [unplanned] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect([planned.percentage, planned.level, planned.interval]).toEqual([80, 'warning', 4000]);
      expect([unplanned.percentage, unplanned.level, unplanned.interval]).toEqual([80, 'warning', 4000]);
    });

    // The Planned card reads the garage list at 0, so a plan booked long before it is due is on it.
    it('carries the day on the garage list at any percentage', async () => {
      fleet([bikeRow(BIKE_ID, 'Santa Cruz')], INTERVALS, [
        mountedPart({ drivetrain_km: 400, tracked_action_state: [settingRow(CHAIN_REPLACEMENT, PLANNED)] }),
      ]);

      const actions = await service.getGarageTrackedActions(OWNER_ID, 0);

      expect(actions.map((action) => [action.percentage, action.planned_for])).toEqual([[10, '2026-10-04']]);
    });
  });

  describe('setTrackedActionPlan', () => {
    const INTERVALS = [intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE])];
    const NOW = new Date('2026-09-28T09:30:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(NOW);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('sets the day, stamps when it was set and answers with the day', async () => {
      const parts = [mountedPart({ drivetrain_km: 3200 })];
      garage(INTERVALS, parts);
      keepState(parts);

      const action = await service.setTrackedActionPlan(55, CHAIN_REPLACEMENT, OWNER_ID, '2026-10-04');

      expect(held(parts, 'planned_for')).toEqual({ '55:101': new Date('2026-10-04T00:00:00.000Z') });
      expect(held(parts, 'planned_at')).toEqual({ '55:101': NOW });
      expect(action.planned_for).toBe('2026-10-04');
    });

    // A rained-out Saturday is one change, and it counts as set now.
    it('moves the day and stamps it again', async () => {
      const parts = [
        mountedPart({
          drivetrain_km: 3200,
          tracked_action_state: [
            settingRow(CHAIN_REPLACEMENT, { plannedFor: '2026-10-04', plannedAt: '2026-09-20T10:00:00.000Z' }),
          ],
        }),
      ];
      garage(INTERVALS, parts);
      keepState(parts);

      const action = await service.setTrackedActionPlan(55, CHAIN_REPLACEMENT, OWNER_ID, '2026-10-11');

      expect(held(parts, 'planned_for')).toEqual({ '55:101': new Date('2026-10-11T00:00:00.000Z') });
      expect(held(parts, 'planned_at')).toEqual({ '55:101': NOW });
      expect(action.planned_for).toBe('2026-10-11');
    });

    it('clears the day and its stamp on null', async () => {
      const parts = [
        mountedPart({
          drivetrain_km: 3200,
          tracked_action_state: [
            settingRow(CHAIN_REPLACEMENT, { plannedFor: '2026-10-04', plannedAt: '2026-09-20T10:00:00.000Z' }),
          ],
        }),
      ];
      garage(INTERVALS, parts);
      keepState(parts);

      const action = await service.setTrackedActionPlan(55, CHAIN_REPLACEMENT, OWNER_ID, null);

      expect(held(parts, 'planned_for')).toEqual({ '55:101': null });
      expect(held(parts, 'planned_at')).toEqual({ '55:101': null });
      expect(action.planned_for).toBeNull();
    });

    // Today is fine, and a plan always points forward from it.
    it('takes today', async () => {
      const parts = [mountedPart({ drivetrain_km: 3200 })];
      garage(INTERVALS, parts);
      keepState(parts);

      const action = await service.setTrackedActionPlan(55, CHAIN_REPLACEMENT, OWNER_ID, '2026-09-28');

      expect(action.planned_for).toBe('2026-09-28');
    });

    it.each(['2026-09-27', '2026-02-30', 'soon', '2026-10-4'])('refuses %s and writes nothing', async (day) => {
      garage(INTERVALS, [mountedPart({ drivetrain_km: 3200 })]);

      await expect(service.setTrackedActionPlan(55, CHAIN_REPLACEMENT, OWNER_ID, day)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });

    // Somebody else's part, one that came off, or a pairing with no interval has nothing to plan.
    it.each([
      ['someone else', null, mountedPart({ drivetrain_km: 3200 }), CHAIN_REPLACEMENT],
      ['a dismounted part', BIKE_ID, mountedPart({ drivetrain_km: 3200, is_active: false }), CHAIN_REPLACEMENT],
      ['a pairing with no interval', BIKE_ID, mountedPart({ drivetrain_km: 3200 }), TYRE_REPLACEMENT],
    ])('refuses %s', async (_, ownerBike, part, actionId) => {
      mockPrismaService.bikes.findFirst.mockResolvedValue(ownerBike === null ? null : { id: ownerBike });
      garage(INTERVALS, [part]);

      await expect(service.setTrackedActionPlan(55, actionId, OWNER_ID, '2026-10-04')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrismaService.tracked_action_state.upsert).not.toHaveBeenCalled();
    });

    // Planning sends nothing on its own; every push is about wear.
    it('writes no band and announces nothing', async () => {
      const parts = [mountedPart({ drivetrain_km: 3800, tracked_action_state: [stateRow(CHAIN_REPLACEMENT, 75)] })];
      garage(INTERVALS, parts);
      keepState(parts);

      await service.setTrackedActionPlan(55, CHAIN_REPLACEMENT, OWNER_ID, '2026-10-04');

      expect(held(parts, 'reached_threshold')).toEqual({ '55:101': 75 });
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });
  });

  // What each ride wore off the Tracked Actions whose current cycle it belongs to.
  describe('getWoreOff', () => {
    const CHAIN_PLAN = intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE], BIKE_ID, true);

    // The rides stored, and the page of them asked about - every stored one unless said.
    async function woreOff(
      stored: Record<string, unknown>[],
      page: Record<string, unknown>[] = stored,
    ): Promise<Map<number, Response_WoreOffLineDto[]>> {
      mockPrismaService.rides.findMany.mockImplementation(({ where }: { where?: RideWhere }) =>
        Promise.resolve(stored.filter((ride) => matchesRide(ride, where))),
      );
      return await service.getWoreOff(OWNER_ID, page as unknown as WearRide[]);
    }

    // One ride's lines as the figures a line prints: part, action, amount, before and after.
    function figures(lines: Response_WoreOffLineDto[] | undefined): number[][] {
      return (lines ?? []).map((line) => [
        line.component_mounted_id,
        line.event_action_id,
        line.amount,
        line.before,
        line.after,
      ]);
    }

    // The two must never disagree: the latest ride ends where the reading stands now.
    it("reads the latest ride's after as the Tracked Action's percentage", async () => {
      fleet([bikeRow(BIKE_ID, 'Santa Cruz')], [CHAIN_PLAN], [mountedPart({ drivetrain_km: 3800 })]);

      const lines = await woreOff([
        rideRow(1, '2026-09-20T09:00:00.000Z', { drivetrainM: 40000 }),
        rideRow(2, '2026-09-22T09:00:00.000Z', { drivetrainM: 38000 }),
      ]);

      // 3 800 of 4 000 is 95 %; before the 38 km it read 3 762, which floors to 94.
      expect(figures(lines.get(2))).toEqual([[55, CHAIN_REPLACEMENT, 38, 94, 95]]);
    });

    // Each ride shows the reading as it stood when it ended, so everything ridden since is taken back off.
    it('rewinds an earlier ride by every ride after it, on the page or not', async () => {
      fleet([bikeRow(BIKE_ID, 'Santa Cruz')], [CHAIN_PLAN], [mountedPart({ drivetrain_km: 3800 })]);
      const first = rideRow(1, '2026-09-10T09:00:00.000Z', { drivetrainM: 40000 });

      const lines = await woreOff(
        [
          first,
          rideRow(2, '2026-09-15T09:00:00.000Z', { drivetrainM: 60000 }),
          rideRow(3, '2026-09-20T09:00:00.000Z', { drivetrainM: 100000 }),
        ],
        [first],
      );

      // 3 800 - 160 = 3 640 when it ended (91 %), 3 600 before it (90 %).
      expect(figures(lines.get(1))).toEqual([[55, CHAIN_REPLACEMENT, 40, 90, 91]]);
    });

    // A ride that is not stored any more no longer rewinds anything.
    it('leaves a deleted ride out of the rides after', async () => {
      fleet([bikeRow(BIKE_ID, 'Santa Cruz')], [CHAIN_PLAN], [mountedPart({ drivetrain_km: 3800 })]);
      const first = rideRow(1, '2026-09-10T09:00:00.000Z', { drivetrainM: 40000 });

      const lines = await woreOff(
        [first, rideRow(2, '2026-09-15T09:00:00.000Z', { drivetrainM: 400000, isDeleted: true })],
        [first],
      );

      expect(figures(lines.get(1))).toEqual([[55, CHAIN_REPLACEMENT, 40, 94, 95]]);
    });

    // Every column is filled, so only the measure the reading is taken from may count.
    it.each([
      ['a chain by its drivetrain km', CHAIN_TYPE, { km: 1000 }, 'drivetrain_km', 22, 47],
      ['a tyre by its km', TYRE_TYPE, { km: 1000 }, 'total_km', 11, 48],
      ['a fork by its suspension minutes', FORK_TYPE, { min: 1000 }, 'suspension_min', 44, 45],
      ['a brake pad by its index', PAD_TYPE, { healthIndex: 1000 }, 'health_index', 55, 44],
      ['a Tracked Action on the time axis by its duration', TYRE_TYPE, { min: 1000 }, 'total_time_min', 33, 46],
    ])('wears %s', async (_name, type, axes, column, amount, before) => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [intervalRow(TYRE_REPLACEMENT, axes, [type])],
        [mountedPart({ component_type_id: type, component_types: typeRow(type), [column]: 500 })],
      );

      const lines = await woreOff([
        rideRow(1, '2026-09-20T09:00:00.000Z', {
          distanceM: 11000,
          drivetrainM: 22000,
          durationMin: 33,
          suspensionMin: 44,
          padIndex: 55,
        }),
      ]);

      // 500 of 1 000 is 50 % once the ride ended.
      expect(figures(lines.get(1))).toEqual([[55, TYRE_REPLACEMENT, amount, before, 50]]);
      expect(lines.get(1)?.[0].measure).toBe(column);
    });

    // A ride on the day of the work counts as before it, the way the Wear Baseline froze it (ADR 0001).
    it('counts only rides after the day of the latest Service of the Action', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [CHAIN_PLAN],
        [
          mountedPart({
            drivetrain_km: 3500,
            action_done_component_map: [
              baseline(CHAIN_REPLACEMENT, { drivetrainKm: 3000 }, '2026-09-10T00:00:00.000Z'),
            ],
          }),
        ],
      );

      const lines = await woreOff([
        rideRow(1, '2026-09-09T09:00:00.000Z', { drivetrainM: 20000 }),
        rideRow(2, '2026-09-10T18:00:00.000Z', { drivetrainM: 20000 }),
        rideRow(3, '2026-09-11T08:00:00.000Z', { drivetrainM: 20000 }),
      ]);

      expect([1, 2, 3].map((id) => figures(lines.get(id)))).toEqual([[], [], [[55, CHAIN_REPLACEMENT, 20, 12, 12]]]);
    });

    it('starts no cycle at a deleted Service', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [CHAIN_PLAN],
        [
          mountedPart({
            drivetrain_km: 3500,
            action_done_component_map: [
              baseline(CHAIN_REPLACEMENT, { drivetrainKm: 3000 }, '2026-09-10T00:00:00.000Z', true),
            ],
          }),
        ],
      );

      const lines = await woreOff([rideRow(1, '2026-09-09T09:00:00.000Z', { drivetrainM: 20000 })]);

      expect(figures(lines.get(1))).toHaveLength(1);
    });

    // Nothing says when an undated Service happened, so the part is read from its mounting.
    it('counts from the mounting when the latest Service of the Action has no date', async () => {
      const undated = baseline(CHAIN_REPLACEMENT, { drivetrainKm: 3000 });
      (undated.event_actions_done as { events_bikes: Record<string, unknown> }).events_bikes.service_date = null;
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [CHAIN_PLAN],
        [mountedPart({ drivetrain_km: 3500, action_done_component_map: [undated] })],
      );

      const lines = await woreOff([rideRow(1, '2026-09-09T09:00:00.000Z', { drivetrainM: 20000 })]);

      expect(figures(lines.get(1))).toHaveLength(1);
    });

    // A part mounted after a ride was not on the bike for it.
    it('counts only rides after the day the part was mounted', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [CHAIN_PLAN],
        [mountedPart({ drivetrain_km: 500, mounted_at: new Date('2026-09-10T08:00:00.000Z') })],
      );

      const lines = await woreOff([
        rideRow(1, '2026-09-09T09:00:00.000Z', { drivetrainM: 20000 }),
        rideRow(2, '2026-09-10T18:00:00.000Z', { drivetrainM: 20000 }),
        rideRow(3, '2026-09-11T08:00:00.000Z', { drivetrainM: 20000 }),
      ]);

      expect([1, 2, 3].map((id) => figures(lines.get(id)).length)).toEqual([0, 0, 1]);
    });

    // A wear index has no Wear Baseline, so a Service does not reset it and does not start a cycle.
    it('counts a wear-index Tracked Action from the mounting whatever Services exist', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [intervalRow(PADS_REPLACEMENT, { healthIndex: 1000 }, [PAD_TYPE])],
        [
          mountedPart({
            component_type_id: PAD_TYPE,
            component_types: typeRow(PAD_TYPE),
            health_index: 300,
            mounted_at: new Date('2026-09-01T08:00:00.000Z'),
            action_done_component_map: [baseline(PADS_REPLACEMENT, {}, '2026-09-15T00:00:00.000Z')],
          }),
        ],
      );

      const lines = await woreOff([
        rideRow(1, '2026-09-10T09:00:00.000Z', { padIndex: 100 }),
        rideRow(2, '2026-09-20T09:00:00.000Z', { padIndex: 100 }),
      ]);

      expect([1, 2].map((id) => figures(lines.get(id)))).toEqual([
        [[55, PADS_REPLACEMENT, 100, 10, 20]],
        [[55, PADS_REPLACEMENT, 100, 20, 30]],
      ]);
    });

    // The line matches the reading seen everywhere else, which is measured against the override.
    it("measures against the owner's Interval Override", async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [CHAIN_PLAN],
        [
          mountedPart({
            drivetrain_km: 3800,
            tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { intervalOverride: 5000 })],
          }),
        ],
      );

      const lines = await woreOff([rideRow(1, '2026-09-20T09:00:00.000Z', { drivetrainM: 38000 })]);

      expect(figures(lines.get(1))).toEqual([[55, CHAIN_REPLACEMENT, 38, 75, 76]]);
    });

    // Muting stops the announcements and nothing else.
    it('still lists a Muted Tracked Action', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [CHAIN_PLAN],
        [
          mountedPart({
            drivetrain_km: 3800,
            tracked_action_state: [settingRow(CHAIN_REPLACEMENT, { notify: false })],
          }),
        ],
      );

      const lines = await woreOff([rideRow(1, '2026-09-20T09:00:00.000Z', { drivetrainM: 38000 })]);

      expect(figures(lines.get(1))).toHaveLength(1);
    });

    // What the ride pushed toward service leads; a Tracked Action it added nothing to is not listed at all.
    it('keeps the three closest to due after the ride, then the biggest gain, and drops what it did not wear', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [
          intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE]),
          intervalRow(TYRE_REPLACEMENT, { km: 1000 }, [TYRE_TYPE]),
          intervalRow(FORK_SERVICE, { min: 1000 }, [FORK_TYPE]),
          intervalRow(PADS_REPLACEMENT, { healthIndex: 1000 }, [PAD_TYPE]),
        ],
        [
          mountedPart({ id: 55, drivetrain_km: 2000 }),
          mountedPart({
            id: 56,
            component_type_id: FORK_TYPE,
            component_types: typeRow(FORK_TYPE),
            suspension_min: 800,
          }),
          mountedPart({ id: 57, component_type_id: PAD_TYPE, component_types: typeRow(PAD_TYPE), health_index: 990 }),
          mountedPart({ id: 52, component_type_id: TYRE_TYPE, component_types: typeRow(TYRE_TYPE), total_km: 800 }),
          mountedPart({ id: 61, component_type_id: TYRE_TYPE, component_types: typeRow(TYRE_TYPE), total_km: 900 }),
        ],
      );

      const lines = await woreOff([
        rideRow(1, '2026-09-20T09:00:00.000Z', { distanceM: 50000, drivetrainM: 40000, suspensionMin: 100 }),
      ]);

      // Rear tyre 85 → 90, fork 70 → 80 ahead of front tyre 75 → 80 by its gain; the chain is fourth, the pads wore nothing.
      expect(figures(lines.get(1))).toEqual([
        [61, TYRE_REPLACEMENT, 50, 85, 90],
        [56, FORK_SERVICE, 100, 70, 80],
        [52, TYRE_REPLACEMENT, 50, 75, 80],
      ]);
    });

    // Nothing is guessed: an Archived Bike has no Tracked Actions, and an undated ride no cycle.
    it('gives no lines to a ride on an Archived Bike or one with no start', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz', true), bikeRow(OTHER_BIKE_ID, 'Trek')],
        [CHAIN_PLAN, intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE], OTHER_BIKE_ID)],
        [mountedPart({ drivetrain_km: 3800 }), mountedPart({ id: 70, bike_id: OTHER_BIKE_ID, drivetrain_km: 3800 })],
      );

      const lines = await woreOff([
        rideRow(1, '2026-09-20T09:00:00.000Z', { drivetrainM: 38000 }),
        rideRow(2, null, { drivetrainM: 38000, bikeId: OTHER_BIKE_ID }),
      ]);

      expect([1, 2].map((id) => figures(lines.get(id)))).toEqual([[], []]);
    });

    // A ride on one bike wears nothing on another, and is not one of that bike's later rides.
    it('reads each ride against its own bike', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz'), bikeRow(OTHER_BIKE_ID, 'Trek')],
        [CHAIN_PLAN, intervalRow(CHAIN_REPLACEMENT, { km: 4000 }, [CHAIN_TYPE], OTHER_BIKE_ID)],
        [mountedPart({ drivetrain_km: 3800 }), mountedPart({ id: 70, bike_id: OTHER_BIKE_ID, drivetrain_km: 2000 })],
      );

      const lines = await woreOff([
        rideRow(1, '2026-09-20T09:00:00.000Z', { drivetrainM: 38000 }),
        rideRow(2, '2026-09-22T09:00:00.000Z', { drivetrainM: 40000, bikeId: OTHER_BIKE_ID }),
      ]);

      expect([1, 2].map((id) => figures(lines.get(id)))).toEqual([
        [[55, CHAIN_REPLACEMENT, 38, 94, 95]],
        [[70, CHAIN_REPLACEMENT, 40, 49, 50]],
      ]);
    });

    // The accumulator can read lower than the rides after it - a corrected part, a ride the sync counted twice.
    it('never reads below zero', async () => {
      fleet(
        [bikeRow(BIKE_ID, 'Santa Cruz')],
        [intervalRow(CHAIN_REPLACEMENT, { km: 100 }, [CHAIN_TYPE])],
        [mountedPart({ drivetrain_km: 20 })],
      );

      const lines = await woreOff([
        rideRow(1, '2026-09-20T09:00:00.000Z', { drivetrainM: 40000 }),
        rideRow(2, '2026-09-22T09:00:00.000Z', { drivetrainM: 30000 }),
      ]);

      expect([1, 2].map((id) => figures(lines.get(id)))).toEqual([
        [[55, CHAIN_REPLACEMENT, 40, 0, 0]],
        [[55, CHAIN_REPLACEMENT, 30, 0, 20]],
      ]);
    });

    // Named the way the Tracked Action is: a Replacement by its part, anything else by its Action.
    it('names the part and the Action on every line', async () => {
      fleet([bikeRow(BIKE_ID, 'Santa Cruz')], [CHAIN_PLAN], [mountedPart({ drivetrain_km: 3800, position: 'rear' })]);

      const lines = await woreOff([rideRow(1, '2026-09-20T09:00:00.000Z', { drivetrainM: 38000 })]);

      expect(lines.get(1)?.[0]).toMatchObject({
        component_type: 'Chain',
        position: 'rear',
        action_name: `Action ${String(CHAIN_REPLACEMENT)}`,
        replace_action: true,
        measure: 'drivetrain_km',
      });
    });
  });
});
