import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RideService } from './ride.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';
import { GeminiService } from '../gemini/gemini.service';

describe('RideService', () => {
  let service: RideService;

  // What each ride wore off is Service Tracking's to say; this suite only reads the ride itself.
  const mockServiceTracking = { getWoreOff: jest.fn(), evaluateBikes: jest.fn() };
  // Gemini is the outside world: the suite checks what is sent to it, not what it writes.
  const mockGemini = { rideSummary: jest.fn() };

  const mockPrisma = {
    rides: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bikes: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    components_mounted: { findMany: jest.fn(), update: jest.fn() },
    strava_pending_activities: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockServiceTracking.getWoreOff.mockResolvedValue(new Map());
    // The move runs its writes in one transaction; the fake hands the callback itself.
    mockPrisma.$transaction.mockImplementation((write: (tx: typeof mockPrisma) => Promise<unknown>) => write(mockPrisma));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RideService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ServiceTrackingService, useValue: mockServiceTracking },
        { provide: GeminiService, useValue: mockGemini },
      ],
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
      expect(args.where).toEqual({
        user_id: 1,
        is_deleted: { not: true },
        bikes: { is_deleted: { not: true } },
      });
      // Nulls last: a ride with no start date must not head the list.
      expect(args.orderBy).toEqual({ started_at: { sort: 'desc', nulls: 'last' } });
      expect(args.take).toBe(20);
      expect(args.skip).toBe(0);
    });

    // An Archived Bike leaves the garage, so its rides leave the list with it - and the
    // count under the list has to agree with what is in it.
    it('leaves an archived bike rides out of the page and out of its total', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([]);
      mockPrisma.rides.count.mockResolvedValue(0);

      await service.findPage(1, 20, 0);

      const listWhere = mockPrisma.rides.findMany.mock.calls[0][0].where;
      const countWhere = mockPrisma.rides.count.mock.calls[0][0].where;
      expect(listWhere).toMatchObject({ bikes: { is_deleted: { not: true } } });
      expect(countWhere).toEqual(listWhere);
    });

    // What the archive dialog counts before it asks: this bike's rides, and only its own.
    it('narrows to one bike when asked for one', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([]);
      mockPrisma.rides.count.mockResolvedValue(3);

      const page = await service.findPage(1, 1, 0, 7);

      expect(mockPrisma.rides.count).toHaveBeenCalledWith({
        where: { user_id: 1, is_deleted: { not: true }, bike_id: 7 },
      });
      expect(page.total).toBe(3);
    });

    it('serialises the BigInt activity id as a string', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        {
          id: 5,
          activity_strava_id: BigInt('13579246810'),
          bike_id: 7,
          bikes: { bike_brand: 'Specialized', bike_model: 'Tarmac SL7', year: 2022 },
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
        {
          id: 5,
          activity_strava_id: null,
          bike_id: 7,
          bikes: { bike_brand: 'Specialized', bike_model: 'Tarmac SL7', year: 2022 },
          json_data: null,
        },
      ]);
      mockPrisma.rides.count.mockResolvedValue(1);

      const page = await service.findPage(1, 20, 0);

      expect(page.items[0].bike_name).toBe('Specialized Tarmac SL7 2022');
      // The relation itself does not travel to the client.
      expect(page.items[0]).not.toHaveProperty('bikes');
    });

    it('names the bike by what it is, never by the nickname its owner gave it', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        {
          id: 5,
          activity_strava_id: null,
          bike_id: 7,
          bikes: { bike_brand: 'Specialized', bike_model: 'Epic EVO', year: null },
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
          bikes: { bike_brand: 'Specialized', bike_model: 'Tarmac SL7', year: 2022 },
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

    it('lifts the sport type out of the payload', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        {
          id: 5,
          activity_strava_id: null,
          bike_id: 7,
          bikes: null,
          json_data: JSON.stringify({ name: 'Morning Ride', sport_type: 'MountainBikeRide', type: 'Ride' }),
        },
        { id: 6, activity_strava_id: null, bike_id: 7, bikes: null, json_data: { name: 'Old Ride' } },
      ]);
      mockPrisma.rides.count.mockResolvedValue(2);

      const page = await service.findPage(1, 20, 0);

      expect(page.items[0].sport_type).toBe('MountainBikeRide');
      // A payload without one says nothing, rather than guessing from the older `type`.
      expect(page.items[1].sport_type).toBeNull();
    });

    it('reads a ride recorded without GPS as having no route', async () => {
      mockPrisma.rides.findMany.mockResolvedValue([
        {
          id: 5,
          activity_strava_id: null,
          bike_id: 7,
          bikes: { bike_brand: 'Specialized', bike_model: 'Tarmac SL7', year: 2022 },
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

  // A ride and the garage it was ridden in, shared by the cases that move its wear.
  const OLD_BIKE = 1;
  const NEW_BIKE = 2;

  interface Part {
    id: number;
    bike_id: number;
    mounted_at: Date | null;
    total_km: number;
    total_time_min: number;
    drivetrain_km: number;
    suspension_min: number;
    health_index: number;
    component_types: { component_type: string };
  }

  const part = (id: number, bikeId: number, type: string, overrides: Partial<Part> = {}): Part => ({
    id,
    bike_id: bikeId,
    mounted_at: new Date('2026-01-01T00:00:00.000Z'),
    total_km: 500,
    total_time_min: 1000,
    drivetrain_km: 600,
    suspension_min: 200,
    health_index: 10,
    component_types: { component_type: type },
    ...overrides,
  });

  // 32 km, 38 drivetrain km, 2 h, 90 suspension minutes, index 4, 612 m up.
  const ride = {
    id: 5,
    bike_id: OLD_BIKE,
    started_at: new Date('2026-09-20T08:00:00.000Z') as Date | null,
    distance_m: 32000,
    drivetrain_meters: 38000,
    duration_min: 120,
    suspension_min: 90,
    health_index_brake_pad: 4,
    elevation_up_m: 612.4,
  };

  // Each bike's mounted parts and climbing; the service picks which parts the ride wore.
  function garage(parts: Part[], climbing: Record<number, number> = { [OLD_BIKE]: 1000, [NEW_BIKE]: 0 }): void {
    mockPrisma.rides.findFirst.mockResolvedValue(ride);
    mockPrisma.bikes.findFirst.mockResolvedValue({ id: NEW_BIKE });
    mockPrisma.components_mounted.findMany.mockImplementation(({ where }: { where: { bike_id: number } }) =>
      Promise.resolve(parts.filter((one) => one.bike_id === where.bike_id)),
    );
    mockPrisma.bikes.findUnique.mockImplementation(({ where }: { where: { id: number } }) =>
      Promise.resolve({ total_elevation_m: climbing[where.id] }),
    );
  }

  // What each part was set to, by id.
  function written(): Map<number, Record<string, number>> {
    const calls = mockPrisma.components_mounted.update.mock.calls as [
      { where: { id: number }; data: Record<string, number> },
    ][];
    return new Map(calls.map(([args]) => [args.where.id, args.data]));
  }

  describe('changeBike', () => {
    it('moves every measure off the old bike parts and onto the new bike parts', async () => {
      garage([
        part(10, OLD_BIKE, 'Chain'),
        part(11, OLD_BIKE, 'Fork'),
        part(12, OLD_BIKE, 'Brake pad'),
        part(20, NEW_BIKE, 'Chain', { total_km: 100, total_time_min: 300, drivetrain_km: 120 }),
        part(21, NEW_BIKE, 'Shock', { suspension_min: 0 }),
      ]);

      await service.changeBike(7, 5, NEW_BIKE);

      const parts = written();
      expect(parts.get(10)).toEqual({ total_km: 468, total_time_min: 880, drivetrain_km: 562 });
      expect(parts.get(11)).toEqual({ total_km: 468, total_time_min: 880, suspension_min: 110 });
      expect(parts.get(12)).toEqual({ total_km: 468, total_time_min: 880, health_index: 6 });
      expect(parts.get(20)).toEqual({ total_km: 132, total_time_min: 420, drivetrain_km: 158 });
      expect(parts.get(21)).toEqual({ total_km: 532, total_time_min: 1120, suspension_min: 90 });
    });

    // A part carries rides from the day after its mount day, the same rule as its Wear Baseline (ADR 0001).
    it('leaves alone parts mounted on the ride day or later, on both bikes', async () => {
      garage([
        part(10, OLD_BIKE, 'Chain', { mounted_at: new Date('2026-09-23T00:00:00.000Z') }),
        part(11, OLD_BIKE, 'Tyre', { mounted_at: new Date('2026-09-19T18:00:00.000Z') }),
        part(12, OLD_BIKE, 'Tyre', { mounted_at: new Date('2026-09-20T06:00:00.000Z') }),
        part(20, NEW_BIKE, 'Chain', { mounted_at: new Date('2026-09-20T00:00:00.000Z') }),
      ]);

      await service.changeBike(7, 5, NEW_BIKE);

      const parts = written();
      expect(parts.has(10)).toBe(false);
      expect(parts.has(12)).toBe(false);
      expect(parts.has(20)).toBe(false);
      expect(parts.get(11)).toEqual({ total_km: 468, total_time_min: 880 });
    });

    // A part corrected down since the ride cannot go below nothing.
    it('clamps an old bike reading at zero', async () => {
      garage([part(10, OLD_BIKE, 'Tyre', { total_km: 10, total_time_min: 30 })]);

      await service.changeBike(7, 5, NEW_BIKE);

      expect(written().get(10)).toEqual({ total_km: 0, total_time_min: 0 });
    });

    // Nothing says when a ride with no start happened, so every mounted part is taken to have carried it.
    it('moves a ride with no start between every mounted part', async () => {
      garage([part(10, OLD_BIKE, 'Tyre', { mounted_at: new Date('2026-09-25T00:00:00.000Z') })]);
      mockPrisma.rides.findFirst.mockResolvedValue({ ...ride, started_at: null });

      await service.changeBike(7, 5, NEW_BIKE);

      expect(written().get(10)).toEqual({ total_km: 468, total_time_min: 880 });
    });

    it('moves the climbing between the bikes', async () => {
      garage([], { [OLD_BIKE]: 400, [NEW_BIKE]: 50 });

      await service.changeBike(7, 5, NEW_BIKE);

      expect(mockPrisma.bikes.update).toHaveBeenCalledWith({ where: { id: OLD_BIKE }, data: { total_elevation_m: 0 } });
      expect(mockPrisma.bikes.update).toHaveBeenCalledWith({ where: { id: NEW_BIKE }, data: { total_elevation_m: 662 } });
    });

    it('puts the ride on the new bike and evaluates both bikes', async () => {
      garage([]);

      await service.changeBike(7, 5, NEW_BIKE);

      expect(mockPrisma.rides.update.mock.calls[0][0]).toMatchObject({ where: { id: 5 }, data: { bike_id: NEW_BIKE } });
      expect(mockServiceTracking.evaluateBikes).toHaveBeenCalledWith([OLD_BIKE, NEW_BIKE], 7);
    });

    // The review names the bike, so the next open writes one about the bike the ride is on now.
    it('clears the ride review', async () => {
      garage([]);

      await service.changeBike(7, 5, NEW_BIKE);

      expect(mockPrisma.rides.update.mock.calls[0][0]).toMatchObject({ where: { id: 5 }, data: { summary: null } });
    });

    it('writes nothing when the ride is already on that bike', async () => {
      garage([part(10, OLD_BIKE, 'Chain')]);

      await service.changeBike(7, 5, OLD_BIKE);

      expect(mockPrisma.components_mounted.update).not.toHaveBeenCalled();
      expect(mockPrisma.rides.update).not.toHaveBeenCalled();
    });

    it('refuses a ride that is not the user own, is deleted, or is on an archived bike', async () => {
      garage([]);
      mockPrisma.rides.findFirst.mockResolvedValue(null);

      await expect(service.changeBike(7, 5, NEW_BIKE)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.rides.findFirst.mock.calls[0][0].where).toEqual({
        id: 5,
        user_id: 7,
        is_deleted: { not: true },
        bikes: { is_deleted: { not: true } },
      });
    });

    // An Archived Bike is readable but never writable (ADR 0024).
    it('refuses a bike that is not the user own or is archived', async () => {
      garage([]);
      mockPrisma.bikes.findFirst.mockResolvedValue(null);

      await expect(service.changeBike(7, 5, NEW_BIKE)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.bikes.findFirst.mock.calls[0][0].where).toEqual({
        id: NEW_BIKE,
        user_id: 7,
        is_deleted: { not: true },
      });
      expect(mockPrisma.rides.update).not.toHaveBeenCalled();
    });
  });

  describe('dismiss', () => {
    const stravaRide = {
      ...ride,
      activity_strava_id: BigInt('13579246810'),
      json_data: JSON.stringify({ name: 'Morning Ride', map: { summary_polyline: 'ki}fH' } }),
      elevation_down_m: 598,
      speed_avg: 16,
      max_speed_kmh: 54,
      descent_min: 31,
    };

    // The Strava ride above, saved on the old bike among these parts.
    function saved(parts: Part[]): void {
      garage(parts);
      mockPrisma.rides.findFirst.mockResolvedValue(stravaRide);
    }

    // The parts a bike change would take the ride from: mounted before the ride day.
    it('takes the ride wear off exactly the parts a bike change would take it from', async () => {
      saved([
        part(10, OLD_BIKE, 'Chain'),
        part(11, OLD_BIKE, 'Fork'),
        part(12, OLD_BIKE, 'Brake pad'),
        part(13, OLD_BIKE, 'Tyre', { mounted_at: new Date('2026-09-20T06:00:00.000Z') }),
      ]);

      await service.dismiss(7, 5);

      const parts = written();
      expect(parts.get(10)).toEqual({ total_km: 468, total_time_min: 880, drivetrain_km: 562 });
      expect(parts.get(11)).toEqual({ total_km: 468, total_time_min: 880, suspension_min: 110 });
      expect(parts.get(12)).toEqual({ total_km: 468, total_time_min: 880, health_index: 6 });
      expect(parts.has(13)).toBe(false);
      expect(mockPrisma.bikes.update).toHaveBeenCalledWith({
        where: { id: OLD_BIKE },
        data: { total_elevation_m: 388 },
      });
    });

    // "Resolved and no ride" is what the Strava webhook and sync read as dismissed.
    it('deletes the ride and leaves a resolved pending row, so the activity reads as dismissed', async () => {
      saved([]);

      await service.dismiss(7, 5);

      expect(mockPrisma.rides.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      const upsert = mockPrisma.strava_pending_activities.upsert.mock.calls[0][0];
      expect(upsert.where).toEqual({ activity_id: BigInt('13579246810') });
      expect(upsert.create).toMatchObject({ activity_id: BigInt('13579246810'), user_id: 7 });
      expect(upsert.create.resolved_at).toBeInstanceOf(Date);
      expect(upsert.update.resolved_at).toBeInstanceOf(Date);
    });

    // analyzed_data is required, so the row carries the ride as a pending row would.
    it('stores the ride own figures as the pending row analysis', async () => {
      saved([]);

      await service.dismiss(7, 5);

      expect(mockPrisma.strava_pending_activities.upsert.mock.calls[0][0].create.analyzed_data).toEqual({
        rawJson: { name: 'Morning Ride', map: { summary_polyline: 'ki}fH' } },
        started_at: '2026-09-20T08:00:00.000Z',
        name: 'Morning Ride',
        summary_polyline: 'ki}fH',
        suspension_minutes: 90,
        health_index_brake_pad: 4,
        descent_min: 31,
        drivetrain_km: 38,
        distance_km: 32,
        duration_min: 120,
        elevation_up_m: 612.4,
        elevation_down_m: 598,
        speed_avg: 16,
        max_speed_kmh: 54,
      });
    });

    it('evaluates the bike the wear came off', async () => {
      saved([]);

      await service.dismiss(7, 5);

      expect(mockServiceTracking.evaluateBikes).toHaveBeenCalledWith([OLD_BIKE], 7);
    });

    it('refuses another user ride and writes nothing', async () => {
      saved([part(10, OLD_BIKE, 'Chain')]);
      mockPrisma.rides.findFirst.mockResolvedValue(null);

      await expect(service.dismiss(8, 5)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.rides.findFirst.mock.calls[0][0].where).toMatchObject({ id: 5, user_id: 8 });
      expect(mockPrisma.components_mounted.update).not.toHaveBeenCalled();
      expect(mockPrisma.rides.delete).not.toHaveBeenCalled();
      expect(mockPrisma.strava_pending_activities.upsert).not.toHaveBeenCalled();
    });

    // Nothing can send a ride without a Strava id again, so there is nothing to mark.
    it('deletes a ride with no Strava id, with its wear, and writes no pending row', async () => {
      saved([part(10, OLD_BIKE, 'Tyre')]);
      mockPrisma.rides.findFirst.mockResolvedValue({ ...stravaRide, activity_strava_id: null });

      await service.dismiss(7, 5);

      expect(written().get(10)).toEqual({ total_km: 468, total_time_min: 880 });
      expect(mockPrisma.rides.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(mockPrisma.strava_pending_activities.upsert).not.toHaveBeenCalled();
    });
  });

  describe('removeStravaRide', () => {
    const ACTIVITY_ID = BigInt('13579246810');
    const stravaRide = { ...ride, activity_strava_id: ACTIVITY_ID, bikes: { is_deleted: false } };

    it('takes the ride wear off its parts, deletes it and evaluates the bike', async () => {
      garage([part(10, OLD_BIKE, 'Chain')]);
      mockPrisma.rides.findFirst.mockResolvedValue(stravaRide);

      await service.removeStravaRide(7, ACTIVITY_ID);

      expect(mockPrisma.rides.findFirst.mock.calls[0][0].where).toMatchObject({
        activity_strava_id: ACTIVITY_ID,
        user_id: 7,
      });
      expect(written().get(10)).toEqual({ total_km: 468, total_time_min: 880, drivetrain_km: 562 });
      expect(mockPrisma.rides.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(mockServiceTracking.evaluateBikes).toHaveBeenCalledWith([OLD_BIKE], 7);
    });

    // The activity is gone from Strava, so nothing can send it again.
    it('writes no pending row', async () => {
      garage([]);
      mockPrisma.rides.findFirst.mockResolvedValue(stravaRide);

      await service.removeStravaRide(7, ACTIVITY_ID);

      expect(mockPrisma.strava_pending_activities.upsert).not.toHaveBeenCalled();
    });

    // An Archived Bike is never written to (ADR 0024), but the gone activity must not come back with it.
    it('deletes a ride on an archived bike without touching the bike', async () => {
      garage([part(10, OLD_BIKE, 'Chain')]);
      mockPrisma.rides.findFirst.mockResolvedValue({ ...stravaRide, bikes: { is_deleted: true } });

      await service.removeStravaRide(7, ACTIVITY_ID);

      expect(mockPrisma.rides.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(mockPrisma.components_mounted.update).not.toHaveBeenCalled();
      expect(mockPrisma.bikes.update).not.toHaveBeenCalled();
      expect(mockServiceTracking.evaluateBikes).not.toHaveBeenCalled();
    });

    // The user deleted it first; the webhook must not fail on it.
    it('does nothing when the ride is already gone', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue(null);

      await service.removeStravaRide(7, ACTIVITY_ID);

      expect(mockPrisma.components_mounted.update).not.toHaveBeenCalled();
      expect(mockPrisma.rides.delete).not.toHaveBeenCalled();
      expect(mockServiceTracking.evaluateBikes).not.toHaveBeenCalled();
    });
  });

  describe('findSummary', () => {
    // 32.4 km, 2 h, 612 m up and 598 m down on the Orbea, with no review yet.
    const unreviewed = {
      id: 5,
      summary: null as string | null,
      started_at: new Date('2026-09-20T08:00:00.000Z'),
      distance_m: 32400,
      duration_min: 120,
      elevation_up_m: 612,
      elevation_down_m: 598,
      speed_avg: 16,
      max_speed_kmh: 54,
      json_data: JSON.stringify({ name: 'Morning ride', sport_type: 'MountainBikeRide' }),
      bikes: { bike_brand: 'Orbea', bike_model: 'Rallon', year: 2024 },
      users: { language: 'cs' },
    };

    it('sends Gemini the ride figures, its name, sport and bike, and nothing else of the payload', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue({
        ...unreviewed,
        json_data: JSON.stringify({
          name: 'Morning ride',
          sport_type: 'MountainBikeRide',
          average_watts: 182.4,
          max_watts: 640,
          weighted_average_watts: 201,
          start_latlng: [50.08, 14.42],
          end_latlng: [50.09, 14.43],
          map: { summary_polyline: 'u{~vFvyys@fS]' },
          description: 'With Pete',
          private_note: 'Knee hurts again',
          average_heartrate: 151,
          max_heartrate: 182,
          athlete: { id: 424242 },
          location_city: 'Praha',
          gear: { name: 'Strava calls it the Rallon' },
        }),
      });
      mockGemini.rideSummary.mockResolvedValue('A review');

      await service.findSummary(7, 5);

      expect(mockGemini.rideSummary.mock.calls[0][0]).toEqual({
        name: 'Morning ride',
        sport_type: 'MountainBikeRide',
        started_at: '2026-09-20T08:00:00.000Z',
        bike: 'Orbea Rallon 2024',
        distance_km: 32.4,
        duration_min: 120,
        elevation_up_m: 612,
        elevation_down_m: 598,
        speed_avg_kmh: 16,
        max_speed_kmh: 54,
        average_watts: 182,
        max_watts: 640,
        weighted_average_watts: 201,
      });
    });

    it('writes the review in the rider language and keeps it on the ride', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue(unreviewed);
      mockGemini.rideSummary.mockResolvedValue('Pořádná enduro jízda, 4/5.');

      const result = await service.findSummary(7, 5);

      expect(result).toEqual({ summary: 'Pořádná enduro jízda, 4/5.' });
      expect(mockGemini.rideSummary.mock.calls[0][1]).toBe('cs');
      expect(mockPrisma.rides.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { summary: 'Pořádná enduro jízda, 4/5.' },
      });
    });

    it('returns a kept review without asking Gemini again', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue({ ...unreviewed, summary: 'Already written' });

      const result = await service.findSummary(7, 5);

      expect(result).toEqual({ summary: 'Already written' });
      expect(mockGemini.rideSummary).not.toHaveBeenCalled();
      expect(mockPrisma.rides.update).not.toHaveBeenCalled();
    });

    it('refuses a ride that is not the user own, is deleted, or is on an archived bike', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue(null);

      await expect(service.findSummary(7, 5)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.rides.findFirst.mock.calls[0][0].where).toEqual({
        id: 5,
        user_id: 7,
        is_deleted: { not: true },
        bikes: { is_deleted: { not: true } },
      });
      expect(mockGemini.rideSummary).not.toHaveBeenCalled();
    });
  });
});
