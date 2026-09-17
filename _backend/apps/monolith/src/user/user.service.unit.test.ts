import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, tire_pressure_unit } from '@prisma/client';
import bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './dto/user.dtos';
import { AccountEventsService } from '../account-events/account-events.service';

const USER_ID = 7;

// The anonymous statistics row (ADR 0028, revised); what is written is asserted, not stored.
const mockAccountEvents = { recordVerified: jest.fn(), recordDeleted: jest.fn() };

// What Prisma throws when a conditional `update` finds no row to update (P2025).
function recordNotFound(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('No record was found for an update.', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

describe('UserService account deletion', () => {
  let service: UserService;

  const VERIFIED_AT = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const tx = {
    strava_pending_activities: { deleteMany: jest.fn() },
    bikes: { deleteMany: jest.fn() },
    users: { delete: jest.fn(), findUnique: jest.fn().mockResolvedValue({ email_verified_at: VERIFIED_AT }) },
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
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountEventsService, useValue: mockAccountEvents },
      ],
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

    // The statistics keep that a rider left and after how long - nothing else survives.
    it('records the leaving, in the same transaction, with the account age', async () => {
      await service.deleteAccount(USER_ID);

      expect(mockAccountEvents.recordDeleted).toHaveBeenCalledWith(VERIFIED_AT, tx);
    });

    // A placeholder was never a rider, so nothing is counted as leaving.
    it('records nothing for an account that never verified', async () => {
      tx.users.findUnique.mockResolvedValueOnce({ email_verified_at: null });

      await service.deleteAccount(USER_ID);

      expect(mockAccountEvents.recordDeleted).not.toHaveBeenCalled();
    });
  });
});

// Registration by name and password (ADR 0031). An Unverified Account is a placeholder:
// the address is not taken by it, so registering again is simply the first time again.
describe('UserService registration', () => {
  let service: UserService;

  const mockPrisma = {
    users: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  const dto = { name: 'Jarda', email: 'rider@example.com', password: 'abcd1234', language: 'cs' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountEventsService, useValue: mockAccountEvents },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    mockPrisma.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: USER_ID, ...data }),
    );
    mockPrisma.users.update.mockImplementation(
      ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) =>
        Promise.resolve({ id: where.id, email: dto.email, ...data }),
    );
  });

  it('creates a placeholder for an unknown address', async () => {
    mockPrisma.users.findUnique.mockResolvedValue(null);

    const user = await service.registerLocal(dto);

    expect(mockPrisma.users.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.users.update).not.toHaveBeenCalled();
    const { data } = mockPrisma.users.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({ name: 'Jarda', email: dto.email, language: 'cs', googleId: null, avatar_url: null });
    expect(data.email_verified_at).toBeNull();
    expect(await bcrypt.compare('abcd1234', data.password_hash as string)).toBe(true);
    expect(user.email).toBe(dto.email);
  });

  it('refuses a verified address with 409', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({
      id: 3,
      email: dto.email,
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
    });

    await expect(service.registerLocal(dto)).rejects.toThrow(ConflictException);
    expect(mockPrisma.users.create).not.toHaveBeenCalled();
    expect(mockPrisma.users.update).not.toHaveBeenCalled();
  });

  // Same row id, new name, password and language; whatever Google put on the placeholder
  // goes, because the person registering now is the one who has to prove the address.
  it('replaces an Unverified Account in place', async () => {
    const oldHash = await bcrypt.hash('oldpassword', 5);
    mockPrisma.users.findUnique.mockResolvedValue({
      id: 3,
      email: dto.email,
      name: 'Impostor',
      password_hash: oldHash,
      googleId: 'google-123',
      avatar_url: 'https://example.com/old.png',
      language: 'en',
      email_verified_at: null,
    });

    const user = await service.registerLocal(dto);

    expect(mockPrisma.users.create).not.toHaveBeenCalled();
    expect(mockPrisma.users.update).toHaveBeenCalledTimes(1);
    const { where, data } = mockPrisma.users.update.mock.calls[0][0] as {
      where: { id: number };
      data: Record<string, unknown>;
    };
    expect(where).toEqual({ id: 3, email_verified_at: null });
    expect(data).toMatchObject({ name: 'Jarda', language: 'cs', googleId: null, avatar_url: null });
    expect(data.password_hash).not.toBe(oldHash);
    expect(await bcrypt.compare('abcd1234', data.password_hash as string)).toBe(true);
    // Still a placeholder: replacing it proves nothing about the address.
    expect(data).not.toHaveProperty('email_verified_at');
    expect(user.id).toBe(3);
  });

  it('never changes the address of the row it replaces', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ id: 3, email: dto.email, email_verified_at: null });

    await service.registerLocal(dto);

    const { data } = mockPrisma.users.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).not.toHaveProperty('email');
  });

  // A vouched Google takeover landed between read and write: the owner's row must not get a
  // stranger's password, so the address reads as taken.
  it('refuses with 409 when the row was verified between the read and the write', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ id: 3, email: dto.email, email_verified_at: null });
    mockPrisma.users.update.mockRejectedValue(recordNotFound());

    await expect(service.registerLocal(dto)).rejects.toThrow(ConflictException);

    expect(mockPrisma.users.create).not.toHaveBeenCalled();
    const { where } = mockPrisma.users.update.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where).toEqual({ id: 3, email_verified_at: null });
  });

  it('lets any other database error through untouched', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ id: 3, email: dto.email, email_verified_at: null });
    mockPrisma.users.update.mockRejectedValue(new Error('connection lost'));

    await expect(service.registerLocal(dto)).rejects.toThrow('connection lost');
  });
});

