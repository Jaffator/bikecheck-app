import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { getQueueToken } from '@nestjs/bullmq';
import axios from 'axios';
import { StravaEventsService } from './strava.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';

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
    users: { findFirst: jest.fn(), findUnique: jest.fn() },
    bikes: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    strava_pending_activities: { upsert: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };

  const mockNotifications = { create: jest.fn(), resolveActivityAsk: jest.fn() };
  const mockServiceTracking = { evaluateBike: jest.fn(), evaluateBikes: jest.fn() };
  const mockQueue = { add: jest.fn() };
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
        { provide: getQueueToken('gemini-queue'), useValue: mockQueue },
        { provide: getLoggerToken(StravaEventsService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<StravaEventsService>(StravaEventsService);

    mockPrisma.users.findFirst.mockResolvedValue({ id: OWNER_ID });
    mockPrisma.users.findUnique.mockResolvedValue({ strava_athlete_id: String(ATHLETE_ID) });
    mockPrisma.bikes.findMany.mockResolvedValue([]);
    mockPrisma.strava_pending_activities.upsert.mockResolvedValue({});
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

  describe('the unmatched gear listing', () => {
    it('offers no archived bike to pair a gear with', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { athlete_id: ATHLETE_ID, bikes: [] } });

      await service.listUnmatchedStravaGear(OWNER_ID);

      expect(mockPrisma.bikes.findMany).toHaveBeenCalledWith({
        where: { user_id: OWNER_ID, ...NOT_ARCHIVED },
      });
    });
  });
});
