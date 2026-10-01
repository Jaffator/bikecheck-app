import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { getQueueToken } from '@nestjs/bullmq';
import { StravaEventsService } from './strava.service';
import { RideService } from '../ride/ride.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';

const OWNER_ID = 7;
const ORBEA = 15;
const CANYON = 16;
const ACTIVITY_ID = 98765;
const RIDDEN_AT = '2026-09-20T08:00:00.000Z';

interface Part {
  id: number;
  bike_id: number;
  is_active: boolean;
  is_deleted: boolean;
  mounted_at: Date | null;
  total_km: number;
  total_time_min: number;
  drivetrain_km: number;
  suspension_min: number;
  health_index: number;
  component_types: { component_type: string };
}

type Readings = Record<number, Omit<Part, 'component_types'>>;

interface PartWhere {
  bike_id?: number;
  is_active?: boolean;
  is_deleted?: false | { not: true };
  id?: { in: number[] };
  component_types?: { component_type: string | { in: string[] } };
}

type Ride = Record<string, unknown> & { id: number; bike_id: number; activity_strava_id: bigint };

const part = (id: number, bikeId: number, type: string, overrides: Partial<Part> = {}): Part => ({
  id,
  bike_id: bikeId,
  is_active: true,
  is_deleted: false,
  mounted_at: new Date('2026-01-01T00:00:00.000Z'),
  total_km: 500,
  total_time_min: 1000,
  drivetrain_km: 600,
  suspension_min: 200,
  health_index: 10,
  component_types: { component_type: type },
  ...overrides,
});

// The keys a wear write narrows parts by; anything else fails loudly rather than matching everything.
function matches(one: Part, where: PartWhere): boolean {
  const unknown = Object.keys(where).filter(
    (key) => !['bike_id', 'is_active', 'is_deleted', 'id', 'component_types'].includes(key),
  );
  if (unknown.length > 0) throw new Error(`The fake cannot filter parts by ${unknown.join(', ')}`);

  const type = where.component_types?.component_type;
  const kinds = typeof type === 'string' ? [type] : type?.in;
  return (
    (where.bike_id === undefined || one.bike_id === where.bike_id) &&
    (where.is_active === undefined || one.is_active === where.is_active) &&
    (where.is_deleted === undefined || !one.is_deleted) &&
    (where.id === undefined || where.id.in.includes(one.id)) &&
    (kinds === undefined || kinds.includes(one.component_types.component_type))
  );
}

function written(current: number, value: number | { increment: number }): number {
  return typeof value === 'number' ? value : current + value.increment;
}