// POST /users/create is not self-registration: any row on the address refuses, a placeholder
// included, and the new row stays unverified because nothing sends a Verification Email for it.
describe('UserService createUserLocal', () => {
  let service: UserService;

  const mockPrisma = {
    users: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  const dto = { name: 'Jarda', email: 'rider@example.com', password: 'abcd1234', language: 'cs' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountEventsService, useValue: mockAccountEvents },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    mockPrisma.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: USER_ID, ...data }),
    );
  });

  it('creates an unverified row for an unknown address', async () => {
    mockPrisma.users.findUnique.mockResolvedValue(null);

    const user = await service.createUserLocal(dto);

    expect(mockPrisma.users.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.users.update).not.toHaveBeenCalled();
    const { data } = mockPrisma.users.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({ name: 'Jarda', email: dto.email, language: 'cs', googleId: null, avatar_url: null });
    expect(data.email_verified_at).toBeNull();
    expect(await bcrypt.compare('abcd1234', data.password_hash as string)).toBe(true);
    expect(user.email).toBe(dto.email);
  });

  it.each([
    ['a Verified Email', new Date('2026-01-01T00:00:00Z')],
    ['an Unverified Account', null],
  ])('refuses %s on the address with 409 and writes nothing', async (_, email_verified_at) => {
    mockPrisma.users.findUnique.mockResolvedValue({ id: 3, email: dto.email, email_verified_at });

    await expect(service.createUserLocal(dto)).rejects.toThrow(ConflictException);

    expect(mockPrisma.users.create).not.toHaveBeenCalled();
    expect(mockPrisma.users.update).not.toHaveBeenCalled();
  });
});

