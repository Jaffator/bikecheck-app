import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RideService } from './ride.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';

const NOW = new Date('2026-09-29T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

// A ride row as the prompt query reads it.
function ride(id: number, startedDaysAgo: number, createdDaysAgo: number, checkIn: unknown = null): object {
  return {
    id,
    activity_strava_id: null,
    bike_id: 7,
    bikes: { bike_brand: 'Orbea', bike_model: 'Rallon', year: 2024 },
    started_at: daysAgo(startedDaysAgo),
    created_at: daysAgo(createdDaysAgo),
    json_data: null,
    check_in: checkIn,
  };
}

describe('RideService check-in', () => {
  let service: RideService;

  const mockServiceTracking = { getWoreOff: jest.fn(), evaluateBikes: jest.fn() };
  const mockPrisma = {
    rides: { findMany: jest.fn(), findFirst: jest.fn() },
    users: { findUnique: jest.fn(), update: jest.fn() },
    ride_check_ins: { upsert: jest.fn(), deleteMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockServiceTracking.getWoreOff.mockResolvedValue(new Map());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RideService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ServiceTrackingService, useValue: mockServiceTracking },
      ],
    }).compile();

    service = module.get<RideService>(RideService);
  });

  describe('findCheckInPrompt', () => {
    it('offers every recent ride without a check-in, newest first, once a new ride has arrived', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ check_in_prompted_at: daysAgo(2) });
      mockPrisma.rides.findMany.mockResolvedValue([ride(3, 1, 1), ride(2, 3, 3)]);

      const prompt = await service.findCheckInPrompt(1, NOW);

      expect(prompt.map((one) => one.id)).toEqual([3, 2]);
    });

    // The drawer has already shown these, so it stays shut on every phone.
    it('offers nothing when no ride has arrived since the drawer last opened', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ check_in_prompted_at: daysAgo(1) });
      mockPrisma.rides.findMany.mockResolvedValue([ride(3, 2, 2), ride(2, 3, 3)]);

      const prompt = await service.findCheckInPrompt(1, NOW);

      expect(prompt).toEqual([]);
    });

    it('leaves out a ride started more than 14 days ago, even a skipped one', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ check_in_prompted_at: daysAgo(2) });
      mockPrisma.rides.findMany.mockResolvedValue([ride(3, 1, 1), ride(1, 15, 15)]);

      const prompt = await service.findCheckInPrompt(1, NOW);

      expect(prompt.map((one) => one.id)).toEqual([3]);
      const since = mockPrisma.rides.findMany.mock.calls[0][0].where.started_at.gte as Date;
      expect(since).toEqual(daysAgo(14));
    });

    it('leaves out a ride that already has a check-in', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ check_in_prompted_at: daysAgo(2) });
      mockPrisma.rides.findMany.mockResolvedValue([
        ride(3, 1, 1),
        ride(2, 3, 3, { status: 'OK', symptoms: [], note: null }),
      ]);

      const prompt = await service.findCheckInPrompt(1, NOW);

      expect(prompt.map((one) => one.id)).toEqual([3]);
    });

    // Skipped rides come back with the next new ride, even when that one was checked in elsewhere.
    it('brings skipped rides back when the newly arrived ride already has a check-in', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ check_in_prompted_at: daysAgo(2) });
      mockPrisma.rides.findMany.mockResolvedValue([
        ride(3, 1, 1, { status: 'ISSUE', symptoms: ['CREAK'], note: null }),
        ride(2, 3, 3),
      ]);

      const prompt = await service.findCheckInPrompt(1, NOW);

      expect(prompt.map((one) => one.id)).toEqual([2]);
    });

    it('offers every recent ride to a user the drawer has never opened for', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ check_in_prompted_at: null });
      mockPrisma.rides.findMany.mockResolvedValue([ride(3, 1, 20), ride(2, 3, 20)]);

      const prompt = await service.findCheckInPrompt(1, NOW);

      expect(prompt.map((one) => one.id)).toEqual([3, 2]);
    });

    it('carries the check-in on the ride it serves', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ check_in_prompted_at: null });
      mockPrisma.rides.findMany.mockResolvedValue([ride(3, 1, 1)]);

      const [offered] = await service.findCheckInPrompt(1, NOW);

      expect(offered.check_in).toBeNull();
    });
  });

  describe('saveCheckIn', () => {
    it('writes the check-in onto one of the user own rides and returns it', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.ride_check_ins.upsert.mockResolvedValue({
        status: 'ISSUE',
        symptoms: ['SHIFTING_SKIPS'],
        note: 'Skips on the 3rd cog',
      });

      const saved = await service.saveCheckIn(1, 5, {
        status: 'ISSUE',
        symptoms: ['SHIFTING_SKIPS'],
        note: 'Skips on the 3rd cog',
      });

      expect(mockPrisma.rides.findFirst.mock.calls[0][0].where).toMatchObject({ id: 5, user_id: 1 });
      expect(mockPrisma.ride_check_ins.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ride_id: 5 },
          create: { ride_id: 5, status: 'ISSUE', symptoms: ['SHIFTING_SKIPS'], note: 'Skips on the 3rd cog' },
          update: { status: 'ISSUE', symptoms: ['SHIFTING_SKIPS'], note: 'Skips on the 3rd cog' },
        }),
      );
      expect(saved).toEqual({ status: 'ISSUE', symptoms: ['SHIFTING_SKIPS'], note: 'Skips on the 3rd cog' });
    });

    // Symptoms say what did not sit right, so a ride that rode fine keeps none.
    it('drops symptoms when the ride rode fine, and a blank note', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.ride_check_ins.upsert.mockResolvedValue({ status: 'OK', symptoms: [], note: null });

      await service.saveCheckIn(1, 5, { status: 'OK', symptoms: ['CREAK'], note: '   ' });

      const args = mockPrisma.ride_check_ins.upsert.mock.calls[0][0];
      expect(args.update).toEqual({ status: 'OK', symptoms: [], note: null });
    });

    it('refuses a ride that is not the user own', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue(null);

      await expect(service.saveCheckIn(1, 5, { status: 'OK' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.ride_check_ins.upsert).not.toHaveBeenCalled();
    });
  });

  describe('deleteCheckIn', () => {
    it('removes the check-in from one of the user own rides', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue({ id: 5 });

      await service.deleteCheckIn(1, 5);

      expect(mockPrisma.ride_check_ins.deleteMany).toHaveBeenCalledWith({ where: { ride_id: 5 } });
    });

    it('refuses a ride that is not the user own', async () => {
      mockPrisma.rides.findFirst.mockResolvedValue(null);

      await expect(service.deleteCheckIn(1, 5)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.ride_check_ins.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('markCheckInPromptSeen', () => {
    it('stamps the moment the drawer opened on the user', async () => {
      await service.markCheckInPromptSeen(1, NOW);

      expect(mockPrisma.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { check_in_prompted_at: NOW },
      });
    });
  });
});
