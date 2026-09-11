import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';

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
