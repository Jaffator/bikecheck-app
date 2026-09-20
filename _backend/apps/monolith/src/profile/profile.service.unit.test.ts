import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { follow_status, Prisma, profile_visibility } from '@prisma/client';
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

// One relationship as the follows table holds it; the read rule and the counts read these.
interface FollowRow {
  follower_id: number;
  followed_id: number;
  status: follow_status;
}

// What the view counter writes: the count bumped, the moment, and updated_at pinned so
// Last Updated stays where it was.
interface ProfileUpdateData {
  view_count?: number | { increment: number };
  last_viewed_at?: Date | null;
  updated_at?: Date;
}

// The moments a garage can last have changed at, one per source, so a test can say which
// one Last Updated has to pick.
const PROFILE_UPDATED = new Date('2026-09-01T00:00:00.000Z');
const BIKE_UPDATED = new Date('2026-09-05T00:00:00.000Z');
const PART_UPDATED = new Date('2026-09-10T00:00:00.000Z');
const SERVICE_UPDATED = new Date('2026-09-12T00:00:00.000Z');

interface CatalogueRow {
  component_type: string;
  i18n_key: string | null;
  component_groups: { id: number; group_name: string; i18n_key: string | null };
}

// The whole components_mounted row, the note and the health index included, so a test can
// assert what of it never leaves.
interface PartRow {
  id: number;
  component_type_id: number;
  component_desc: string | null;
  position: string | null;
  note: string | null;
  total_km: number | null;
  total_time_min: number | null;
  health_index: number | null;
  is_active: boolean | null;
  is_deleted: boolean | null;
  updated_at: Date | null;
  component_types: CatalogueRow;
}

// One Action of a Service with its note and its own price on it, and the parts it touched.
interface ActionDoneRow {
  id: number;
  note: string | null;
  partial_cost: Prisma.Decimal | null;
  part_replaced: boolean | null;
  events_action: { action_name: string; i18n_key: string | null };
  action_done_component_map: { components_mounted: { component_types: CatalogueRow } }[];
}

// The whole events_bikes row - note, price, attachments - so a test can assert what of it
// never leaves.
interface ServiceRow {
  id: number;
  note: string | null;
  total_cost: Prisma.Decimal | null;
  service_date: Date | null;
  is_deleted: boolean | null;
  updated_at: Date | null;
  event_actions_done: ActionDoneRow[];
  bike_event_attachments: { id: number; name: string; url: string; content_type: string }[];
}

// The whole setup_profiles row, its note included, pressures as the Decimal the database holds.
interface SetupRow {
  id: number;
  bike_id: number;
  name: string;
  note: string | null;
  front_tire_psi: Prisma.Decimal | null;
  rear_tire_psi: Prisma.Decimal | null;
  fork_pressure_psi: Prisma.Decimal | null;
  fork_tokens: number | null;
  fork_sag_percent: number | null;
  fork_rebound_ls: number | null;
  fork_rebound_hs: number | null;
  fork_compression_ls: number | null;
  fork_compression_hs: number | null;
  shock_pressure_psi: Prisma.Decimal | null;
  shock_tokens: number | null;
  shock_sag_percent: number | null;
  shock_rebound_ls: number | null;
  shock_rebound_hs: number | null;
  shock_compression_ls: number | null;
  shock_compression_hs: number | null;
  created_at: Date;
  updated_at: Date;
}

interface BikeRow {
  id: number;
  user_id: number;
  bikename: string | null;
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
  image_url: string | null;
  total_km: number | null;
  total_time_min: number | null;
  ebike: boolean;
  frame_material: string | null;
  has_front_suspension: boolean;
  has_rear_suspension: boolean;
  active_setup_profile_id: number | null;
  is_deleted: boolean | null;
  is_shared: boolean;
  updated_at: Date | null;
  bike_types: { type: string | null; i18n_key: string | null } | null;
  components_mounted: PartRow[];
  events_bikes: ServiceRow[];
}

type Where = Record<string, unknown>;

// Enough of Prisma's where to answer the flat filters the garage read asks: equality and
// `{ not: x }`, which is how "not archived" is spelled on a nullable flag.
function matches(row: Record<string, unknown>, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    const value = row[key];
    if (condition !== null && typeof condition === 'object' && 'not' in condition) {
      return value !== (condition as { not: unknown }).not;
    }
    return value === condition;
  });
}

interface BikesFindManyArgs {
  where?: Where;
  include?: {
    components_mounted?: { where?: Where };
    events_bikes?: { where?: Where };
  };
}

