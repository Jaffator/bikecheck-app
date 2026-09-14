import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SetupService } from './setup.service';
import { PrismaService } from '../../prisma/prisma.service';

const OWNER_ID = 7;
const STRANGER_ID = 8;
const BIKE_ID = 15;
const STRANGERS_BIKE_ID = 16;
const PROFILE_ID = 31;
const OTHER_PROFILE_ID = 32;
const STRANGERS_PROFILE_ID = 33;
const MISSING_ID = 999;

// Every number of the sheet, as the DB holds them - pressures as Decimal, the rest integers.
const SHEET = {
  note: 'Wet, muddy Loket',
  front_tire_psi: new Prisma.Decimal('24.5'),
  rear_tire_psi: new Prisma.Decimal('27.0'),
  fork_pressure_psi: new Prisma.Decimal('85.0'),
  fork_tokens: 2,
  fork_sag_percent: 20,
  fork_rebound_ls: 8,
  fork_rebound_hs: 3,
  fork_compression_ls: 10,
  fork_compression_hs: 2,
  shock_pressure_psi: new Prisma.Decimal('185.0'),
  shock_tokens: 1,
  shock_sag_percent: 30,
  shock_rebound_ls: 6,
  shock_rebound_hs: 2,
  shock_compression_ls: 9,
  shock_compression_hs: 1,
};

// The same sheet with nothing written down yet.
const BLANK_SHEET = Object.fromEntries(Object.keys(SHEET).map((field) => [field, null])) as Record<
  keyof typeof SHEET,
  null
>;

// The bike a profile hangs off: whose it is, and whether it is archived.
function bikeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: BIKE_ID, user_id: OWNER_ID, is_deleted: false, ...overrides };
}

// One Setup Profile as the row holds it.
function profileRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PROFILE_ID,
    bike_id: BIKE_ID,
    name: 'Trail',
    ...BLANK_SHEET,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// What a read hands the mock: the filters it puts on the rows it loads.
interface BikeWhere {
  id?: number;
  user_id?: number;
  is_deleted?: unknown;
}

interface ProfileWhere {
  id?: number;
  bike_id?: number;
  bikes?: BikeWhere;
  bike_id_name?: { bike_id: number; name: string };
}

