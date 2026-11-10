import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import axios from 'axios';
import { StravaEventsService } from './strava.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';
import { RideService } from '../ride/ride.service';
import { GeminiService } from '../gemini/gemini.service';

jest.mock('axios');

const OWNER_ID = 7;
const BIKE_ID = 15;
const GEAR_ID = 'b123456';
const ATHLETE_ID = 424242;
// An Archived Bike must not be offered a ride, so both paths carry this condition.
const NOT_ARCHIVED = { is_deleted: { not: true } };

describe('StravaEventsService', () => {
  let service: StravaEventsService;

  const mockPrisma = {
    users: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    bikes: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    strava_pending_activities: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    rides: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    components_mounted: { findMany: jest.fn(), updateMany: jest.fn() },
  };

  const mockNotifications = { create: jest.fn(), resolveActivityAsk: jest.fn() };
  const mockServiceTracking = { evaluateBike: jest.fn(), evaluateBikes: jest.fn(), getWearPreview: jest.fn() };
  const mockRides = { removeStravaRide: jest.fn(), writeArrivalSummary: jest.fn() };
  const mockGemini = { rideSummary: jest.fn() };
  const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

  // What strava-service hands the monolith once a ride has been analysed.
  const activity = (gearid: string | null = GEAR_ID): Parameters<StravaEventsService['saveAnalyzedData']>[0] =>
    ({
      activity_id: 98765,
      athleteid: ATHLETE_ID,
      gearid,
      analyzedData: { distance_km: 42.3, name: 'Morning ride' },
    }) as unknown as Parameters<StravaEventsService['saveAnalyzedData']>[0];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StravaEventsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotifications },
        { provide: ServiceTrackingService, useValue: mockServiceTracking },
        { provide: RideService, useValue: mockRides },
        { provide: GeminiService, useValue: mockGemini },
        { provide: getLoggerToken(StravaEventsService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<StravaEventsService>(StravaEventsService);

    mockPrisma.users.findFirst.mockResolvedValue({ id: OWNER_ID });
    mockPrisma.users.findUnique.mockResolvedValue({ strava_athlete_id: String(ATHLETE_ID) });
    mockPrisma.bikes.findMany.mockResolvedValue([]);
    mockPrisma.strava_pending_activities.findUnique.mockResolvedValue(null);
    mockPrisma.strava_pending_activities.upsert.mockResolvedValue({});
    // No ride saved yet unless a case says so, so the gear decides the bike.
    mockPrisma.rides.findUnique.mockResolvedValue(null);
    mockPrisma.components_mounted.findMany.mockResolvedValue([]);
  });

  describe('gear resolution', () => {
    // Archiving clears the gear id, so this only guards a row archived by another route -
    // but the ride must land nowhere rather than on a bike nobody is watching (ADR 0024).
    it('skips an archived bike when resolving the gear a ride arrived on', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(null);

      await service.saveAnalyzedData(activity());

      expect(mockPrisma.bikes.findFirst).toHaveBeenCalledWith({
        where: { strava_gear_id: GEAR_ID, user_id: OWNER_ID, ...NOT_ARCHIVED },
        select: { id: true },
      });
    });

    it('saves the ride against a bike still in use', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      const saveRide = jest.spyOn(service, 'saveRide').mockResolvedValue({ message: 'saved', isNew: false });

      await service.saveAnalyzedData(activity());

      expect(saveRide).toHaveBeenCalledWith(BIKE_ID, OWNER_ID, 98765, expect.anything());
    });

    // The owner may have moved the ride off Strava's gear; an update webhook must not undo that.
    it('keeps an existing ride on the bike it is on, whatever gear Strava sends', async () => {
      mockPrisma.strava_pending_activities.findUnique.mockResolvedValue(null);
      mockPrisma.rides.findUnique.mockResolvedValue({ bike_id: 22 });
      mockPrisma.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      const saveRide = jest.spyOn(service, 'saveRide').mockResolvedValue({ message: 'saved', isNew: false });

      await service.saveAnalyzedData(activity());

      expect(saveRide).toHaveBeenCalledWith(22, OWNER_ID, 98765, expect.anything());
      expect(mockServiceTracking.evaluateBike).toHaveBeenCalledWith(22, OWNER_ID);
    });
  });

  // The ride has just moved every accumulator on the bike; what those readings now say is
  // Service Tracking's answer, not this service's. All that is asserted here is that it is
  // asked - the arithmetic has its own tests.
  describe('the Service Tracking evaluation', () => {
    it('evaluates the bike a ride was saved against', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      jest.spyOn(service, 'saveRide').mockResolvedValue({ message: 'saved', isNew: true });

      await service.saveAnalyzedData(activity());

      expect(mockServiceTracking.evaluateBike).toHaveBeenCalledWith(BIKE_ID, OWNER_ID);
    });

    // A re-synced ride is still an evaluation: it may have moved a reading down, which
    // re-arms the next crossing even though nothing is announced.
    it('evaluates a re-synced ride as well as a new one', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      jest.spyOn(service, 'saveRide').mockResolvedValue({ message: 'saved', isNew: false });

      await service.saveAnalyzedData(activity());

      expect(mockServiceTracking.evaluateBike).toHaveBeenCalledWith(BIKE_ID, OWNER_ID);
    });

    // A ride nobody could place moves no accumulator, so there is nothing to evaluate.
    it('evaluates nothing for a ride parked as pending', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(null);

      await service.saveAnalyzedData(activity());

      expect(mockServiceTracking.evaluateBike).not.toHaveBeenCalled();
    });

    // A backfill is evaluated once, at the end, rather than after each ride in it.
    it('evaluates once after backfilling every pending ride', async () => {
      jest.spyOn(service, 'saveRide').mockResolvedValue({ message: 'saved', isNew: true });
      mockPrisma.strava_pending_activities.findMany.mockResolvedValue([
        { id: 1, activity_id: 1n, analyzed_data: {} },
        { id: 2, activity_id: 2n, analyzed_data: {} },
      ]);
      mockPrisma.strava_pending_activities.update.mockResolvedValue({});

      await service.resolvePendingActivities_noGear({ bikeId: BIKE_ID, userId: OWNER_ID, gearId: null });

      expect(mockServiceTracking.evaluateBike).toHaveBeenCalledTimes(1);
      expect(mockServiceTracking.evaluateBike).toHaveBeenCalledWith(BIKE_ID, OWNER_ID);
    });
  });

  describe('descent time', () => {
    // One Strava split: metres covered, metres gained (negative downhill) and seconds moving.
    const split = (distance: number, elevation: number, movingTime: number): Record<string, number> => ({
      distance,
      elevation_difference: elevation,
      moving_time: movingTime,
    });

    // The same downhill splits the pad index counts, so index and time come from one source.
    it('sums the moving time of downhill splits, in minutes', async () => {
      mockPrisma.users.findFirst.mockResolvedValue({ weight_kg: 75 });

      const analyzed = await service.analyzeStravaData({
        id: 1,
        athlete: { id: ATHLETE_ID },
        splits_metric: {
          '1': split(1000, -50, 300),
          '2': split(1000, -20, 240),
          '3': split(1000, 30, 600),
          '4': split(1000, 0, 100),
          // No distance, so no slope: not counted as descent.
          '5': split(0, -5, 60),
        },
      });

      expect(analyzed.analyzedData.descent_min).toBe(9);
    });

    // What saveRide writes for a ride with this analysis, new and re-synced alike.
    async function savedDescent(analyzedData: Record<string, unknown>): Promise<unknown[]> {
      mockPrisma.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrisma.rides.findUnique.mockResolvedValue(null);
      mockPrisma.rides.upsert.mockResolvedValue({ id: 1 });

      await service.saveAnalyzedData({
        ...activity(),
        analyzedData: { distance_km: 42, started_at: '2026-09-20T08:00:00.000Z', ...analyzedData },
      } as unknown as Parameters<StravaEventsService['saveAnalyzedData']>[0]);

      const [{ create, update }] = mockPrisma.rides.upsert.mock.calls[0] as [
        { create: Record<string, unknown>; update: Record<string, unknown> },
      ];
      return [create.descent_min, update.descent_min];
    }

    it('writes descent time on import and on re-sync', async () => {
      expect(await savedDescent({ descent_min: 9 })).toEqual([9, 9]);
    });

    // A ride parked as pending before descent time existed carries none, and none is guessed.
    it('writes null for an analysis with no descent time', async () => {
      expect(await savedDescent({})).toEqual([null, null]);
    });
  });

  describe('energy', () => {
    // What saveRide writes for a ride whose Strava activity reads like this, new and re-synced alike.
    async function savedCalories(rawJson: Record<string, unknown>): Promise<unknown[]> {
      mockPrisma.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrisma.rides.findUnique.mockResolvedValue(null);
      mockPrisma.rides.upsert.mockResolvedValue({ id: 1 });

      await service.saveAnalyzedData({
        ...activity(),
        analyzedData: { distance_km: 42, started_at: '2026-09-20T08:00:00.000Z', rawJson },
      } as unknown as Parameters<StravaEventsService['saveAnalyzedData']>[0]);

      const [{ create, update }] = mockPrisma.rides.upsert.mock.calls[0] as [
        { create: Record<string, unknown>; update: Record<string, unknown> },
      ];
      return [create.calories, update.calories];
    }

    it('writes whole kcal from the activity on import and on re-sync', async () => {
      expect(await savedCalories({ calories: 1742.4 })).toEqual([1742, 1742]);
    });

    it('writes null when Strava sent no calories', async () => {
      expect(await savedCalories({ name: 'Morning ride' })).toEqual([null, null]);
    });
  });

  describe('the unmatched gear listing', () => {
    it('offers no archived bike to pair a gear with', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { athlete_id: ATHLETE_ID, bikes: [] } });

      await service.listUnmatchedStravaGear(OWNER_ID);

      expect(mockPrisma.bikes.findMany).toHaveBeenCalledWith({
        where: { user_id: OWNER_ID, ...NOT_ARCHIVED },
      });
    });
  });

  describe('assigning a pending ride', () => {
    // The check-in drawer saves its check-in on the ride the pending one became.
    it('returns the id of the ride it created', async () => {
      mockPrisma.strava_pending_activities.findFirst.mockResolvedValue({
        id: 3,
        activity_id: 98765n,
        analyzed_data: { distance_km: 42, started_at: '2026-09-20T08:00:00.000Z' },
      });
      mockPrisma.rides.upsert.mockResolvedValue({ id: 55, started_at: new Date('2026-09-20T08:00:00.000Z') });

      const rideId = await service.resolvePendingActivities_noGear({
        activityId: 98765n,
        bikeId: BIKE_ID,
        userId: OWNER_ID,
        gearId: null,
      });

      expect(rideId).toBe(55);
    });
  });

  describe('the review written as a ride arrives', () => {
    const NOW = new Date().toISOString();
    const LAST_MONTH = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const figures = { distance_km: 42, duration_min: 120, elevation_up_m: 600 };
    const unassigned = (startedAt: string, analyzed = {}): ReturnType<typeof activity> =>
      ({
        ...activity(null),
        analyzedData: { ...figures, started_at: startedAt, ...analyzed },
      }) as ReturnType<typeof activity>;
    const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

    beforeEach(() => {
      mockPrisma.strava_pending_activities.findUnique.mockResolvedValue(null);
      mockPrisma.strava_pending_activities.upsert.mockResolvedValue({ id: 3, analyzed_data: figures });
      mockGemini.rideSummary.mockResolvedValue('Parádní jízda, 4/5.');
    });

    it('writes it for a fresh Unassigned Ride, in the background of the notification', async () => {
      let release: (text: string) => void = () => undefined;
      mockGemini.rideSummary.mockReturnValue(new Promise((resolve) => (release = resolve)));

      await service.saveAnalyzedData(unassigned(NOW));
      expect(mockNotifications.create).toHaveBeenCalled();

      release('Parádní jízda, 4/5.');
      await settle();
      expect(mockPrisma.strava_pending_activities.updateMany).toHaveBeenCalledWith({
        where: { id: 3, summary: null },
        data: { summary: 'Parádní jízda, 4/5.' },
      });
    });

    // A sync lands a backlog through the same pipeline.
    it('leaves an old ride for its first open', async () => {
      await service.saveAnalyzedData(unassigned(LAST_MONTH));
      await settle();

      expect(mockGemini.rideSummary).not.toHaveBeenCalled();
    });

    it('survives Gemini failing, for the next open to write', async () => {
      mockGemini.rideSummary.mockRejectedValue(new Error('down'));

      await expect(service.saveAnalyzedData(unassigned(NOW))).resolves.toBeDefined();
      await settle();

      expect(mockNotifications.create).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('writes it for a fresh ride on a recognised bike', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrisma.bikes.findUnique.mockResolvedValue(null);
      mockRides.writeArrivalSummary.mockResolvedValue(undefined);
      jest
        .spyOn(service as never, 'saveRide')
        .mockResolvedValue({ message: 'saved', isNew: true, rideId: 55 } as never);

      await service.saveAnalyzedData({ ...activity(), analyzedData: { ...figures, started_at: NOW } } as never);

      expect(mockRides.writeArrivalSummary).toHaveBeenCalledWith(55);
    });

    it('keeps the review through a rename, and asks nothing of Gemini', async () => {
      mockPrisma.strava_pending_activities.findUnique.mockResolvedValue({ id: 3, analyzed_data: figures });

      await service.saveAnalyzedData(unassigned(NOW, { name: 'Renamed' }));
      await settle();

      expect(mockPrisma.strava_pending_activities.upsert.mock.calls[0][0].update).not.toHaveProperty('summary');
      expect(mockGemini.rideSummary).not.toHaveBeenCalled();
    });

    it('clears the review when the figures change', async () => {
      mockPrisma.strava_pending_activities.findUnique.mockResolvedValue({ id: 3, analyzed_data: figures });

      await service.saveAnalyzedData(unassigned(NOW, { distance_km: 45 }));

      expect(mockPrisma.strava_pending_activities.upsert.mock.calls[0][0].update.summary).toBeNull();
    });

    it('hands the review to the ride the Unassigned Ride becomes', async () => {
      mockPrisma.strava_pending_activities.findFirst.mockResolvedValue({
        id: 3,
        activity_id: 98765n,
        user_id: OWNER_ID,
        summary: 'Parádní jízda, 4/5.',
        analyzed_data: { distance_km: 42, started_at: '2026-09-20T08:00:00.000Z' },
      });
      mockPrisma.rides.upsert.mockResolvedValue({ id: 55, started_at: new Date('2026-09-20T08:00:00.000Z') });

      await service.resolvePendingActivities_noGear({
        activityId: 98765n,
        bikeId: BIKE_ID,
        userId: OWNER_ID,
        gearId: null,
      });

      expect(mockPrisma.rides.update).toHaveBeenCalledWith({
        where: { id: 55 },
        data: { summary: 'Parádní jízda, 4/5.' },
      });
    });
  });

  describe('the review an Unassigned Ride opens', () => {
    const parked = { id: 3, activity_id: 98765n, analyzed_data: { distance_km: 42, rawJson: {} }, summary: null };

    it('returns a kept review without asking Gemini', async () => {
      mockPrisma.strava_pending_activities.findFirst.mockResolvedValue({ ...parked, summary: 'Hotovo' });

      await expect(service.findPendingSummary(OWNER_ID, 98765n)).resolves.toEqual({ summary: 'Hotovo' });
      expect(mockGemini.rideSummary).not.toHaveBeenCalled();
    });

    it('writes one arrival left out, with no bike, in the rider language', async () => {
      mockPrisma.strava_pending_activities.findFirst.mockResolvedValue(parked);
      mockPrisma.users.findUnique.mockResolvedValue({ language: 'cs' });
      mockGemini.rideSummary.mockResolvedValue('Parádní jízda, 4/5.');

      const result = await service.findPendingSummary(OWNER_ID, 98765n);

      expect(result).toEqual({ summary: 'Parádní jízda, 4/5.' });
      expect(mockGemini.rideSummary.mock.calls[0][0].bike).toBeNull();
      expect(mockGemini.rideSummary.mock.calls[0][1]).toBe('cs');
      expect(mockPrisma.strava_pending_activities.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { summary: 'Parádní jízda, 4/5.' },
      });
    });
  });

  describe('listing pending rides', () => {
    // The drawer previews the picked bike's wear before the ride is saved, as the check-in walk does.
    it('carries the wear of each ride on every bike', async () => {
      const byBike = [{ bike_id: BIKE_ID, wore_off: [] }];
      const preview = jest.fn().mockReturnValue(byBike);
      mockServiceTracking.getWearPreview.mockResolvedValue(preview);
      mockPrisma.strava_pending_activities.findMany.mockResolvedValue([
        {
          id: 3,
          activity_id: 98765n,
          gear_id: null,
          analyzed_data: { distance_km: 42, drivetrain_km: 30, started_at: '2026-09-20T08:00:00.000Z' },
          created_at: new Date('2026-09-20T08:40:00.000Z'),
        },
      ]);

      const [listed] = await service.listPendingActivities(OWNER_ID);

      expect(mockServiceTracking.getWearPreview).toHaveBeenCalledWith(OWNER_ID);
      expect(preview).toHaveBeenCalledWith(expect.objectContaining({ distance_m: 42000, drivetrain_meters: 30000 }));
      expect(listed.wore_off_by_bike).toBe(byBike);
    });

    // The list polls, so an empty one costs no garage read.
    it('skips the wear preview when nothing is pending', async () => {
      mockPrisma.strava_pending_activities.findMany.mockResolvedValue([]);

      await expect(service.listPendingActivities(OWNER_ID)).resolves.toEqual([]);
      expect(mockServiceTracking.getWearPreview).not.toHaveBeenCalled();
    });
  });

  describe('dismissing a pending ride', () => {
    it('resolves the ride without saving it and clears its ask', async () => {
      mockPrisma.strava_pending_activities.findFirst.mockResolvedValue({ id: 3, activity_id: 98765n });
      const saveRide = jest.spyOn(service, 'saveRide');

      await service.dismissPendingActivity(OWNER_ID, 98765n);

      expect(mockPrisma.strava_pending_activities.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { resolved_at: expect.any(Date) },
      });
      expect(saveRide).not.toHaveBeenCalled();
      expect(mockNotifications.resolveActivityAsk).toHaveBeenCalledWith(OWNER_ID, '98765');
    });

    it('refuses a ride that is not pending for this user', async () => {
      mockPrisma.strava_pending_activities.findFirst.mockResolvedValue(null);

      await expect(service.dismissPendingActivity(OWNER_ID, 98765n)).rejects.toThrow('Pending activity not found');
    });

    // An update webhook for a dismissed ride must neither save it nor ask about it again.
    it('skips a later webhook for a dismissed ride', async () => {
      mockPrisma.strava_pending_activities.findUnique.mockResolvedValue({ resolved_at: new Date() });
      mockPrisma.rides.findUnique.mockResolvedValue(null);

      await service.saveAnalyzedData(activity());

      expect(mockPrisma.bikes.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.strava_pending_activities.upsert).not.toHaveBeenCalled();
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    // Resolved onto a bike is not dismissed: its updates still reach the ride.
    it('still processes a webhook for a ride resolved onto a bike', async () => {
      mockPrisma.strava_pending_activities.findUnique.mockResolvedValue({ resolved_at: new Date() });
      mockPrisma.rides.findUnique.mockResolvedValue({ id: 1, bike_id: BIKE_ID });
      mockPrisma.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      const saveRide = jest.spyOn(service, 'saveRide').mockResolvedValue({ message: 'saved', isNew: false });

      await service.saveAnalyzedData(activity());

      expect(saveRide).toHaveBeenCalled();
    });
  });

  describe('syncing from Strava', () => {
    const NOW = new Date('2026-09-29T10:00:00.000Z');
    const NOW_S = NOW.getTime() / 1000;
    const DAY_S = 24 * 60 * 60;
    // A standalone fn, so asserting on it does not detach axios.post from axios.
    const post = jest.fn();
    const listedIds = (ids: number[]): void => {
      post.mockImplementation((url: string, body: { activityIds?: number[] }) =>
        Promise.resolve({
          data: url.endsWith('/list') ? { activityIds: ids } : { queued: body.activityIds?.length ?? 0 },
        }),
      );
    };
    const lastSyncedAgo = (seconds: number | null): void => {
      mockPrisma.users.findUnique.mockResolvedValue({
        strava_athlete_id: String(ATHLETE_ID),
        strava_last_sync_at: seconds === null ? null : new Date(NOW.getTime() - seconds * 1000),
      });
    };

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
      (axios.post as jest.Mock).mockImplementation(post);
      listedIds([11, 12]);
      mockPrisma.rides.findMany.mockResolvedValue([]);
      mockPrisma.strava_pending_activities.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('window', () => {
      it('looks back 60 days on the first sync', async () => {
        lastSyncedAgo(null);

        await service.syncFromStrava(OWNER_ID);

        expect(post).toHaveBeenCalledWith(
          expect.stringMatching(/\/strava\/sync\/list$/),
          { athleteId: ATHLETE_ID, after: NOW_S - 60 * DAY_S },
          expect.anything(),
        );
      });

      it('starts from the last sync', async () => {
        lastSyncedAgo(2 * DAY_S);

        await service.syncFromStrava(OWNER_ID);

        expect(post).toHaveBeenCalledWith(
          expect.stringMatching(/\/strava\/sync\/list$/),
          { athleteId: ATHLETE_ID, after: NOW_S - 2 * DAY_S },
          expect.anything(),
        );
      });

      it('never looks back more than 60 days', async () => {
        lastSyncedAgo(90 * DAY_S);

        await service.syncFromStrava(OWNER_ID);

        expect(post).toHaveBeenCalledWith(
          expect.stringMatching(/\/strava\/sync\/list$/),
          { athleteId: ATHLETE_ID, after: NOW_S - 60 * DAY_S },
          expect.anything(),
        );
      });
    });

    describe('dedupe', () => {
      // Resolved pending rows count too, so a dismissed ride never comes back.
      it('queues only rides that are neither saved nor pending', async () => {
        lastSyncedAgo(null);
        listedIds([1, 2, 3, 4]);
        mockPrisma.rides.findMany.mockResolvedValue([{ activity_strava_id: 1n }]);
        mockPrisma.strava_pending_activities.findMany.mockResolvedValue([{ activity_id: 2n }]);

        const result = await service.syncFromStrava(OWNER_ID);

        expect(mockPrisma.rides.findMany).toHaveBeenCalledWith({
          where: { activity_strava_id: { in: [1n, 2n, 3n, 4n] } },
          select: { activity_strava_id: true },
        });
        expect(mockPrisma.strava_pending_activities.findMany).toHaveBeenCalledWith({
          where: { activity_id: { in: [1n, 2n, 3n, 4n] } },
          select: { activity_id: true },
        });
        expect(post).toHaveBeenCalledWith(
          expect.stringMatching(/\/strava\/sync\/enqueue$/),
          { athleteId: ATHLETE_ID, activityIds: [3, 4] },
          expect.anything(),
        );
        expect(result).toEqual({ queued: 2, synced_at: NOW });
      });

      it('queues nothing when every ride is known, and still stamps the sync', async () => {
        lastSyncedAgo(null);
        listedIds([1]);
        mockPrisma.rides.findMany.mockResolvedValue([{ activity_strava_id: 1n }]);

        const result = await service.syncFromStrava(OWNER_ID);

        expect(post).not.toHaveBeenCalledWith(
          expect.stringMatching(/\/enqueue$/),
          expect.anything(),
          expect.anything(),
        );
        expect(mockPrisma.users.update).toHaveBeenCalledWith({
          where: { id: OWNER_ID },
          data: { strava_last_sync_at: NOW },
        });
        expect(result).toEqual({ queued: 0, synced_at: NOW });
      });
    });

    describe('cooldown', () => {
      it('refuses a second sync within five minutes', async () => {
        lastSyncedAgo(4 * 60);

        await expect(service.syncFromStrava(OWNER_ID)).rejects.toMatchObject({ status: 429 });
        expect(post).not.toHaveBeenCalled();
      });

      it('syncs again once five minutes have passed', async () => {
        lastSyncedAgo(5 * 60);

        await service.syncFromStrava(OWNER_ID);

        expect(post).toHaveBeenCalled();
      });

      // A failed sync never reached Strava, so it must not lock the user out for five minutes.
      it('leaves the stamp alone when listing fails', async () => {
        lastSyncedAgo(null);
        post.mockRejectedValue(new Error('down'));

        await expect(service.syncFromStrava(OWNER_ID)).rejects.toThrow('Failed to sync Strava');
        expect(mockPrisma.users.update).not.toHaveBeenCalled();
      });

      it('leaves the stamp alone when queueing fails', async () => {
        lastSyncedAgo(null);
        post.mockImplementation((url: string) =>
          url.endsWith('/list') ? Promise.resolve({ data: { activityIds: [5] } }) : Promise.reject(new Error('down')),
        );

        await expect(service.syncFromStrava(OWNER_ID)).rejects.toThrow('Failed to sync Strava');
        expect(mockPrisma.users.update).not.toHaveBeenCalled();
      });
    });

    it('refuses a user without Strava', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ strava_athlete_id: null, strava_last_sync_at: null });

      await expect(service.syncFromStrava(OWNER_ID)).rejects.toThrow('No Strava account');
    });
  });

  describe('deleteStravaActivity', () => {
    // Wear rollback and the missing-ride case live in RideService.removeStravaRide.
    it('removes the athlete ride by its activity id', async () => {
      await service.deleteStravaActivity({ owner_id: ATHLETE_ID, object_id: 98765 });

      expect(mockPrisma.users.findFirst.mock.calls[0][0].where).toEqual({ strava_athlete_id: String(ATHLETE_ID) });
      expect(mockRides.removeStravaRide).toHaveBeenCalledWith(OWNER_ID, BigInt(98765));
    });
  });
});