// A bike as the garage include shapes it: of the parts and Services only the timestamps.
function garageShape(bike: BikeRow, include: BikesFindManyArgs['include']): Record<string, unknown> {
  return {
    ...bike,
    components_mounted: bike.components_mounted
      .filter((part) => matches(part, include?.components_mounted?.where))
      .map((part) => ({ updated_at: part.updated_at })),
    events_bikes: bike.events_bikes
      .filter((done) => matches(done, include?.events_bikes?.where))
      .map((done) => ({ updated_at: done.updated_at })),
  };
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

  // The bikes table with the parts and Services hanging off each row, filtered the way
  // the database would, so what a read lists is decided by the flags and not by the mock.
  const bikesTable: BikeRow[] = [];
  const setupTable: SetupRow[] = [];
  const followsTable: FollowRow[] = [];

  type ServiceWithBike = ServiceRow & { bike_id: number };

  const servicesOf = (where?: Where): ServiceWithBike[] =>
    bikesTable
      .flatMap((bike) => bike.events_bikes.map((row) => ({ ...row, bike_id: bike.id })))
      .filter((row) => matches(row, where));

  // Service Date descending with the undated last, the id breaking a tie - the order the
  // history asks for.
  const newestFirst = (rows: ServiceWithBike[]): ServiceWithBike[] =>
    [...rows].sort((a, b) => {
      if (a.service_date === null || b.service_date === null) {
        if (a.service_date === b.service_date) return b.id - a.id;
        return a.service_date === null ? 1 : -1;
      }
      return b.service_date.getTime() - a.service_date.getTime() || b.id - a.id;
    });

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
      // Emulates @updatedAt: the moment moves on every write unless the write pins it.
      update: jest.fn(({ where, data }: { where: WhereUnique; data: ProfileUpdateData }) => {
        const existing = where.user_id !== undefined ? table.get(where.user_id) : findByHandle(where.handle ?? '');
        if (!existing) return Promise.reject(new Error('Record to update not found'));
        const bump = data.view_count;
        const next: ProfileRow = {
          ...existing,
          view_count:
            bump === undefined
              ? existing.view_count
              : typeof bump === 'number'
                ? bump
                : existing.view_count + bump.increment,
          last_viewed_at: data.last_viewed_at === undefined ? existing.last_viewed_at : data.last_viewed_at,
          updated_at: data.updated_at ?? NOW,
        };
        table.set(existing.user_id, next);
        return Promise.resolve(next);
      }),
    },
    users: { findUnique: jest.fn() },
    bikes: {
      findMany: jest.fn(({ where, include }: BikesFindManyArgs) =>
        Promise.resolve(
          bikesTable
            .filter((bike) => matches(bike, where))
            .sort((a, b) => a.id - b.id)
            .map((bike) => garageShape(bike, include)),
        ),
      ),
      findFirst: jest.fn(({ where, include }: BikesFindManyArgs) => {
        const bike = bikesTable.find((row) => matches(row, where));
        return Promise.resolve(bike === undefined ? null : garageShape(bike, include));
      }),
    },
    // The parts hang off their bike row; the query sees them as one table keyed by bike_id.
    components_mounted: {
      findMany: jest.fn(({ where }: { where?: Where }) =>
        Promise.resolve(
          bikesTable
            .flatMap((bike) => bike.components_mounted.map((part) => ({ ...part, bike_id: bike.id })))
            .filter((part) => matches(part, where))
            .sort((a, b) => a.component_type_id - b.component_type_id || a.id - b.id),
        ),
      ),
    },
    // Oldest first, as the Setup screen lists them - the order the query asks for.
    setup_profiles: {
      findMany: jest.fn(({ where }: { where?: Where }) =>
        Promise.resolve(
          setupTable
            .filter((row) => matches(row, where))
            .sort((a, b) => a.created_at.getTime() - b.created_at.getTime() || a.id - b.id),
        ),
      ),
    },
    // The Services hang off their bike row too; the whole row comes back whatever the
    // select asked, so what the payload leaves out is the service's doing, not the mock's.
    events_bikes: {
      findMany: jest.fn(({ where, take, skip }: { where?: Where; take?: number; skip?: number }) =>
        Promise.resolve(newestFirst(servicesOf(where)).slice(skip ?? 0, (skip ?? 0) + (take ?? Infinity))),
      ),
      count: jest.fn(({ where }: { where?: Where }) => Promise.resolve(servicesOf(where).length)),
      aggregate: jest.fn(({ where }: { where?: Where }) => {
        const priced = servicesOf(where).filter((row) => row.total_cost !== null);
        const total = priced.reduce((sum, row) => sum + Number(row.total_cost), 0);
        return Promise.resolve({ _sum: { total_cost: priced.length === 0 ? null : new Prisma.Decimal(total) } });
      }),
    },
    event_actions_done: {
      count: jest.fn(({ where }: { where: { part_replaced: boolean; events_bikes: Where } }) =>
        Promise.resolve(
          servicesOf(where.events_bikes)
            .flatMap((row) => row.event_actions_done)
            .filter((action) => action.part_replaced === where.part_replaced).length,
        ),
      ),
    },
    follows: {
      findUnique: jest.fn(({ where }: { where: { follower_id_followed_id: Omit<FollowRow, 'status'> } }) => {
        const key = where.follower_id_followed_id;
        return Promise.resolve(
          followsTable.find((row) => row.follower_id === key.follower_id && row.followed_id === key.followed_id) ??
            null,
        );
      }),
      count: jest.fn(({ where }: { where?: Where }) =>
        Promise.resolve(followsTable.filter((row) => matches(row, where)).length),
      ),
    },
  };

  const seedFollow = (followerId: number, followedId: number, status = follow_status.ACCEPTED): void => {
    followsTable.push({ follower_id: followerId, followed_id: followedId, status });
  };

  const unfollow = (followerId: number, followedId: number): void => {
    const at = followsTable.findIndex((row) => row.follower_id === followerId && row.followed_id === followedId);
    if (at >= 0) followsTable.splice(at, 1);
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

  // The seeded catalogue rows the fixtures mount, keyed the way the seed names them.
  const SUSPENSION = { id: 1, group_name: 'Suspension', i18n_key: 'componentGroup.suspension' };
  const WHEELS = { id: 5, group_name: 'Wheels', i18n_key: 'componentGroup.wheels' };
  const DRIVETRAIN = { id: 6, group_name: 'Drivetrain', i18n_key: 'componentGroup.drivetrain' };
  const FORK_TYPE: CatalogueRow = { component_type: 'Fork', i18n_key: 'component.fork', component_groups: SUSPENSION };
  const TIRE_TYPE: CatalogueRow = { component_type: 'Tire', i18n_key: 'component.tire', component_groups: WHEELS };
  const CHAIN_TYPE: CatalogueRow = {
    component_type: 'Chain',
    i18n_key: 'component.chain',
    component_groups: DRIVETRAIN,
  };

  let nextPartId = 1;

  // A mounted part with a note and a health index on it, so the payload has something to leave out.
  const part = (overrides: Partial<PartRow> = {}): PartRow => ({
    id: nextPartId++,
    component_type_id: 12,
    component_desc: 'Fox 38 Factory GRIP2',
    position: null,
    note: 'Mechanic Pepa, 777 123 456',
    total_km: 1200,
    total_time_min: 4800,
    health_index: 42,
    is_active: true,
    is_deleted: false,
    updated_at: PART_UPDATED,
    component_types: FORK_TYPE,
    ...overrides,
  });

  let nextServiceId = 1;
  let nextActionId = 1;

  // One Action with a note and its own price written down, on the chain unless told otherwise.
  const action = (overrides: Partial<ActionDoneRow> = {}): ActionDoneRow => ({
    id: nextActionId++,
    note: 'Waxed, not oiled',
    partial_cost: new Prisma.Decimal(300),
    part_replaced: false,
    events_action: { action_name: 'Chain Cleaning', i18n_key: 'action.chainCleaning' },
    action_done_component_map: [{ components_mounted: { component_types: CHAIN_TYPE } }],
    ...overrides,
  });

  // A dated, priced Service with a note and an invoice attached, so the payload has
  // plenty to leave out.
  const done = (overrides: Partial<ServiceRow> = {}): ServiceRow => ({
    id: nextServiceId++,
    note: 'Invoice 4711, mechanic Pepa 777 123 456',
    total_cost: new Prisma.Decimal(1200),
    service_date: new Date('2026-08-15T00:00:00.000Z'),
    is_deleted: false,
    updated_at: SERVICE_UPDATED,
    event_actions_done: [action()],
    bike_event_attachments: [
      {
        id: 1,
        name: 'invoice.pdf',
        url: 'https://r2.example.com/service-attachments/invoice.pdf',
        content_type: 'application/pdf',
      },
    ],
    ...overrides,
  });

  const seedBike = (overrides: Partial<BikeRow> & { id: number }): BikeRow => {
    const row: BikeRow = {
      user_id: OWNER_ID,
      bikename: 'Rallon',
      bike_brand: 'Orbea',
      bike_model: 'Rallon M10',
      year: 2024,
      image_url: 'https://storage.example.com/bikes/rallon.webp',
      total_km: 4187,
      total_time_min: 15000,
      ebike: false,
      frame_material: 'carbon',
      has_front_suspension: true,
      has_rear_suspension: true,
      active_setup_profile_id: null,
      is_deleted: false,
      is_shared: true,
      updated_at: BIKE_UPDATED,
      bike_types: { type: 'Enduro', i18n_key: 'bikeType.enduro' },
      components_mounted: [],
      events_bikes: [],
      ...overrides,
    };
    bikesTable.push(row);
    return row;
  };

  // A Setup Profile with every number and a note written down, in psi as the row holds them.
  const seedSetup = (overrides: Partial<SetupRow> & { id: number; bike_id: number }): SetupRow => {
    const row: SetupRow = {
      name: 'Trail',
      note: 'Wet, muddy Loket',
      front_tire_psi: new Prisma.Decimal(24.5),
      rear_tire_psi: new Prisma.Decimal(27),
      fork_pressure_psi: new Prisma.Decimal(85),
      fork_tokens: 2,
      fork_sag_percent: 20,
      fork_rebound_ls: 8,
      fork_rebound_hs: 3,
      fork_compression_ls: 10,
      fork_compression_hs: 2,
      shock_pressure_psi: new Prisma.Decimal(185),
      shock_tokens: 1,
      shock_sag_percent: 30,
      shock_rebound_ls: 6,
      shock_rebound_hs: 2,
      shock_compression_ls: 9,
      shock_compression_hs: 1,
      created_at: new Date(`2026-09-${String(overrides.id).padStart(2, '0')}T00:00:00.000Z`),
      updated_at: NOW,
      ...overrides,
    };
    setupTable.push(row);
    return row;
  };

  // Everything the users row carries, so a test can assert what never leaves it.
  const ownerRow = {
    id: OWNER_ID,
    name: 'Jarda Novák',
    email: 'jarda@example.com',
    password_hash: 'hash',
    avatar_url: 'https://lh3.googleusercontent.com/jarda',
    strava_username: 'jardal',
    strava_avatar_url: 'https://strava.example.com/jarda.jpg',
    currency: 'EUR',
    tire_pressure_unit: 'psi',
  };

  const rejectsWith = async (promise: Promise<unknown>, type: typeof HttpException, code: string): Promise<void> => {
    await expect(promise).rejects.toBeInstanceOf(type);
    await expect(promise).rejects.toThrow(code);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    table.clear();
    bikesTable.length = 0;
    setupTable.length = 0;
    followsTable.length = 0;
    nextPartId = 1;
    nextServiceId = 1;
    nextActionId = 1;
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

    it('counts the accepted followers: not a request, not whom I follow myself', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa' });
      seedFollow(OTHER_ID, OWNER_ID);
      seedFollow(9, OWNER_ID);
      seedFollow(10, OWNER_ID, follow_status.PENDING);
      seedFollow(OWNER_ID, OTHER_ID);

      expect((await service.getMine(OWNER_ID)).stats.followers).toBe(2);
    });

    it('a follower who left is no longer counted', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa' });
      seedFollow(OTHER_ID, OWNER_ID);
      unfollow(OTHER_ID, OWNER_ID);

      expect((await service.getMine(OWNER_ID)).stats.followers).toBe(0);
    });

    it('a saved setting reads the count back too', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa' });
      seedFollow(OTHER_ID, OWNER_ID);

      expect((await service.updateMine(OWNER_ID, { share_costs: true })).stats.followers).toBe(1);
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

  describe('read - the rule', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seedBike({ id: 1 });
    });

    it('PUBLIC: a stranger reads the garage', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page).toMatchObject({
        owner: { handle: 'jaffa', name: 'Jarda Novák', avatar_url: 'https://lh3.googleusercontent.com/jarda' },
        visibility: 'PUBLIC',
        relation: 'NONE',
      });
      expect(page.garage?.bikes.map((bike) => bike.id)).toEqual([1]);
    });

    it('FOLLOWERS: a stranger gets the header only', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page).toEqual({
        owner: { handle: 'jaffa', name: 'Jarda Novák', avatar_url: 'https://lh3.googleusercontent.com/jarda' },
        visibility: 'FOLLOWERS',
        relation: 'NONE',
        garage: null,
      });
    });

    it('FOLLOWERS: the owner reads the garage', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });

      const page = await service.read('jaffa', OWNER_ID);

      expect(page.relation).toBe('SELF');
      expect(page.garage?.bikes.map((bike) => bike.id)).toEqual([1]);
    });

    it('OFF: the owner reads the garage and is told the state', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });

      const page = await service.read('jaffa', OWNER_ID);

      expect(page).toMatchObject({ visibility: 'OFF', relation: 'SELF' });
      expect(page.garage?.bikes.map((bike) => bike.id)).toEqual([1]);
    });

    it('OFF: a stranger gets 404', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });

      await expect(service.read('jaffa', OTHER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('FOLLOWERS: an accepted follower reads the garage and is told FOLLOWING', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seedFollow(OTHER_ID, OWNER_ID);

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.relation).toBe('FOLLOWING');
      expect(page.garage?.bikes.map((bike) => bike.id)).toEqual([1]);
    });

    it('PUBLIC: a follower reads what a stranger reads, and is told FOLLOWING', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
      seedFollow(OTHER_ID, OWNER_ID);

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.relation).toBe('FOLLOWING');
      expect(page.garage?.bikes.map((bike) => bike.id)).toEqual([1]);
    });

    it('FOLLOWERS: a follower who left gets the header only on the next call', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seedFollow(OTHER_ID, OWNER_ID);
      expect((await service.read('jaffa', OTHER_ID)).garage).not.toBeNull();

      unfollow(OTHER_ID, OWNER_ID);

      expect(await service.read('jaffa', OTHER_ID)).toMatchObject({ relation: 'NONE', garage: null });
    });

    it('following the owner the other way round opens nothing', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seedFollow(OWNER_ID, OTHER_ID);

      expect(await service.read('jaffa', OTHER_ID)).toMatchObject({ relation: 'NONE', garage: null });
    });

    it('OFF: an accepted follower gets 404 too', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });
      seedFollow(OTHER_ID, OWNER_ID);

      await expect(service.read('jaffa', OTHER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('the owner is SELF whatever rows stand', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seedFollow(OWNER_ID, OTHER_ID);

      expect((await service.read('jaffa', OWNER_ID)).relation).toBe('SELF');
    });

    it('OFF and unknown answer the same 404', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });

      const off = service.read('jaffa', OTHER_ID).catch((error: unknown) => error);
      const unknown = service.read('nobody', OTHER_ID).catch((error: unknown) => error);

      expect(await off).toBeInstanceOf(NotFoundException);
      expect(await unknown).toBeInstanceOf(NotFoundException);
      expect((await off) as Error).toMatchObject({ message: ((await unknown) as Error).message });
    });

    it('a handle renamed away answers 404 and the new one opens', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
      await service.updateMine(OWNER_ID, { handle: 'jaffa-mtb' });

      await expect(service.read('jaffa', OTHER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect((await service.read('jaffa-mtb', OTHER_ID)).owner.handle).toBe('jaffa-mtb');
    });

    it('matches the handle whatever its case', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      expect((await service.read('JAFFA', OTHER_ID)).owner.handle).toBe('jaffa');
    });

    it('counts no view', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, view_count: 3 });

      await service.read('jaffa', OTHER_ID);
      await service.read('jaffa', OWNER_ID);

      expect((await service.getMine(OWNER_ID)).stats.views).toBe(3);
      expect(table.get(OWNER_ID)?.last_viewed_at).toBeNull();
    });
  });

  describe('read - the garage', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
    });

    it('lists the shared bikes in use and leaves archived and unshared ones out', async () => {
      seedBike({ id: 1 });
      seedBike({ id: 2, is_shared: false });
      seedBike({ id: 3, is_deleted: true });
      seedBike({ id: 4, is_deleted: null });
      seedBike({ id: 5, user_id: OTHER_ID });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage?.bikes.map((bike) => bike.id)).toEqual([1, 4]);
    });

    it('un-archiving brings a bike back as it was set', async () => {
      const archived = seedBike({ id: 1, is_deleted: true, is_shared: true });
      const hidden = seedBike({ id: 2, is_deleted: true, is_shared: false });
      expect((await service.read('jaffa', OTHER_ID)).garage?.bikes).toEqual([]);

      archived.is_deleted = false;
      hidden.is_deleted = false;
      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage?.bikes.map((bike) => bike.id)).toEqual([1]);
    });

    it('totals count the listed bikes only', async () => {
      seedBike({ id: 1, total_km: 4187 });
      seedBike({ id: 2, total_km: 800 });
      seedBike({ id: 3, total_km: null });
      seedBike({ id: 4, total_km: 9999, is_shared: false });
      seedBike({ id: 5, total_km: 9999, is_deleted: true });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage?.totals).toMatchObject({ bikes: 3, distance_km: 4987 });
    });

    it('counts mounted parts and Services, per bike and in total', async () => {
      seedBike({
        id: 1,
        components_mounted: [part(), part(), part({ is_active: false }), part({ is_deleted: true })],
        events_bikes: [done(), done(), done(), done({ is_deleted: true })],
      });
      seedBike({ id: 2, components_mounted: [part()], events_bikes: [] });
      seedBike({ id: 3, is_shared: false, components_mounted: [part()], events_bikes: [done()] });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage?.totals).toMatchObject({ components: 3, services: 3 });
      expect(page.garage?.bikes.map((bike) => [bike.components, bike.services])).toEqual([
        [2, 3],
        [1, 0],
      ]);
    });

    it('components off: the parts count is null on the totals and on every card', async () => {
      table.get(OWNER_ID)!.share_components = false;
      seedBike({ id: 1, components_mounted: [part()], events_bikes: [done()] });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage?.shares).toEqual({ components: false, setup: true, history: true, costs: false });
      expect(page.garage?.totals).toMatchObject({ components: null, services: 1 });
      expect(page.garage?.bikes[0]).toMatchObject({ components: null, services: 1 });
    });

    it('history off: the Services count is null on the totals and on every card', async () => {
      table.get(OWNER_ID)!.share_history = false;
      seedBike({ id: 1, components_mounted: [part()], events_bikes: [done()] });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage?.totals).toMatchObject({ components: 1, services: null });
      expect(page.garage?.bikes[0]).toMatchObject({ components: 1, services: null });
    });

    it('draws the card from the bike: names, type as a catalogue label, photo, distance', async () => {
      seedBike({ id: 1 });
      seedBike({
        id: 2,
        bikename: null,
        bike_model: null,
        year: null,
        image_url: null,
        total_km: null,
        bike_types: null,
      });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage?.bikes[0]).toEqual({
        id: 1,
        name: 'Rallon',
        brand: 'Orbea',
        model: 'Rallon M10',
        year: 2024,
        type: { i18n_key: 'bikeType.enduro', name: 'Enduro' },
        image_url: 'https://storage.example.com/bikes/rallon.webp',
        distance_km: 4187,
        components: 0,
        services: 0,
      });
      expect(page.garage?.bikes[1]).toMatchObject({
        name: null,
        model: null,
        year: null,
        type: null,
        image_url: null,
        distance_km: 0,
      });
    });

    it("writes the numbers in the owner's currency and tyre unit", async () => {
      seedBike({ id: 1 });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage).toMatchObject({ currency: 'EUR', tire_pressure_unit: 'psi' });
    });

    it('falls back to CZK for an owner who chose no currency', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ ...ownerRow, currency: null });
      seedBike({ id: 1 });

      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage?.currency).toBe('CZK');
    });

    it('an empty garage is a garage, not a locked one', async () => {
      const page = await service.read('jaffa', OTHER_ID);

      expect(page.garage).toMatchObject({
        bikes: [],
        totals: { bikes: 0, distance_km: 0, components: 0, services: 0 },
      });
    });
  });

  describe('read - Last Updated', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, updated_at: PROFILE_UPDATED });
    });

    it('is the profile itself when nothing on the bikes is newer', async () => {
      const older = new Date('2026-08-01T00:00:00.000Z');
      seedBike({
        id: 1,
        updated_at: older,
        components_mounted: [part({ updated_at: older })],
        events_bikes: [done({ updated_at: older })],
      });

      expect((await service.read('jaffa', OTHER_ID)).garage?.updated_at).toBe(PROFILE_UPDATED.toISOString());
    });

    it('is the newest bike, part or Service, whichever moved last', async () => {
      seedBike({ id: 1, updated_at: BIKE_UPDATED });
      expect((await service.read('jaffa', OTHER_ID)).garage?.updated_at).toBe(BIKE_UPDATED.toISOString());

      bikesTable[0].components_mounted = [part({ updated_at: PART_UPDATED })];
      expect((await service.read('jaffa', OTHER_ID)).garage?.updated_at).toBe(PART_UPDATED.toISOString());

      bikesTable[0].events_bikes = [done({ updated_at: SERVICE_UPDATED })];
      expect((await service.read('jaffa', OTHER_ID)).garage?.updated_at).toBe(SERVICE_UPDATED.toISOString());
    });

    it('ignores what is not on the page: archived and unshared bikes, dismounted parts, deleted Services', async () => {
      const far = new Date('2027-01-01T00:00:00.000Z');
      seedBike({
        id: 1,
        updated_at: BIKE_UPDATED,
        components_mounted: [part({ is_active: false, updated_at: far })],
        events_bikes: [done({ is_deleted: true, updated_at: far })],
      });
      seedBike({ id: 2, is_deleted: true, updated_at: far });
      seedBike({ id: 3, is_shared: false, updated_at: far });

      expect((await service.read('jaffa', OTHER_ID)).garage?.updated_at).toBe(BIKE_UPDATED.toISOString());
    });

    it('does not move when the page is read', async () => {
      seedBike({ id: 1, updated_at: BIKE_UPDATED });

      const first = await service.read('jaffa', OTHER_ID);
      const again = await service.read('jaffa', OWNER_ID);

      expect(again.garage?.updated_at).toBe(first.garage?.updated_at);
      expect(table.get(OWNER_ID)?.updated_at).toBe(PROFILE_UPDATED);
    });
  });

  describe('read - never out', () => {
    it('carries no email, no Strava picture and nothing of another account', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
      seed({ user_id: OTHER_ID, handle: 'stranger', visibility: profile_visibility.PUBLIC });
      seedBike({ id: 1, components_mounted: [part()], events_bikes: [done()] });
      seedBike({ id: 2, user_id: OTHER_ID, bikename: 'Strangers bike' });

      const page = JSON.stringify(await service.read('jaffa', OTHER_ID));

      expect(page).not.toContain('jarda@example.com');
      expect(page).not.toContain('strava');
      expect(page).not.toContain('password');
      expect(page).not.toContain('user_id');
      expect(page).not.toContain('stranger');
      expect(page).not.toContain('Strangers bike');
    });
  });

  describe('readPublic - the web rule', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seedBike({ id: 1 });
    });

    it('PUBLIC: opens with no session - the owner in the header, the garage as the app reads it', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      const page = await service.readPublic('jaffa');

      expect(page).toMatchObject({
        owner: { handle: 'jaffa', name: 'Jarda Novák', avatar_url: 'https://lh3.googleusercontent.com/jarda' },
        visibility: 'PUBLIC',
        relation: 'NONE',
      });
      expect(page.garage.bikes.map((bike) => bike.id)).toEqual([1]);
      expect(page.garage).toEqual((await service.read('jaffa', OTHER_ID)).garage);
    });

    it('FOLLOWERS, OFF and an unknown handle answer one identical 404', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seed({ user_id: OTHER_ID, handle: 'quiet', visibility: profile_visibility.OFF });

      const answers = await Promise.all(
        ['jaffa', 'quiet', 'nobody'].map((handle) => service.readPublic(handle).catch((error: unknown) => error)),
      );

      for (const answer of answers) {
        expect(answer).toBeInstanceOf(NotFoundException);
        expect((answer as HttpException).getResponse()).toEqual((answers[0] as HttpException).getResponse());
      }
    });

    it('answers the same 404 as the in-app route, so the two cannot be told apart either', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });

      const web = await service.readPublic('jaffa').catch((error: unknown) => error);
      const app = await service.read('jaffa', OTHER_ID).catch((error: unknown) => error);

      expect((web as HttpException).getResponse()).toEqual((app as HttpException).getResponse());
    });

    it('FOLLOWERS: closed however many followers stand - the web has no viewer to be one', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seedFollow(OTHER_ID, OWNER_ID);

      await expect(service.readPublic('jaffa')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.follows.findUnique).not.toHaveBeenCalled();
    });

    it('matches the handle whatever its case', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      expect((await service.readPublic('JAFFA')).owner.handle).toBe('jaffa');
    });
  });

  describe('readPublic - the view', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seedBike({ id: 1 });
    });

    it('counts one view per open and stamps the moment', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, view_count: 3 });

      await service.readPublic('jaffa');
      await service.readPublic('JAFFA');

      expect((await service.getMine(OWNER_ID)).stats.views).toBe(5);
      expect(table.get(OWNER_ID)?.last_viewed_at).toBeInstanceOf(Date);
    });

    it('a closed profile counts nothing', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS, view_count: 3 });

      await expect(service.readPublic('jaffa')).rejects.toBeInstanceOf(NotFoundException);

      expect((await service.getMine(OWNER_ID)).stats.views).toBe(3);
      expect(table.get(OWNER_ID)?.last_viewed_at).toBeNull();
    });

    it('does not move Last Updated', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, updated_at: PROFILE_UPDATED });
      bikesTable[0].updated_at = new Date('2026-08-01T00:00:00.000Z');

      await service.readPublic('jaffa');
      const again = await service.readPublic('jaffa');

      expect(again.garage.updated_at).toBe(PROFILE_UPDATED.toISOString());
      expect(table.get(OWNER_ID)?.updated_at).toBe(PROFILE_UPDATED);
    });

    it('the in-app reads count nothing: the garage, the bike and its older Services', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, view_count: 3 });

      await service.read('jaffa', OTHER_ID);
      await service.read('jaffa', OWNER_ID);
      await service.readBike('jaffa', 1, OTHER_ID);
      await service.readBikeServices('jaffa', 1, OTHER_ID, 20, 0);

      expect((await service.getMine(OWNER_ID)).stats.views).toBe(3);
      expect(table.get(OWNER_ID)?.last_viewed_at).toBeNull();
    });
  });

  describe('readPublicBike - the web rule', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seedBike({ id: 1, components_mounted: [part()], events_bikes: [done()] });
    });

    it('PUBLIC: opens with no session - the same page the app gives a stranger', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      const page = await service.readPublicBike('jaffa', 1);

      expect(page).toMatchObject({
        owner: { handle: 'jaffa', name: 'Jarda Novák' },
        visibility: 'PUBLIC',
        relation: 'NONE',
        currency: 'EUR',
        tire_pressure_unit: 'psi',
        bike: { id: 1, name: 'Rallon' },
      });
      expect(page).toEqual(await service.readBike('jaffa', 1, OTHER_ID));
    });

    it('FOLLOWERS, OFF and an unknown handle answer one identical 404 - the owner has no way in either', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seed({ user_id: OTHER_ID, handle: 'quiet', visibility: profile_visibility.OFF });
      seedBike({ id: 2, user_id: OTHER_ID });

      const answers = await Promise.all(
        [
          service.readPublicBike('jaffa', 1),
          service.readPublicBike('quiet', 2),
          service.readPublicBike('nobody', 1),
        ].map((promise) => promise.catch((error: unknown) => error)),
      );

      for (const answer of answers) {
        expect(answer).toBeInstanceOf(NotFoundException);
        expect((answer as HttpException).getResponse()).toEqual((answers[0] as HttpException).getResponse());
      }
    });

    it("unknown, unshared, archived and another account's bike answer the same 404 as a closed profile", async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
      seed({ user_id: OTHER_ID, handle: 'quiet', visibility: profile_visibility.OFF });
      seedBike({ id: 2, is_shared: false });
      seedBike({ id: 3, is_deleted: true });
      seedBike({ id: 4, user_id: OTHER_ID });

      const closed = await service.readPublicBike('quiet', 4).catch((error: unknown) => error);
      for (const bikeId of [99, 2, 3, 4]) {
        const answer = await service.readPublicBike('jaffa', bikeId).catch((error: unknown) => error);
        expect(answer).toBeInstanceOf(NotFoundException);
        expect((answer as HttpException).getResponse()).toEqual((closed as HttpException).getResponse());
      }
    });

    it('matches the handle whatever its case', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      expect((await service.readPublicBike('JAFFA', 1)).owner.handle).toBe('jaffa');
    });
  });

  describe('readPublicBike - the view', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seedBike({ id: 1, events_bikes: Array.from({ length: 25 }, (_, index) => done({ id: index + 1 })) });
    });

    it('counts nothing: neither the bike page nor a page of its older Services writes the profile', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, view_count: 3 });

      await service.readPublicBike('jaffa', 1);
      await service.readPublicBikeServices('jaffa', 1, 20, 20);

      expect(mockPrisma.public_profiles.update).not.toHaveBeenCalled();
      expect((await service.getMine(OWNER_ID)).stats.views).toBe(3);
      expect(table.get(OWNER_ID)?.last_viewed_at).toBeNull();
    });
  });

  describe('readPublicBikeServices - paging under the web rule', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      // 30 dated Services, one a day, the newest on day 30 - id 30.
      seedBike({
        id: 1,
        events_bikes: Array.from({ length: 30 }, (_, index) =>
          done({ id: index + 1, service_date: new Date(Date.UTC(2026, 0, index + 1)) }),
        ),
      });
    });

    it('PUBLIC: pages the Services past the first 20 with the total alongside, as the app does', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      const page = await service.readPublicBikeServices('jaffa', 1, Number.NaN, 20);

      expect(page.services.map((row) => row.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
      expect(page.total_count).toBe(30);
      expect(page).toEqual(await service.readBikeServices('jaffa', 1, OTHER_ID, Number.NaN, 20));
    });

    it("keeps the costs rule: absent with costs off, on the rows in the owner's currency with costs on", async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      const hidden = await service.readPublicBikeServices('jaffa', 1, 1, 0);
      table.get(OWNER_ID)!.share_costs = true;
      const shown = await service.readPublicBikeServices('jaffa', 1, 1, 0);

      expect(hidden.services[0]).not.toHaveProperty('cost');
      expect(shown.services[0].cost).toEqual({ amount: 1200, currency: 'EUR' });
    });

    it('FOLLOWERS, OFF, history off, an unknown handle and a hidden bike answer one identical 404', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seed({ user_id: OTHER_ID, handle: 'quiet', visibility: profile_visibility.OFF });
      seedBike({ id: 2, user_id: OTHER_ID });
      seedBike({ id: 3, is_shared: false });

      const answers = await Promise.all(
        [
          service.readPublicBikeServices('jaffa', 1, 20, 0),
          service.readPublicBikeServices('quiet', 2, 20, 0),
          service.readPublicBikeServices('nobody', 1, 20, 0),
          service.readPublicBikeServices('jaffa', 3, 20, 0),
        ].map((promise) => promise.catch((error: unknown) => error)),
      );
      table.get(OWNER_ID)!.visibility = profile_visibility.PUBLIC;
      table.get(OWNER_ID)!.share_history = false;
      answers.push(await service.readPublicBikeServices('jaffa', 1, 20, 0).catch((error: unknown) => error));

      for (const answer of answers) {
        expect(answer).toBeInstanceOf(NotFoundException);
        expect((answer as HttpException).getResponse()).toEqual((answers[0] as HttpException).getResponse());
      }
    });
  });

  describe('readBike - the rule', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seedBike({ id: 1 });
    });

    it('PUBLIC: a stranger reads the bike, with the owner in the header', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });

      const page = await service.readBike('jaffa', 1, OTHER_ID);

      expect(page).toMatchObject({
        owner: { handle: 'jaffa', name: 'Jarda Novák', avatar_url: 'https://lh3.googleusercontent.com/jarda' },
        visibility: 'PUBLIC',
        relation: 'NONE',
        currency: 'EUR',
        tire_pressure_unit: 'psi',
        bike: { id: 1, name: 'Rallon' },
      });
    });

    it('FOLLOWERS: a stranger gets 404, not a header', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });

      await expect(service.readBike('jaffa', 1, OTHER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('FOLLOWERS: an accepted follower reads the bike and is told FOLLOWING', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seedFollow(OTHER_ID, OWNER_ID);

      expect(await service.readBike('jaffa', 1, OTHER_ID)).toMatchObject({ relation: 'FOLLOWING', bike: { id: 1 } });
    });

    it('OFF: an accepted follower gets 404 too', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });
      seedFollow(OTHER_ID, OWNER_ID);

      await expect(service.readBike('jaffa', 1, OTHER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('FOLLOWERS: the owner reads the bike', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });

      const page = await service.readBike('jaffa', 1, OWNER_ID);

      expect(page).toMatchObject({ relation: 'SELF', bike: { id: 1 } });
    });

    it('OFF: a stranger gets 404', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });

      await expect(service.readBike('jaffa', 1, OTHER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('OFF: the owner reads the bike and is told the state', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });

      const page = await service.readBike('jaffa', 1, OWNER_ID);

      expect(page).toMatchObject({ visibility: 'OFF', relation: 'SELF', bike: { id: 1 } });
    });

    it('unknown handle, unknown bike, unshared, archived and another account answer one 404', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
      seedBike({ id: 2, is_shared: false });
      seedBike({ id: 3, is_deleted: true });
      seedBike({ id: 4, user_id: OTHER_ID });

      const messages = await Promise.all(
        [
          service.readBike('nobody', 1, OTHER_ID),
          service.readBike('jaffa', 99, OTHER_ID),
          service.readBike('jaffa', 2, OTHER_ID),
          service.readBike('jaffa', 3, OTHER_ID),
          service.readBike('jaffa', 4, OTHER_ID),
        ].map((promise) =>
          promise.then(
            () => 'resolved',
            (error: unknown) => error,
          ),
        ),
      );

      for (const error of messages) expect(error).toBeInstanceOf(NotFoundException);
      expect(new Set(messages.map((error) => (error as Error).message)).size).toBe(1);
    });

    it('the owner cannot read their own unshared or archived bike through the profile either', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
      seedBike({ id: 2, is_shared: false });
      seedBike({ id: 3, is_deleted: true });

      await expect(service.readBike('jaffa', 2, OWNER_ID)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.readBike('jaffa', 3, OWNER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('matches the handle whatever its case and counts no view', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, view_count: 3 });

      const page = await service.readBike('JAFFA', 1, OTHER_ID);

      expect(page.owner.handle).toBe('jaffa');
      expect((await service.getMine(OWNER_ID)).stats.views).toBe(3);
    });
  });

  describe('readBike - the hero and the switches', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
    });

    it('reads the card plus saddle time, e-bike, frame material and the suspension flags', async () => {
      seedBike({
        id: 1,
        components_mounted: [part(), part({ is_active: false })],
        events_bikes: [done(), done(), done({ is_deleted: true })],
        has_rear_suspension: false,
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike).toMatchObject({
        id: 1,
        name: 'Rallon',
        brand: 'Orbea',
        model: 'Rallon M10',
        year: 2024,
        type: { i18n_key: 'bikeType.enduro', name: 'Enduro' },
        image_url: 'https://storage.example.com/bikes/rallon.webp',
        distance_km: 4187,
        components: expect.any(Array) as unknown,
        services: 2,
        time_min: 15000,
        ebike: false,
        frame_material: 'carbon',
        has_front_suspension: true,
        has_rear_suspension: false,
      });
    });

    it('carries Last Updated of this bike alone: the newest of the bike, its parts and its Services', async () => {
      table.get(OWNER_ID)!.updated_at = PROFILE_UPDATED;
      seedBike({ id: 1, components_mounted: [part()], events_bikes: [done()] });
      seedBike({ id: 2, updated_at: BIKE_UPDATED, components_mounted: [part({ updated_at: null })], events_bikes: [] });

      expect((await service.readBike('jaffa', 1, OTHER_ID)).bike.updated_at).toBe(SERVICE_UPDATED.toISOString());
      expect((await service.readBike('jaffa', 2, OTHER_ID)).bike.updated_at).toBe(BIKE_UPDATED.toISOString());
    });

    it('reads zero where the odometer holds nothing', async () => {
      seedBike({ id: 1, total_km: null, total_time_min: null, frame_material: null });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike).toMatchObject({ distance_km: 0, time_min: 0, frame_material: null });
    });

    it('components off: the section and the count are null', async () => {
      table.get(OWNER_ID)!.share_components = false;
      seedBike({ id: 1, components_mounted: [part()] });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.components).toBeNull();
      expect(bike.components).not.toEqual([]);
    });

    it('setup off: the section is null even when profiles exist', async () => {
      table.get(OWNER_ID)!.share_setup = false;
      seedBike({ id: 1, active_setup_profile_id: 10 });
      seedSetup({ id: 10, bike_id: 1 });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.setup).toBeNull();
    });

    it('setup on with no profile yet: an empty list, not null', async () => {
      seedBike({ id: 1 });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.setup).toEqual([]);
    });

    it('components on with nothing mounted: an empty list, not null', async () => {
      seedBike({ id: 1 });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.components).toEqual([]);
    });

    it('history off: the section and the Services count are null', async () => {
      table.get(OWNER_ID)!.share_history = false;
      seedBike({ id: 1, events_bikes: [done()] });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history).toBeNull();
      expect(bike.services).toBeNull();
    });

    it('costs on without history: still no history', async () => {
      table.get(OWNER_ID)!.share_history = false;
      table.get(OWNER_ID)!.share_costs = true;
      seedBike({ id: 1, events_bikes: [done()] });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history).toBeNull();
      expect(bike.services).toBeNull();
    });
  });

  describe('readBike - Historie', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
    });

    it('reads every Service newest first: its date, its actions as catalogue names, the parts touched', async () => {
      seedBike({
        id: 1,
        events_bikes: [
          done({
            id: 1,
            service_date: new Date('2026-07-01T00:00:00.000Z'),
            event_actions_done: [
              action({
                events_action: { action_name: 'Fork Full Service', i18n_key: 'action.forkFullService' },
                action_done_component_map: [{ components_mounted: { component_types: FORK_TYPE } }],
              }),
              action({
                events_action: { action_name: 'Odd job', i18n_key: null },
                action_done_component_map: [],
              }),
            ],
          }),
          done({ id: 2, service_date: new Date('2026-08-15T00:00:00.000Z') }),
          done({ id: 3, is_deleted: true, service_date: new Date('2026-09-01T00:00:00.000Z') }),
        ],
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.services).toBe(2);
      expect(bike.history).toEqual({
        totals: { services: 2, replacements: 0 },
        total_count: 2,
        services: [
          {
            id: 2,
            date: '2026-08-15T00:00:00.000Z',
            is_replacement: false,
            actions: [{ i18n_key: 'action.chainCleaning', name: 'Chain Cleaning' }],
            parts: [{ i18n_key: 'component.chain', name: 'Chain' }],
          },
          {
            id: 1,
            date: '2026-07-01T00:00:00.000Z',
            is_replacement: false,
            actions: [
              { i18n_key: 'action.forkFullService', name: 'Fork Full Service' },
              { i18n_key: null, name: 'Odd job' },
            ],
            parts: [{ i18n_key: 'component.fork', name: 'Fork' }],
          },
        ],
      });
    });

    it('a Replacement flags its Service; the total counts them per part, not per Service', async () => {
      seedBike({
        id: 1,
        events_bikes: [
          done({
            id: 1,
            event_actions_done: [
              action({
                part_replaced: true,
                events_action: { action_name: 'Tire Replacement', i18n_key: 'action.tireReplacement' },
                action_done_component_map: [
                  { components_mounted: { component_types: TIRE_TYPE } },
                  { components_mounted: { component_types: TIRE_TYPE } },
                ],
              }),
              action({
                part_replaced: true,
                events_action: { action_name: 'Chain Replacement', i18n_key: 'action.chainReplacement' },
              }),
              action(),
            ],
          }),
          done({ id: 2 }),
        ],
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history?.totals).toEqual({ services: 2, replacements: 2 });
      expect(bike.history?.services.map((row) => [row.id, row.is_replacement])).toEqual([
        [2, false],
        [1, true],
      ]);
      // Both tyres and the chain: each kind once.
      expect(bike.history?.services[1].parts).toEqual([
        { i18n_key: 'component.tire', name: 'Tire' },
        { i18n_key: 'component.chain', name: 'Chain' },
      ]);
    });

    it('undated Services close the list, whatever their id', async () => {
      seedBike({
        id: 1,
        events_bikes: [
          done({ id: 1, service_date: new Date('2026-01-01T00:00:00.000Z') }),
          done({ id: 2, service_date: null }),
          done({ id: 3, service_date: new Date('2026-06-01T00:00:00.000Z') }),
          done({ id: 4, service_date: null }),
        ],
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history?.services.map((row) => [row.id, row.date])).toEqual([
        [3, '2026-06-01T00:00:00.000Z'],
        [1, '2026-01-01T00:00:00.000Z'],
        [4, null],
        [2, null],
      ]);
    });

    it('costs off: no cost on any Service and no spend, while Services and Replacements stay', async () => {
      seedBike({
        id: 1,
        events_bikes: [
          done({ id: 1, total_cost: new Prisma.Decimal(1200) }),
          done({ id: 2, total_cost: new Prisma.Decimal(300) }),
        ],
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history?.totals).toEqual({ services: 2, replacements: 0 });
      expect(bike.history?.totals).not.toHaveProperty('spend');
      for (const row of bike.history?.services ?? []) {
        expect(row).not.toHaveProperty('cost');
      }
      expect(JSON.stringify(bike.history)).not.toContain('1200');
    });

    it("costs on: each priced Service carries its cost and the totals their spend, in the owner's currency", async () => {
      table.get(OWNER_ID)!.share_costs = true;
      seedBike({
        id: 1,
        events_bikes: [
          done({ id: 1, total_cost: new Prisma.Decimal(1200.5) }),
          done({ id: 2, total_cost: new Prisma.Decimal(300) }),
          done({ id: 3, total_cost: null }),
          done({ id: 4, total_cost: new Prisma.Decimal(99), is_deleted: true }),
        ],
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history?.totals).toEqual({
        services: 3,
        replacements: 0,
        spend: { amount: 1500.5, currency: 'EUR' },
      });
      expect(bike.history?.services.map((row) => row.cost)).toEqual([
        undefined,
        { amount: 300, currency: 'EUR' },
        { amount: 1200.5, currency: 'EUR' },
      ]);
    });

    it('costs on with nothing priced: spend is zero, not absent', async () => {
      table.get(OWNER_ID)!.share_costs = true;
      seedBike({ id: 1, events_bikes: [done({ total_cost: null })] });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history?.totals.spend).toEqual({ amount: 0, currency: 'EUR' });
    });

    it('costs on: the spend falls back to CZK for an owner who chose no currency', async () => {
      table.get(OWNER_ID)!.share_costs = true;
      mockPrisma.users.findUnique.mockResolvedValue({ ...ownerRow, currency: null });
      seedBike({ id: 1, events_bikes: [done()] });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history?.totals.spend).toEqual({ amount: 1200, currency: 'CZK' });
      expect(bike.history?.services[0].cost).toEqual({ amount: 1200, currency: 'CZK' });
    });

    it('a bike with no Service yet has an empty history, not a null one', async () => {
      seedBike({ id: 1 });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history).toEqual({ totals: { services: 0, replacements: 0 }, services: [], total_count: 0 });
    });
  });

  describe('readBike - Osazení', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
    });

    it('groups what is mounted by Component Category, catalogue names as key plus fallback', async () => {
      const own: CatalogueRow = { component_type: 'Mudguard', i18n_key: null, component_groups: WHEELS };
      seedBike({
        id: 1,
        components_mounted: [
          part({ component_type_id: 12, component_types: FORK_TYPE, total_km: 1200, total_time_min: 4800 }),
          part({
            component_type_id: 20,
            component_types: TIRE_TYPE,
            position: 'front',
            component_desc: 'Maxxis Assegai',
          }),
          part({
            component_type_id: 20,
            component_types: TIRE_TYPE,
            position: 'rear',
            component_desc: 'Maxxis DHR II',
          }),
          part({
            component_type_id: 30,
            component_types: own,
            component_desc: null,
            total_km: null,
            total_time_min: null,
          }),
          part({ component_type_id: 40, component_types: CHAIN_TYPE, is_active: false }),
          part({ component_type_id: 40, component_types: CHAIN_TYPE, is_deleted: true }),
        ],
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.components).toEqual([
        {
          category: { i18n_key: 'componentGroup.suspension', name: 'Suspension' },
          parts: [
            {
              id: 1,
              type: { i18n_key: 'component.fork', name: 'Fork' },
              description: 'Fox 38 Factory GRIP2',
              position: null,
              distance_km: 1200,
              time_min: 4800,
            },
          ],
        },
        {
          category: { i18n_key: 'componentGroup.wheels', name: 'Wheels' },
          parts: [
            expect.objectContaining({ id: 2, type: { i18n_key: 'component.tire', name: 'Tire' }, position: 'front' }),
            expect.objectContaining({ id: 3, description: 'Maxxis DHR II', position: 'rear' }),
            expect.objectContaining({
              id: 4,
              type: { i18n_key: null, name: 'Mudguard' },
              description: null,
              distance_km: null,
              time_min: null,
            }),
          ],
        },
      ]);
    });

    it('carries no note and no health index, on a fixture that has both', async () => {
      seedBike({ id: 1, components_mounted: [part({ note: 'Mechanic Pepa, 777 123 456', health_index: 42 })] });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);
      const partOut = bike.components?.[0].parts[0] as Record<string, unknown>;

      expect(partOut).not.toHaveProperty('note');
      expect(partOut).not.toHaveProperty('health_index');
      expect(JSON.stringify(bike)).not.toContain('Pepa');
    });
  });

  describe('readBike - Setup', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
    });

    it('reads every profile with its six numbers, the legs and the clicks, the note left behind', async () => {
      seedBike({ id: 1, active_setup_profile_id: 10 });
      seedSetup({ id: 10, bike_id: 1 });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.setup).toEqual([
        {
          id: 10,
          name: 'Trail',
          is_active: true,
          front_tire_psi: 24.5,
          rear_tire_psi: 27,
          front_tire: null,
          rear_tire: null,
          fork: {
            pressure_psi: 85,
            sag_percent: 20,
            tokens: 2,
            clicks: { rebound_ls: 8, rebound_hs: 3, compression_ls: 10, compression_hs: 2 },
          },
          shock: {
            pressure_psi: 185,
            sag_percent: 30,
            tokens: 1,
            clicks: { rebound_ls: 6, rebound_hs: 2, compression_ls: 9, compression_hs: 1 },
          },
        },
      ]);
      expect(JSON.stringify(bike.setup)).not.toContain('Loket');
    });

    it('the active profile is marked exactly once and listed first, the rest oldest first', async () => {
      seedBike({ id: 1, active_setup_profile_id: 12 });
      seedSetup({ id: 10, bike_id: 1, name: 'Trail' });
      seedSetup({ id: 11, bike_id: 1, name: 'Park' });
      seedSetup({ id: 12, bike_id: 1, name: 'Race' });
      seedSetup({ id: 13, bike_id: 1, name: 'Wet' });
      seedSetup({ id: 20, bike_id: 2, name: 'Other bike' });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.setup?.map((profile) => [profile.name, profile.is_active])).toEqual([
        ['Race', true],
        ['Trail', false],
        ['Park', false],
        ['Wet', false],
      ]);
    });

    it('a number never written down is null, not zero', async () => {
      seedBike({ id: 1, active_setup_profile_id: 10 });
      seedSetup({
        id: 10,
        bike_id: 1,
        front_tire_psi: null,
        fork_pressure_psi: null,
        fork_tokens: null,
        shock_rebound_hs: null,
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.setup?.[0]).toMatchObject({
        front_tire_psi: null,
        fork: { pressure_psi: null, tokens: null },
        shock: { clicks: { rebound_hs: null } },
      });
    });

    it('a hardtail has no shock, a rigid bike neither leg, whatever the row holds', async () => {
      seedBike({ id: 1, has_front_suspension: true, has_rear_suspension: false, active_setup_profile_id: 10 });
      seedBike({ id: 2, has_front_suspension: false, has_rear_suspension: false, active_setup_profile_id: 20 });
      seedSetup({ id: 10, bike_id: 1 });
      seedSetup({ id: 20, bike_id: 2 });

      const hardtail = await service.readBike('jaffa', 1, OTHER_ID);
      const rigid = await service.readBike('jaffa', 2, OTHER_ID);

      expect(hardtail.bike.setup?.[0]).toMatchObject({ fork: { pressure_psi: 85 }, shock: null });
      expect(rigid.bike.setup?.[0]).toMatchObject({ fork: null, shock: null });
    });

    it('puts the mounted tyre under each pressure, looked up by its slot', async () => {
      seedBike({
        id: 1,
        active_setup_profile_id: 10,
        components_mounted: [
          part({ component_types: TIRE_TYPE, position: 'Front', component_desc: 'Maxxis Assegai' }),
          part({ component_types: TIRE_TYPE, position: 'rear', component_desc: 'Maxxis DHR II' }),
          part({ component_types: TIRE_TYPE, position: 'rear', component_desc: 'Old rear', is_active: false }),
        ],
      });
      seedSetup({ id: 10, bike_id: 1 });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.setup?.[0]).toMatchObject({
        front_tire: {
          type: { i18n_key: 'component.tire', name: 'Tire' },
          description: 'Maxxis Assegai',
          position: 'Front',
        },
        rear_tire: { description: 'Maxxis DHR II' },
      });
    });

    it('an empty slot reads null under the pressure', async () => {
      seedBike({ id: 1, active_setup_profile_id: 10, components_mounted: [part({ component_types: FORK_TYPE })] });
      seedSetup({ id: 10, bike_id: 1 });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.setup?.[0]).toMatchObject({ front_tire: null, rear_tire: null });
    });

    it('components off: the tyre lookup is null even with tyres mounted', async () => {
      table.get(OWNER_ID)!.share_components = false;
      seedBike({
        id: 1,
        active_setup_profile_id: 10,
        components_mounted: [part({ component_types: TIRE_TYPE, position: 'front' })],
      });
      seedSetup({ id: 10, bike_id: 1 });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.components).toBeNull();
      expect(bike.setup?.[0]).toMatchObject({ front_tire_psi: 24.5, front_tire: null, rear_tire: null });
    });
  });

  describe('readBike - the first page', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
    });

    it('carries the newest 20 and counts all 30', async () => {
      // Thirty dated Services, one a day, the newest on day 30 - id 30.
      seedBike({
        id: 1,
        events_bikes: Array.from({ length: 30 }, (_, index) =>
          done({ id: index + 1, service_date: new Date(Date.UTC(2026, 0, index + 1)) }),
        ),
      });

      const { bike } = await service.readBike('jaffa', 1, OTHER_ID);

      expect(bike.history?.services).toHaveLength(20);
      expect(bike.history?.services[0].id).toBe(30);
      expect(bike.history?.services[19].id).toBe(11);
      expect(bike.history?.total_count).toBe(30);
      expect(bike.history?.totals.services).toBe(30);
      expect(bike.services).toBe(30);
    });
  });

  describe('readBikeServices - paging', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
      // 130 dated Services, one a day, the newest on day 130 - id 130.
      seedBike({
        id: 1,
        events_bikes: Array.from({ length: 130 }, (_, index) =>
          done({ id: index + 1, service_date: new Date(Date.UTC(2026, 0, index + 1)) }),
        ),
      });
    });

    it('pages from the offset, 20 at a time by default, with the total alongside', async () => {
      const page = await service.readBikeServices('jaffa', 1, OTHER_ID, Number.NaN, 20);

      expect(page.services).toHaveLength(20);
      expect(page.services[0].id).toBe(110);
      expect(page.services[19].id).toBe(91);
      expect(page.total_count).toBe(130);
    });

    it('honours a limit within the bounds and clamps one over 100 to 100', async () => {
      const small = await service.readBikeServices('jaffa', 1, OTHER_ID, 5, 0);
      const large = await service.readBikeServices('jaffa', 1, OTHER_ID, 101, 0);

      expect(small.services.map((row) => row.id)).toEqual([130, 129, 128, 127, 126]);
      expect(large.services).toHaveLength(100);
    });

    it('an absent limit takes the default and zero is pulled up to 1; an absent or negative offset starts at 0', async () => {
      const absent = await service.readBikeServices('jaffa', 1, OTHER_ID, Number.NaN, Number.NaN);
      const zero = await service.readBikeServices('jaffa', 1, OTHER_ID, 0, -5);

      expect(absent.services).toHaveLength(20);
      expect(absent.services[0].id).toBe(130);
      expect(zero.services).toHaveLength(1);
      expect(zero.services[0].id).toBe(130);
    });

    it('past the end is an empty page with the total still on it', async () => {
      const page = await service.readBikeServices('jaffa', 1, OTHER_ID, 20, 500);

      expect(page).toEqual({ services: [], total_count: 130 });
    });

    it('keeps the costs rule: absent with costs off, on the rows with costs on', async () => {
      const hidden = await service.readBikeServices('jaffa', 1, OTHER_ID, 1, 0);
      table.get(OWNER_ID)!.share_costs = true;
      const shown = await service.readBikeServices('jaffa', 1, OTHER_ID, 1, 0);

      expect(hidden.services[0]).not.toHaveProperty('cost');
      expect(shown.services[0].cost).toEqual({ amount: 1200, currency: 'EUR' });
    });
  });

  describe('readBikeServices - the rule', () => {
    beforeEach(() => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seedBike({ id: 1, events_bikes: [done()] });
    });

    it('history off: 404, the same as a bike nobody may read', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, share_history: false });

      await rejectsWith(service.readBikeServices('jaffa', 1, OTHER_ID, 20, 0), NotFoundException, 'not available');
    });

    it('FOLLOWERS: an accepted follower pages the Services', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });
      seedFollow(OTHER_ID, OWNER_ID);

      await expect(service.readBikeServices('jaffa', 1, OTHER_ID, 20, 0)).resolves.toMatchObject({ total_count: 1 });
    });

    it('FOLLOWERS: a stranger gets 404, the owner reads', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.FOLLOWERS });

      await expect(service.readBikeServices('jaffa', 1, OTHER_ID, 20, 0)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.readBikeServices('jaffa', 1, OWNER_ID, 20, 0)).resolves.toMatchObject({ total_count: 1 });
    });

    it('OFF: a stranger gets 404, the owner reads', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.OFF });

      await expect(service.readBikeServices('jaffa', 1, OTHER_ID, 20, 0)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.readBikeServices('jaffa', 1, OWNER_ID, 20, 0)).resolves.toMatchObject({ total_count: 1 });
    });

    it('unknown handle, unknown bike, unshared, archived and another account answer one 404', async () => {
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC });
      seedBike({ id: 2, is_shared: false });
      seedBike({ id: 3, is_deleted: true });
      seedBike({ id: 4, user_id: OTHER_ID });

      for (const [handle, bikeId] of [
        ['nobody', 1],
        ['jaffa', 99],
        ['jaffa', 2],
        ['jaffa', 3],
        ['jaffa', 4],
      ] as const) {
        await rejectsWith(
          service.readBikeServices(handle, bikeId, OTHER_ID, 20, 0),
          NotFoundException,
          'not available',
        );
      }
    });
  });

  describe('readBike - never out', () => {
    it('carries no note, health index, email, Strava picture or anything of another account', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, share_costs: true });
      seed({ user_id: OTHER_ID, handle: 'stranger', visibility: profile_visibility.PUBLIC });
      seedBike({
        id: 1,
        active_setup_profile_id: 10,
        components_mounted: [part({ component_types: TIRE_TYPE, position: 'front' }), part()],
        events_bikes: [done()],
      });
      seedSetup({ id: 10, bike_id: 1 });
      seedBike({ id: 2, user_id: OTHER_ID, bikename: 'Strangers bike' });

      const page = JSON.stringify(await service.readBike('jaffa', 1, OTHER_ID));

      expect(page).toContain('Chain Cleaning');
      expect(page).not.toContain('note');
      expect(page).not.toContain('health_index');
      expect(page).not.toContain('Pepa');
      expect(page).not.toContain('Loket');
      expect(page).not.toContain('jarda@example.com');
      expect(page).not.toContain('strava');
      expect(page).not.toContain('password');
      expect(page).not.toContain('user_id');
      expect(page).not.toContain('stranger');
      expect(page).not.toContain('Strangers bike');
      expect(page).not.toContain('Invoice');
      expect(page).not.toContain('Waxed');
      expect(page).not.toContain('partial_cost');
      expect(page).not.toContain('attachment');
      expect(page).not.toContain('invoice.pdf');
      expect(page).not.toContain('r2.example.com');
    });

    it('a page of older Services carries no note, action note, price of an action or attachment either', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(ownerRow);
      seed({ user_id: OWNER_ID, handle: 'jaffa', visibility: profile_visibility.PUBLIC, share_costs: true });
      seedBike({ id: 1, events_bikes: [done(), done()] });

      const page = JSON.stringify(await service.readBikeServices('jaffa', 1, OTHER_ID, 20, 1));

      expect(page).toContain('Chain Cleaning');
      expect(page).toContain('1200');
      expect(page).not.toContain('note');
      expect(page).not.toContain('Invoice');
      expect(page).not.toContain('Waxed');
      expect(page).not.toContain('partial_cost');
      expect(page).not.toContain('300');
      expect(page).not.toContain('attachment');
      expect(page).not.toContain('invoice.pdf');
      expect(page).not.toContain('user_id');
    });
  });
});