describe('SetupService', () => {
  let service: SetupService;

  // The fixtures answer the way the database would: the service's own filters decide what it sees.
  let bikes: Record<string, unknown>[];
  let profiles: Record<string, unknown>[];
  let nextId: number;

  const mockPrisma = {
    bikes: { findFirst: jest.fn() },
    setup_profiles: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  function findBike(where: BikeWhere): Record<string, unknown> | null {
    return (
      bikes.find(
        (bike) =>
          (where.id === undefined || bike.id === where.id) &&
          bike.user_id === where.user_id &&
          (where.is_deleted === undefined || bike.is_deleted !== true),
      ) ?? null
    );
  }

  // A profile is looked up by id, narrowed to a bike or to a bike's owner.
  function findProfile(where: ProfileWhere): Record<string, unknown> | null {
    const profile = profiles.find((row) => row.id === where.id) ?? null;
    if (!profile) return null;
    if (where.bike_id !== undefined && profile.bike_id !== where.bike_id) return null;
    if (where.bikes) {
      const bike = findBike({ ...where.bikes, id: profile.bike_id as number });
      if (!bike) return null;
      return { ...profile, bikes: { id: bike.id, is_deleted: bike.is_deleted } };
    }
    return profile;
  }

  // Sending a field as undefined leaves the column alone, the way Prisma does.
  function applyUpdate(row: Record<string, unknown>, data: Record<string, unknown>): Record<string, unknown> {
    for (const [field, value] of Object.entries(data)) {
      if (value !== undefined) row[field] = value;
    }
    row.updated_at = new Date('2026-02-01T00:00:00.000Z');
    return { ...row };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SetupService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SetupService>(SetupService);

    // The owner's bike and a stranger's, and one profile on the owner's bike unless a test says otherwise.
    bikes = [bikeRow(), bikeRow({ id: STRANGERS_BIKE_ID, user_id: STRANGER_ID })];
    profiles = [profileRow(), profileRow({ id: STRANGERS_PROFILE_ID, bike_id: STRANGERS_BIKE_ID })];
    nextId = 100;

    mockPrisma.bikes.findFirst.mockImplementation(({ where }: { where: BikeWhere }) =>
      Promise.resolve(findBike(where)),
    );
    mockPrisma.setup_profiles.findMany.mockImplementation(({ where }: { where: { bike_id: number } }) =>
      Promise.resolve(profiles.filter((row) => row.bike_id === where.bike_id).map((row) => ({ ...row }))),
    );
    mockPrisma.setup_profiles.findFirst.mockImplementation(({ where }: { where: ProfileWhere }) =>
      Promise.resolve(findProfile(where)),
    );
    mockPrisma.setup_profiles.findUnique.mockImplementation(({ where }: { where: Required<ProfileWhere> }) =>
      Promise.resolve(
        profiles.find((row) => row.bike_id === where.bike_id_name.bike_id && row.name === where.bike_id_name.name) ??
          null,
      ),
    );
    mockPrisma.setup_profiles.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      const row = profileRow({ ...data, id: nextId++, created_at: new Date('2026-03-01T00:00:00.000Z') });
      profiles.push(row);
      return Promise.resolve({ ...row });
    });
    mockPrisma.setup_profiles.update.mockImplementation(
      ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => {
        const row = profiles.find((profile) => profile.id === where.id)!;
        return Promise.resolve(applyUpdate(row, data));
      },
    );
    mockPrisma.setup_profiles.delete.mockImplementation(({ where }: { where: { id: number } }) => {
      const row = profiles.find((profile) => profile.id === where.id)!;
      profiles = profiles.filter((profile) => profile.id !== where.id);
      return Promise.resolve(row);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByBike', () => {
    it("lists a bike's profiles oldest first", async () => {
      profiles.push(
        profileRow({ id: OTHER_PROFILE_ID, name: 'Race', created_at: new Date('2026-01-15T00:00:00.000Z') }),
      );

      const result = await service.findByBike(BIKE_ID, OWNER_ID);

      expect(mockPrisma.setup_profiles.findMany).toHaveBeenCalledWith({
        where: { bike_id: BIKE_ID },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      });
      expect(result.map((profile) => profile.name)).toEqual(['Trail', 'Race']);
    });

    // The lazy first profile is the screen's promise; nothing is written until the first save.
    it('answers an empty list for a bike with none', async () => {
      profiles = [];

      await expect(service.findByBike(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    it('serves the pressures as numbers', async () => {
      profiles = [profileRow(SHEET)];

      const [profile] = await service.findByBike(BIKE_ID, OWNER_ID);

      expect(profile.front_tire_psi).toBe(24.5);
      expect(profile.shock_pressure_psi).toBe(185);
      expect(profile.fork_rebound_ls).toBe(8);
    });

    // A bike is only reachable through its owner, and an unknown one leaks nothing.
    it("refuses a stranger's bike", async () => {
      await expect(service.findByBike(STRANGERS_BIKE_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.setup_profiles.findMany).not.toHaveBeenCalled();
    });

    it('refuses a missing bike', async () => {
      await expect(service.findByBike(MISSING_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
    });

    // An Archived Bike stays readable; only the writes refuse it.
    it('reads the profiles of an Archived Bike', async () => {
      bikes = [bikeRow({ is_deleted: true })];

      const result = await service.findByBike(BIKE_ID, OWNER_ID);

      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('writes every number as null when the profile starts blank', async () => {
      const profile = await service.create(BIKE_ID, OWNER_ID, { name: 'Race' });

      expect(mockPrisma.setup_profiles.create).toHaveBeenCalledWith({
        data: { bike_id: BIKE_ID, name: 'Race', ...BLANK_SHEET },
      });
      expect(profile).toMatchObject({ name: 'Race', ...BLANK_SHEET });
    });

    it('copies every number and the note from copy_of', async () => {
      profiles = [profileRow(SHEET)];

      const profile = await service.create(BIKE_ID, OWNER_ID, { name: 'Park', copy_of: PROFILE_ID });

      expect(mockPrisma.setup_profiles.create).toHaveBeenCalledWith({
        data: { bike_id: BIKE_ID, name: 'Park', ...SHEET },
      });
      expect(profile.name).toBe('Park');
      expect(profile.note).toBe(SHEET.note);
      expect(profile.fork_compression_ls).toBe(10);
      expect(profile.rear_tire_psi).toBe(27);
    });

    // The new profile is its own row; the one it was copied from is not touched.
    it('leaves the source profile as it was', async () => {
      await service.create(BIKE_ID, OWNER_ID, { name: 'Park', copy_of: PROFILE_ID });

      expect(mockPrisma.setup_profiles.update).not.toHaveBeenCalled();
      expect(profiles.filter((row) => row.bike_id === BIKE_ID)).toHaveLength(2);
    });

    it("refuses copy_of pointing at another bike's profile", async () => {
      await expect(service.create(BIKE_ID, OWNER_ID, { name: 'Park', copy_of: STRANGERS_PROFILE_ID })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.setup_profiles.create).not.toHaveBeenCalled();
    });

    it('refuses a duplicate name on the same bike', async () => {
      await expect(service.create(BIKE_ID, OWNER_ID, { name: 'Trail' })).rejects.toThrow(ConflictException);
      expect(mockPrisma.setup_profiles.create).not.toHaveBeenCalled();
    });

    // The same name on another bike is not a clash.
    it("allows a name another bike's profile carries", async () => {
      bikes.push(bikeRow({ id: 17 }));

      await expect(service.create(17, OWNER_ID, { name: 'Trail' })).resolves.toMatchObject({ bike_id: 17 });
    });

    it("refuses a stranger's or missing bike", async () => {
      await expect(service.create(STRANGERS_BIKE_ID, OWNER_ID, { name: 'Race' })).rejects.toThrow(NotFoundException);
      await expect(service.create(MISSING_ID, OWNER_ID, { name: 'Race' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.setup_profiles.create).not.toHaveBeenCalled();
    });

    it('refuses on an Archived Bike', async () => {
      bikes = [bikeRow({ is_deleted: true })];

      await expect(service.create(BIKE_ID, OWNER_ID, { name: 'Race' })).rejects.toThrow(ConflictException);
      expect(mockPrisma.setup_profiles.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('rewrites only the fields sent', async () => {
      profiles = [profileRow(SHEET)];

      const profile = await service.update(PROFILE_ID, OWNER_ID, { fork_pressure_psi: 90.5, fork_tokens: 3 });

      expect(mockPrisma.setup_profiles.update).toHaveBeenCalledWith({
        where: { id: PROFILE_ID },
        data: { fork_pressure_psi: 90.5, fork_tokens: 3 },
      });
      expect(profile.fork_pressure_psi).toBe(90.5);
      expect(profile.fork_tokens).toBe(3);
      // Untouched: what was there stays.
      expect(profile.note).toBe(SHEET.note);
      expect(profile.shock_rebound_ls).toBe(6);
    });

    it('clears a field sent as null', async () => {
      profiles = [profileRow(SHEET)];

      const profile = await service.update(PROFILE_ID, OWNER_ID, { note: null, fork_sag_percent: null });

      expect(profile.note).toBeNull();
      expect(profile.fork_sag_percent).toBeNull();
      expect(profile.fork_tokens).toBe(2);
    });

    // The dial's range is the dial's, not a fact about the fork: nothing caps the count.
    it('stores a click count above any dial range untouched', async () => {
      const profile = await service.update(PROFILE_ID, OWNER_ID, { fork_rebound_ls: 57 });

      expect(mockPrisma.setup_profiles.update).toHaveBeenCalledWith({
        where: { id: PROFILE_ID },
        data: { fork_rebound_ls: 57 },
      });
      expect(profile.fork_rebound_ls).toBe(57);
    });

    it('renames a profile', async () => {
      const profile = await service.update(PROFILE_ID, OWNER_ID, { name: 'Enduro' });

      expect(profile.name).toBe('Enduro');
    });

    it('refuses a rename to a name another profile of the bike carries', async () => {
      profiles.push(profileRow({ id: OTHER_PROFILE_ID, name: 'Race' }));

      await expect(service.update(PROFILE_ID, OWNER_ID, { name: 'Race' })).rejects.toThrow(ConflictException);
      expect(mockPrisma.setup_profiles.update).not.toHaveBeenCalled();
    });

    // Sending the name it already has is not a clash with itself.
    it('accepts the name the profile already has', async () => {
      await expect(service.update(PROFILE_ID, OWNER_ID, { name: 'Trail', note: 'dry' })).resolves.toMatchObject({
        name: 'Trail',
        note: 'dry',
      });
    });

    it("refuses a stranger's or missing profile", async () => {
      await expect(service.update(STRANGERS_PROFILE_ID, OWNER_ID, { note: 'x' })).rejects.toThrow(NotFoundException);
      await expect(service.update(MISSING_ID, OWNER_ID, { note: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.setup_profiles.update).not.toHaveBeenCalled();
    });

    it('refuses on an Archived Bike', async () => {
      bikes = [bikeRow({ is_deleted: true })];

      await expect(service.update(PROFILE_ID, OWNER_ID, { note: 'x' })).rejects.toThrow(ConflictException);
      expect(mockPrisma.setup_profiles.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the profile and answers with it', async () => {
      const profile = await service.delete(PROFILE_ID, OWNER_ID);

      expect(mockPrisma.setup_profiles.delete).toHaveBeenCalledWith({ where: { id: PROFILE_ID } });
      expect(profile.id).toBe(PROFILE_ID);
    });

    // The last one goes too; the bike then starts over with the screen's lazy first profile.
    it('deleting the last profile leaves an empty list', async () => {
      await service.delete(PROFILE_ID, OWNER_ID);

      await expect(service.findByBike(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    it("refuses a stranger's or missing profile", async () => {
      await expect(service.delete(STRANGERS_PROFILE_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
      await expect(service.delete(MISSING_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.setup_profiles.delete).not.toHaveBeenCalled();
    });

    it('refuses on an Archived Bike', async () => {
      bikes = [bikeRow({ is_deleted: true })];

      await expect(service.delete(PROFILE_ID, OWNER_ID)).rejects.toThrow(ConflictException);
      expect(mockPrisma.setup_profiles.delete).not.toHaveBeenCalled();
    });
  });
});