describe('StravaEventsService ride wear', () => {
  let strava: StravaEventsService;
  let rideService: RideService;
  let parts: Part[];
  let rides: Ride[];

  const db = {
    users: { findFirst: jest.fn() },
    bikes: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    strava_pending_activities: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    rides: {
      // A copy, as a database read is: the upsert that follows must not rewrite what was read.
      findUnique: jest.fn(({ where }: { where: { activity_strava_id: bigint } }) => {
        const ride = rides.find((one) => one.activity_strava_id === where.activity_strava_id);
        return Promise.resolve(ride ? { ...ride } : null);
      }),
      findFirst: jest.fn(({ where }: { where: { id: number } }) => {
        const ride = rides.find((one) => one.id === where.id);
        return Promise.resolve(ride ? { ...ride } : null);
      }),
      update: jest.fn(({ where, data }: { where: { id: number }; data: Partial<Ride> }) =>
        Promise.resolve(Object.assign(rides.find((one) => one.id === where.id) ?? {}, data)),
      ),
      upsert: jest.fn(
        ({ where, create, update }: { where: { activity_strava_id: bigint }; create: Ride; update: Partial<Ride> }) => {
          const saved = rides.find((ride) => ride.activity_strava_id === where.activity_strava_id);
          if (saved) return Promise.resolve(Object.assign(saved, update));
          const ride = { ...create, id: rides.length + 1 };
          rides.push(ride);
          return Promise.resolve(ride);
        },
      ),
    },
    components_mounted: {
      findMany: jest.fn(({ where }: { where: PartWhere }) =>
        Promise.resolve(parts.filter((one) => matches(one, where)).map((one) => ({ ...one }))),
      ),
      updateMany: jest.fn(({ where, data }: { where: PartWhere; data: Record<string, { increment: number }> }) => {
        const hit = parts.filter((one) => matches(one, where));
        hit.forEach((one) => write(one, data));
        return Promise.resolve({ count: hit.length });
      }),
      update: jest.fn(({ where, data }: { where: { id: number }; data: Record<string, number> }) => {
        const one = parts.find((candidate) => candidate.id === where.id);
        if (one) write(one, data);
        return Promise.resolve(one);
      }),
    },
    // A move writes in one transaction; the fake hands the callback the same garage.
    $transaction: jest.fn((run: (tx: unknown) => Promise<unknown>) => run(db)),
  };

  function write(one: Part, data: Record<string, number | { increment: number }>): void {
    const accumulators = one as unknown as Record<string, number>;
    for (const [column, value] of Object.entries(data)) accumulators[column] = written(accumulators[column], value);
  }

  // Copied, so a snapshot taken before a write still reads what it read.
  function readings(): Readings {
    return Object.fromEntries(parts.map(({ component_types: _type, ...one }) => [one.id, { ...one }]));
  }

  // Whole figures, as analyzeStravaData floors them, so a move takes back exactly what a save gave.
  function rideOn(analyzed: Record<string, unknown> = {}): Parameters<StravaEventsService['saveAnalyzedData']>[0] {
    return {
      activity_id: ACTIVITY_ID,
      athleteid: 424242,
      gearid: 'b123456',
      analyzedData: {
        rawJson: {},
        name: 'Morning ride',
        started_at: RIDDEN_AT,
        distance_km: 42,
        drivetrain_km: 38,
        duration_min: 120,
        suspension_minutes: 90,
        health_index_brake_pad: 4,
        descent_min: 9,
        elevation_up_m: 612,
        elevation_down_m: 600,
        speed_avg: 21,
        max_speed_kmh: 55,
        ...analyzed,
      },
    } as Parameters<StravaEventsService['saveAnalyzedData']>[0];
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    parts = [];
    rides = [];
    db.users.findFirst.mockResolvedValue({ id: OWNER_ID });
    // Strava's gear names the Orbea; a move names its bike by id.
    db.bikes.findFirst.mockImplementation(({ where }: { where: { id?: number } }) =>
      Promise.resolve({ id: where.id ?? ORBEA }),
    );
    db.bikes.findUnique.mockResolvedValue({ total_elevation_m: 0, bike_brand: 'Orbea', bike_model: 'Occam', year: 2024 });
    db.strava_pending_activities.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StravaEventsService,
        RideService,
        { provide: PrismaService, useValue: db },
        { provide: NotificationService, useValue: { create: jest.fn(), resolveActivityAsk: jest.fn() } },
        { provide: ServiceTrackingService, useValue: { evaluateBike: jest.fn(), evaluateBikes: jest.fn() } },
        { provide: getQueueToken('gemini-queue'), useValue: { add: jest.fn() } },
        { provide: getLoggerToken(StravaEventsService.name), useValue: { info: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    strava = module.get(StravaEventsService);
    rideService = module.get(RideService);
  });

  // 42 km, 38 drivetrain km, 2 h, 90 suspension minutes and pad index 4, each on the parts that measure it.
  it('gives an active part mounted before the ride all of its wear', async () => {
    parts = [
      part(10, ORBEA, 'Chain'),
      part(11, ORBEA, 'Fork'),
      part(12, ORBEA, 'Brake pad'),
      part(13, ORBEA, 'Tyre', { mounted_at: null }),
    ];

    await strava.saveAnalyzedData(rideOn());

    expect(readings()).toMatchObject({
      10: { total_km: 542, total_time_min: 1120, drivetrain_km: 638, suspension_min: 200, health_index: 10 },
      11: { total_km: 542, total_time_min: 1120, drivetrain_km: 600, suspension_min: 290, health_index: 10 },
      12: { total_km: 542, total_time_min: 1120, drivetrain_km: 600, suspension_min: 200, health_index: 14 },
      13: { total_km: 542, total_time_min: 1120 },
    });
  });

  // A dismounted part stops accumulating, even while it is kept rather than deleted.
  it('gives a dismounted part no wear from a new ride', async () => {
    parts = [part(10, ORBEA, 'Chain', { is_active: false })];
    const before = readings();

    await strava.saveAnalyzedData(rideOn());

    expect(readings()).toEqual(before);
  });

  // A part carries rides from the day after its mount day (ADR 0001), however late the ride arrives.
  it('gives no wear to a part mounted after a backfilled ride day', async () => {
    parts = [
      part(10, ORBEA, 'Chain', { mounted_at: new Date('2026-09-25T00:00:00.000Z') }),
      part(11, ORBEA, 'Tyre', { mounted_at: new Date('2026-09-20T06:00:00.000Z') }),
    ];
    const before = readings();
    db.strava_pending_activities.findFirst.mockResolvedValue({
      id: 1,
      activity_id: BigInt(ACTIVITY_ID),
      analyzed_data: rideOn().analyzedData,
    });

    await strava.resolvePendingActivities_noGear({
      bikeId: ORBEA,
      userId: OWNER_ID,
      activityId: BigInt(ACTIVITY_ID),
      gearId: null,
    });

    expect(readings()).toEqual(before);
  });

  // Strava resends a ride it has corrected; only the change lands, and only where the ride did.
  it('grows only the same parts on a re-sync, by the difference', async () => {
    parts = [
      part(10, ORBEA, 'Chain'),
      part(11, ORBEA, 'Chain', { is_active: false }),
      part(12, ORBEA, 'Tyre', { mounted_at: new Date('2026-09-25T00:00:00.000Z') }),
      part(13, ORBEA, 'Fork'),
      part(14, ORBEA, 'Brake pad'),
    ];
    await strava.saveAnalyzedData(rideOn());

    await strava.saveAnalyzedData(
      rideOn({ distance_km: 45, drivetrain_km: 40, duration_min: 130, suspension_minutes: 95, health_index_brake_pad: 6 }),
    );

    expect(readings()).toMatchObject({
      10: { total_km: 545, total_time_min: 1130, drivetrain_km: 640 },
      11: { total_km: 500, total_time_min: 1000, drivetrain_km: 600 },
      12: { total_km: 500, total_time_min: 1000, drivetrain_km: 600 },
      13: { total_km: 545, total_time_min: 1130, suspension_min: 295 },
      14: { total_km: 545, total_time_min: 1130, health_index: 16 },
    });
  });

  // Moving a ride away takes back exactly what saving it gave, so moving it back restores the save.
  it('restores every part when a saved ride moves to another bike and back', async () => {
    parts = [
      part(10, ORBEA, 'Chain'),
      part(11, ORBEA, 'Chain', { is_active: false }),
      part(12, ORBEA, 'Fork', { mounted_at: new Date('2026-09-25T00:00:00.000Z') }),
      part(13, ORBEA, 'Brake pad'),
      part(20, CANYON, 'Chain', { total_km: 0, total_time_min: 0, drivetrain_km: 0 }),
      part(21, CANYON, 'Shock', { mounted_at: null }),
    ];
    const unridden = readings();
    await strava.saveAnalyzedData(rideOn());
    const saved = readings();
    const [{ id: rideId }] = rides;

    await rideService.changeBike(OWNER_ID, rideId, CANYON);
    expect(onBike(readings(), ORBEA)).toEqual(onBike(unridden, ORBEA));

    await rideService.changeBike(OWNER_ID, rideId, ORBEA);
    expect(readings()).toEqual(saved);
  });
});

function onBike(all: Readings, bikeId: number): Readings {
  return Object.fromEntries(Object.entries(all).filter(([, one]) => one.bike_id === bikeId));
}
