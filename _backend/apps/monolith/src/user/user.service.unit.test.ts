import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { tire_pressure_unit } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './dto/user.dtos';

const USER_ID = 7;

describe('UserService account deletion', () => {
  let service: UserService;

  const tx = {
    strava_pending_activities: { deleteMany: jest.fn() },
    bikes: { deleteMany: jest.fn() },
    users: { delete: jest.fn() },
  };

  const mockPrisma = {
    bikes: { count: jest.fn() },
    rides: { count: jest.fn() },
    events_bikes: { count: jest.fn() },
    reports: { count: jest.fn() },
    $transaction: jest.fn((run: (client: typeof tx) => Promise<void>) => run(tx)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('getAccountDeletionSummary', () => {
    it('counts what the account still holds', async () => {
      mockPrisma.bikes.count.mockResolvedValue(3);
      mockPrisma.rides.count.mockResolvedValue(412);
      mockPrisma.events_bikes.count.mockResolvedValue(27);
      mockPrisma.reports.count.mockResolvedValue(2);

      const summary = await service.getAccountDeletionSummary(USER_ID);

      expect(summary).toEqual({ bikes: 3, rides: 412, services: 27, publicReports: 2 });
    });

    // Deletion takes the archive too, so the number said out loud has to include it.
    it('counts archived bikes as well, because deletion takes them', async () => {
      mockPrisma.bikes.count.mockResolvedValue(0);
      mockPrisma.rides.count.mockResolvedValue(0);
      mockPrisma.events_bikes.count.mockResolvedValue(0);
      mockPrisma.reports.count.mockResolvedValue(0);

      await service.getAccountDeletionSummary(USER_ID);

      expect(mockPrisma.bikes.count).toHaveBeenCalledWith({ where: { user_id: USER_ID } });
    });

    // A closed or revoked Report answers nobody already, so counting it would overstate
    // what the outside world loses.
    it('counts only the share links that answer today', async () => {
      mockPrisma.bikes.count.mockResolvedValue(0);
      mockPrisma.rides.count.mockResolvedValue(0);
      mockPrisma.events_bikes.count.mockResolvedValue(0);
      mockPrisma.reports.count.mockResolvedValue(0);

      await service.getAccountDeletionSummary(USER_ID);

      expect(mockPrisma.reports.count).toHaveBeenCalledWith({
        where: { user_id: USER_ID, is_public: true, revoked: false },
      });
    });

    // The rider cannot see a deleted service or ride, so it is not named as a loss.
    it('leaves already deleted rides and services out of the count', async () => {
      mockPrisma.bikes.count.mockResolvedValue(0);
      mockPrisma.rides.count.mockResolvedValue(0);
      mockPrisma.events_bikes.count.mockResolvedValue(0);
      mockPrisma.reports.count.mockResolvedValue(0);

      await service.getAccountDeletionSummary(USER_ID);

      expect(mockPrisma.rides.count).toHaveBeenCalledWith({
        where: { user_id: USER_ID, is_deleted: { not: true } },
      });
      expect(mockPrisma.events_bikes.count).toHaveBeenCalledWith({
        where: { bikes: { user_id: USER_ID }, is_deleted: { not: true } },
      });
    });
  });

  describe('deleteAccount', () => {
    it('destroys the row outright - no archive, no soft delete', async () => {
      await service.deleteAccount(USER_ID);

      expect(tx.users.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
      // Nothing is updated on the way out: an account is never flagged, only removed.
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    // `components_mounted -> component_types` is ON DELETE RESTRICT, and the rider's own
    // types cascade straight from `users`. Emptying the bikes first leaves the database no
    // cascade order to get wrong.
    it('empties the bikes before the user row', async () => {
      await service.deleteAccount(USER_ID);

      const bikesCall = tx.bikes.deleteMany.mock.invocationCallOrder[0];
      const userCall = tx.users.delete.mock.invocationCallOrder[0];
      expect(tx.bikes.deleteMany).toHaveBeenCalledWith({ where: { user_id: USER_ID } });
      expect(bikesCall).toBeLessThan(userCall);
    });

    // No foreign key stands behind strava_pending_activities.user_id, so no cascade would
    // ever reach these rows.
    it('clears the pending Strava activities, which no cascade reaches', async () => {
      await service.deleteAccount(USER_ID);

      expect(tx.strava_pending_activities.deleteMany).toHaveBeenCalledWith({ where: { user_id: USER_ID } });
    });

    // One transaction, so a failure halfway leaves the account whole rather than gutted.
    it('does all of it in one transaction', async () => {
      await service.deleteAccount(USER_ID);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});

describe('UserService profile update', () => {
  let service: UserService;

  const mockPrisma = {
    users: { findUnique: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  // The Tyre Pressure Unit is one account-wide choice (ADR 0029): it goes in through the same
  // update as currency and comes back on the row.
  it('round-trips the tyre pressure unit through update', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ id: USER_ID, tire_pressure_unit: tire_pressure_unit.bar });
    mockPrisma.users.update.mockImplementation(({ data }: { data: { tire_pressure_unit: tire_pressure_unit } }) =>
      Promise.resolve({ id: USER_ID, tire_pressure_unit: data.tire_pressure_unit }),
    );

    const user = await service.updateUserProfile(USER_ID, { tire_pressure_unit: tire_pressure_unit.psi });

    expect(mockPrisma.users.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { tire_pressure_unit: tire_pressure_unit.psi, updated_at: expect.any(Date) },
    });
    expect(user.tire_pressure_unit).toBe(tire_pressure_unit.psi);
  });

  // A field not sent is not touched, so changing the currency cannot reset the unit.
  it('leaves the tyre pressure unit alone when it is not sent', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ id: USER_ID });
    mockPrisma.users.update.mockResolvedValue({ id: USER_ID });

    await service.updateUserProfile(USER_ID, { currency: 'eur' });

    const { data } = mockPrisma.users.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).not.toHaveProperty('tire_pressure_unit');
  });

  it('refuses an unknown user', async () => {
    mockPrisma.users.findUnique.mockResolvedValue(null);

    await expect(service.updateUserProfile(USER_ID, { tire_pressure_unit: tire_pressure_unit.psi })).rejects.toThrow(
      NotFoundException,
    );
  });
});

// The DTO is what the ValidationPipe checks, so this is where "outside bar | psi" is refused.
describe('UpdateUserDto tyre pressure unit', () => {
  async function violations(body: Record<string, unknown>): Promise<string[]> {
    const errors = await validate(plainToInstance(UpdateUserDto, body));
    return errors.map((error) => error.property);
  }

  it.each([tire_pressure_unit.bar, tire_pressure_unit.psi])('accepts %s', async (unit) => {
    expect(await violations({ tire_pressure_unit: unit })).toEqual([]);
  });

  it.each(['kpa', 'BAR', '', 1, null])('rejects %p', async (unit) => {
    expect(await violations({ tire_pressure_unit: unit })).toEqual(['tire_pressure_unit']);
  });

  it('accepts a body that does not name the unit', async () => {
    expect(await violations({ currency: 'czk' })).toEqual([]);
  });
});