// Google's own word on the address counts (ADR 0031): a vouched sign-in is born verified
// and takes a placeholder over; an unvouched one becomes a placeholder like any other.
describe('UserService Google sign-in', () => {
  let service: UserService;

  const mockPrisma = {
    users: { create: jest.fn(), update: jest.fn() },
  };

  const vouched = {
    googleId: 'google-123',
    email: 'rider@example.com',
    emailVerified: true,
    name: 'Jarda',
    avatar_url: 'https://example.com/a.png',
  };
  const unvouched = { ...vouched, emailVerified: false };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountEventsService, useValue: mockAccountEvents },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    mockPrisma.users.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: USER_ID, ...data }),
    );
    mockPrisma.users.update.mockImplementation(
      ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) =>
        Promise.resolve({ id: where.id, email: vouched.email, ...data }),
    );
  });

  describe('createUserByGoogle', () => {
    it('creates a vouched address born verified', async () => {
      await service.createUserByGoogle(vouched);

      expect(mockPrisma.users.create).toHaveBeenCalledTimes(1);
      const { data } = mockPrisma.users.create.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data).toMatchObject({
        name: 'Jarda',
        email: vouched.email,
        googleId: 'google-123',
        avatar_url: vouched.avatar_url,
        password_hash: null,
        language: null,
      });
      expect(data.email_verified_at).toBeInstanceOf(Date);
    });

    // The rare unvouched address: a placeholder with the Google id on it; the link proves it.
    it('creates an unvouched address as a placeholder carrying the Google id', async () => {
      await service.createUserByGoogle(unvouched);

      const { data } = mockPrisma.users.create.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data).toMatchObject({ googleId: 'google-123', password_hash: null });
      expect(data.email_verified_at).toBeNull();
    });
  });

  describe('linkGoogleId', () => {
    it('puts the Google id and avatar on the row and nothing else', async () => {
      const user = await service.linkGoogleId(USER_ID, vouched);

      expect(mockPrisma.users.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { googleId: 'google-123', avatar_url: vouched.avatar_url, updated_at: expect.any(Date) },
      });
      expect(user.googleId).toBe('google-123');
    });
  });

  // The impostor's row never becomes the owner's: Google id, name and avatar from Google,
  // the password gone, the row verified - one write, conditional on the row still being a
  // placeholder, so two sign-ins at once take it over once.
  describe('takeOverPlaceholder', () => {
    it('replaces the placeholder in one write: Google id, name, avatar, no password, verified', async () => {
      const user = await service.takeOverPlaceholder(USER_ID, vouched);

      expect(mockPrisma.users.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.users.create).not.toHaveBeenCalled();
      const { where, data } = mockPrisma.users.update.mock.calls[0][0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      expect(where).toEqual({ id: USER_ID, email_verified_at: null });
      expect(data).toMatchObject({
        googleId: 'google-123',
        name: 'Jarda',
        avatar_url: vouched.avatar_url,
        password_hash: null,
      });
      expect(data.email_verified_at).toBeInstanceOf(Date);
      expect(user.id).toBe(USER_ID);
    });

    it('never changes the address of the row it takes over', async () => {
      await service.takeOverPlaceholder(USER_ID, vouched);

      const { data } = mockPrisma.users.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data).not.toHaveProperty('email');
    });

    // The loser of two takeovers at once: the where clause matches no row any more, and
    // Prisma says so with P2025. That is an answer, not a failure - the caller re-reads.
    it('answers null when another write verified the row first', async () => {
      mockPrisma.users.update.mockRejectedValue(recordNotFound());

      const user = await service.takeOverPlaceholder(USER_ID, vouched);

      expect(user).toBeNull();
    });

    it('lets any other database error through untouched', async () => {
      mockPrisma.users.update.mockRejectedValue(new Error('connection lost'));

      await expect(service.takeOverPlaceholder(USER_ID, vouched)).rejects.toThrow('connection lost');
    });
  });
});

// Verifying flips the column once (ADR 0031). The write is conditional on the column still
// being null, so two links used at once flip it once, and the caller is told whether this
// was the transition - the Welcome Email hangs on that answer.
describe('UserService email verification', () => {
  let service: UserService;

  const mockPrisma = {
    users: { updateMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountEventsService, useValue: mockAccountEvents },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('sets the column only where it is still null, and reports the transition', async () => {
    mockPrisma.users.updateMany.mockResolvedValue({ count: 1 });

    const verified = await service.verifyEmail(USER_ID);

    expect(verified).toBe(true);
    expect(mockAccountEvents.recordVerified).toHaveBeenCalledTimes(1);
    expect(mockPrisma.users.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.users.updateMany).toHaveBeenCalledWith({
      where: { id: USER_ID, email_verified_at: null },
      data: { email_verified_at: expect.any(Date), updated_at: expect.any(Date) },
    });
  });

  // The second time the where clause matches nothing: no row changes, and the caller
  // learns there was no transition to greet.
  it('is a no-op the second time and says so', async () => {
    mockPrisma.users.updateMany.mockResolvedValue({ count: 0 });

    const verified = await service.verifyEmail(USER_ID);

    expect(verified).toBe(false);
    expect(mockAccountEvents.recordVerified).not.toHaveBeenCalled();
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
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountEventsService, useValue: mockAccountEvents },
      ],
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
