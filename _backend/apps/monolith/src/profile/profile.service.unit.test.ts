import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, HttpException } from '@nestjs/common';
import { Prisma, profile_visibility } from '@prisma/client';
import { ProfileService } from './profile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RESERVED_HANDLES } from './reserved-handles';

const OWNER_ID = 7;
const OTHER_ID = 8;
const ORIGIN = 'https://app.bikecheck.cloud';
const NOW = new Date('2026-09-20T10:00:00.000Z');

interface ProfileRow {
  user_id: number;
  handle: string;
  visibility: profile_visibility;
  share_components: boolean;
  share_setup: boolean;
  share_history: boolean;
  share_costs: boolean;
  view_count: number;
  last_viewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface WhereUnique {
  user_id?: number;
  handle?: string;
}

describe('ProfileService', () => {
  let service: ProfileService;

  // The profiles table, kept in memory so a save can be read back through the service
  // rather than asserted on the call that wrote it.
  const table = new Map<number, ProfileRow>();

  const uniqueViolation = (): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`handle`)', {
      code: 'P2002',
      clientVersion: 'test',
    });

  const findByHandle = (handle: string): ProfileRow | null =>
    [...table.values()].find((row) => row.handle === handle) ?? null;

  const mockPrisma = {
    public_profiles: {
      findUnique: jest.fn(({ where }: { where: WhereUnique }) =>
        Promise.resolve(
          where.user_id !== undefined ? (table.get(where.user_id) ?? null) : findByHandle(where.handle ?? ''),
        ),
      ),
      upsert: jest.fn(
        ({
          where,
          create,
          update,
        }: {
          where: { user_id: number };
          create: Partial<ProfileRow> & { handle: string };
          update: Partial<ProfileRow>;
        }) => {
          const existing = table.get(where.user_id);
          const next: ProfileRow = existing
            ? { ...existing, ...update, updated_at: NOW }
            : {
                user_id: where.user_id,
                visibility: profile_visibility.OFF,
                share_components: true,
                share_setup: true,
                share_history: true,
                share_costs: false,
                view_count: 0,
                last_viewed_at: null,
                created_at: NOW,
                updated_at: NOW,
                ...create,
              };
          const clash = findByHandle(next.handle);
          if (clash && clash.user_id !== where.user_id) {
            return Promise.reject(uniqueViolation());
          }
          table.set(where.user_id, next);
          return Promise.resolve(next);
        },
      ),
    },
    users: { findUnique: jest.fn() },
  };

  const seed = (overrides: Partial<ProfileRow> & { user_id: number; handle: string }): void => {
    table.set(overrides.user_id, {
      visibility: profile_visibility.PUBLIC,
      share_components: true,
      share_setup: true,
      share_history: true,
      share_costs: false,
      view_count: 0,
      last_viewed_at: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    });
  };

  const rejectsWith = async (promise: Promise<unknown>, type: typeof HttpException, code: string): Promise<void> => {
    await expect(promise).rejects.toBeInstanceOf(type);
    await expect(promise).rejects.toThrow(code);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    table.clear();
    process.env.PUBLIC_APP_URL = ORIGIN;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ProfileService>(ProfileService);

    mockPrisma.users.findUnique.mockResolvedValue({ name: 'Jarda Novák', strava_username: 'jardal' });
  });

  describe('getMine', () => {
    it('answers OFF defaults and a suggested handle while no row exists', async () => {
      const profile = await service.getMine(OWNER_ID);

      expect(profile).toEqual({
        handle: null,
        visibility: 'OFF',
        share_components: true,
        share_setup: true,
        share_history: true,
        share_costs: false,
        stats: { views: 0, followers: 0, pending_requests: 0 },
        suggested_handle: 'jardal',
        public_origin: ORIGIN,
      });
    });

    it('falls back to a slug of the name without a Strava username', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ name: 'Jarda Novák', strava_username: null });

      const profile = await service.getMine(OWNER_ID);

      expect(profile.suggested_handle).toBe('jarda-novak');
    });

    it('slugs a Strava username the way it slugs a name', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ name: 'Jarda Novák', strava_username: 'Jarda.L' });

      const profile = await service.getMine(OWNER_ID);

      expect(profile.suggested_handle).toBe('jarda-l');
    });

    it('adds a numeric suffix when the suggestion is taken', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ name: 'Jarda Novák', strava_username: null });
      seed({ user_id: OTHER_ID, handle: 'jarda-novak' });
      seed({ user_id: 9, handle: 'jarda-novak-2' });

      const profile = await service.getMine(OWNER_ID);

      expect(profile.suggested_handle).toBe('jarda-novak-3');
    });

    it('never suggests a reserved word', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ name: 'Admin', strava_username: null });

      const profile = await service.getMine(OWNER_ID);

      expect(profile.suggested_handle).toBe('admin-2');
    });

    it('keeps a suggestion within 30 characters, suffix included', async () => {
      const longName = 'Maxmilian Alexander Konstantin Wittelsbach';
      mockPrisma.users.findUnique.mockResolvedValue({ name: longName, strava_username: null });
      seed({ user_id: OTHER_ID, handle: 'maxmilian-alexander-konstantin' });

      const profile = await service.getMine(OWNER_ID);

      expect(profile.suggested_handle).toBe('maxmilian-alexander-konstant-2');
      expect(profile.suggested_handle?.length).toBeLessThanOrEqual(30);
    });

    it('suggests a generic handle when the name slugs to nothing usable', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ name: 'Al', strava_username: null });

      const profile = await service.getMine(OWNER_ID);

      expect(profile.suggested_handle).toBe('rider');
    });

    it('writes nothing while suggesting', async () => {
      await service.getMine(OWNER_ID);
      const again = await service.getMine(OWNER_ID);

      expect(again.handle).toBeNull();
      expect(again.suggested_handle).toBe('jardal');
    });

    it('reads the saved settings and the view count back, with no suggestion', async () => {
      seed({
        user_id: OWNER_ID,
        handle: 'jaffa',
        visibility: profile_visibility.FOLLOWERS,
        share_history: false,
        view_count: 128,
      });

      const profile = await service.getMine(OWNER_ID);

      expect(profile).toMatchObject({
        handle: 'jaffa',
        visibility: 'FOLLOWERS',
        share_history: false,
        suggested_handle: null,
        stats: { views: 128, followers: 0, pending_requests: 0 },
      });
    });
  });

  describe('updateMine - the handle', () => {
    it('stores an uppercase handle lowercase and reads it back', async () => {
      const saved = await service.updateMine(OWNER_ID, { handle: 'JAFFA', visibility: profile_visibility.PUBLIC });

      expect(saved.handle).toBe('jaffa');
      expect((await service.getMine(OWNER_ID)).handle).toBe('jaffa');
    });

    it.each(['ab', 'a', ''])('refuses "%s" as too short', async (handle) => {
      await rejectsWith(service.updateMine(OWNER_ID, { handle }), BadRequestException, 'HANDLE_TOO_SHORT');
    });

    it('refuses a handle longer than 30 characters', async () => {
      await rejectsWith(
        service.updateMine(OWNER_ID, { handle: 'a'.repeat(31) }),
        BadRequestException,
        'HANDLE_TOO_LONG',
      );
      await expect(service.updateMine(OWNER_ID, { handle: 'a'.repeat(30) })).resolves.toBeDefined();
    });

    it.each(['jarda.novak', 'jarda novak', 'jarda-novák', 'jarda/novak'])(
      'refuses "%s" for its characters',
      async (handle) => {
        await rejectsWith(service.updateMine(OWNER_ID, { handle }), BadRequestException, 'HANDLE_INVALID_CHARS');
      },
    );

    it.each(['-jarda', '_jarda'])('refuses "%s" for how it starts', async (handle) => {
      await rejectsWith(service.updateMine(OWNER_ID, { handle }), BadRequestException, 'HANDLE_LEADING_DASH');
    });

    // The one-letter routes (/r, /u) fall to the length rule first; the rest are refused as reserved.
    const reservedWords = [...RESERVED_HANDLES].filter((handle) => handle.length >= 3);
    const oneLetterRoutes = [...RESERVED_HANDLES].filter((handle) => handle.length < 3);

    it.each(reservedWords)('refuses the reserved word "%s"', async (handle) => {
      await rejectsWith(service.updateMine(OWNER_ID, { handle }), BadRequestException, 'HANDLE_RESERVED');
    });

    it.each(oneLetterRoutes)('refuses the one-letter route "%s"', async (handle) => {
      await rejectsWith(service.updateMine(OWNER_ID, { handle }), BadRequestException, 'HANDLE_TOO_SHORT');
    });

    it('refuses a reserved word whatever its case', async () => {
      await rejectsWith(service.updateMine(OWNER_ID, { handle: 'BikeCheck' }), BadRequestException, 'HANDLE_RESERVED');
    });

    it('answers 409 HANDLE_TAKEN for a handle another account holds', async () => {
      seed({ user_id: OTHER_ID, handle: 'jaffa' });

      await rejectsWith(service.updateMine(OWNER_ID, { handle: 'Jaffa' }), ConflictException, 'HANDLE_TAKEN');
      expect(table.has(OWNER_ID)).toBe(false);
    });

    it('answers 409 HANDLE_TAKEN when two accounts race for one handle', async () => {
      mockPrisma.public_profiles.upsert.mockRejectedValueOnce(uniqueViolation());

      await rejectsWith(service.updateMine(OWNER_ID, { handle: 'jaffa' }), ConflictException, 'HANDLE_TAKEN');
    });

    it("accepts the caller's own handle sent again", async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa' });

      const saved = await service.updateMine(OWNER_ID, { handle: 'jaffa', share_costs: true });

      expect(saved).toMatchObject({ handle: 'jaffa', share_costs: true });
    });

    it('refuses a first save that names no handle', async () => {
      await rejectsWith(
        service.updateMine(OWNER_ID, { visibility: profile_visibility.PUBLIC }),
        BadRequestException,
        'HANDLE_REQUIRED',
      );
    });
  });

  describe('updateMine - visibility', () => {
    it('Off keeps the handle, the switches and the view count', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', share_costs: true, share_setup: false, view_count: 42 });

      const off = await service.updateMine(OWNER_ID, { visibility: profile_visibility.OFF });

      expect(off).toMatchObject({
        handle: 'jaffa',
        visibility: 'OFF',
        share_components: true,
        share_setup: false,
        share_history: true,
        share_costs: true,
        stats: { views: 42 },
      });
    });

    it('switching back on reads the same handle', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa' });
      await service.updateMine(OWNER_ID, { visibility: profile_visibility.OFF });

      const on = await service.updateMine(OWNER_ID, { visibility: profile_visibility.PUBLIC });

      expect(on).toMatchObject({ handle: 'jaffa', visibility: 'PUBLIC' });
    });

    it('writes any subset and leaves the rest', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });

      const saved = await service.updateMine(OWNER_ID, { share_history: false });

      expect(saved).toMatchObject({ handle: 'jaffa', visibility: 'FOLLOWERS', share_history: false });
    });

    it('creates the row with the defaults on the first confirm', async () => {
      const saved = await service.updateMine(OWNER_ID, { handle: 'jaffa' });

      expect(saved).toEqual({
        handle: 'jaffa',
        visibility: 'OFF',
        share_components: true,
        share_setup: true,
        share_history: true,
        share_costs: false,
        stats: { views: 0, followers: 0, pending_requests: 0 },
        suggested_handle: null,
        public_origin: ORIGIN,
      });
    });
  });

  describe('updateMine - rename', () => {
    it('frees the old handle for another account at once', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa' });

      await service.updateMine(OWNER_ID, { handle: 'jaffa-mtb' });
      const other = await service.updateMine(OTHER_ID, { handle: 'jaffa' });

      expect(other.handle).toBe('jaffa');
      expect((await service.getMine(OWNER_ID)).handle).toBe('jaffa-mtb');
    });
  });
});
