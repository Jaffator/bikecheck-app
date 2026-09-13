import { Prisma } from '@prisma/client';
import type { ToolCallOptions } from 'ai';
import type { PrismaService } from '../../../prisma/prisma.service';
import { setupTools, type SetupToolSet, type SuspensionSetup } from './setup.tools';

const OWNER_ID = 7;
const STRANGER_ID = 8;

const BIKE_ID = 21;
const ARCHIVED_BIKE_ID = 22;
const HARDTAIL_ID = 23;
const GRAVEL_ID = 24;

const TRAIL_ID = 500;
const PARK_ID = 501;

// What the model would send with a call. The tool reads only its input.
const CALL: ToolCallOptions = { toolCallId: 'test-call', messages: [] };

// The bike a profile hangs off, as the read loads it: which sections it has and whose it is.
interface BikeFixture {
  user_id: number;
  is_deleted: boolean;
  has_front_suspension: boolean;
  has_rear_suspension: boolean;
  users: { tire_pressure_unit: 'bar' | 'psi' };
}

// One Setup Profile as the table holds it, dates included - so a test can watch them stay behind.
// Pressures are decimals, which is how the client hands a DECIMAL column over.
interface ProfileFixture {
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
  bikes: BikeFixture;
}

function decimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function fullSuspension(overrides: Partial<BikeFixture> = {}): BikeFixture {
  return {
    user_id: OWNER_ID,
    is_deleted: false,
    has_front_suspension: true,
    has_rear_suspension: true,
    users: { tire_pressure_unit: 'bar' },
    ...overrides,
  };
}

function profile(overrides: Partial<ProfileFixture> = {}): ProfileFixture {
  return {
    id: TRAIL_ID,
    bike_id: BIKE_ID,
    name: 'Trail',
    note: 'Bike park settings',
    front_tire_psi: decimal(26.1),
    rear_tire_psi: decimal(29),
    fork_pressure_psi: decimal(82),
    fork_tokens: 2,
    fork_sag_percent: 20,
    fork_rebound_ls: 8,
    fork_rebound_hs: 3,
    fork_compression_ls: 6,
    fork_compression_hs: 2,
    shock_pressure_psi: decimal(185.5),
    shock_tokens: 1,
    shock_sag_percent: 30,
    shock_rebound_ls: 10,
    shock_rebound_hs: 4,
    shock_compression_ls: 7,
    shock_compression_hs: 1,
    created_at: new Date('2026-03-01T10:00:00.000Z'),
    updated_at: new Date('2026-03-02T10:00:00.000Z'),
    bikes: fullSuspension(),
    ...overrides,
  };
}

// A profile with every number left blank: the sheet a rider opened and never filled in.
function blankProfile(overrides: Partial<ProfileFixture> = {}): ProfileFixture {
  return profile({
    note: null,
    front_tire_psi: null,
    rear_tire_psi: null,
    fork_pressure_psi: null,
    fork_tokens: null,
    fork_sag_percent: null,
    fork_rebound_ls: null,
    fork_rebound_hs: null,
    fork_compression_ls: null,
    fork_compression_hs: null,
    shock_pressure_psi: null,
    shock_tokens: null,
    shock_sag_percent: null,
    shock_rebound_ls: null,
    shock_rebound_hs: null,
    shock_compression_ls: null,
    shock_compression_hs: null,
    ...overrides,
  });
}

describe('setupTools', () => {
  const mockPrisma = { setup_profiles: { findMany: jest.fn() } };

  // The fixtures, filtered the way the database would filter them: the profiles of the bike asked
  // for, when it is the caller's own and not archived, oldest first.
  function database(profiles: ProfileFixture[]): void {
    mockPrisma.setup_profiles.findMany.mockImplementation(({ where }: { where: Where }) =>
      Promise.resolve(profiles.filter((row) => matches(row, where)).sort((left, right) => left.id - right.id)),
    );
  }

  function tools(userId: number): SetupToolSet {
    return setupTools(mockPrisma as unknown as PrismaService, userId);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads one row per profile, oldest first, each with its name and note', async () => {
    database([profile({ id: PARK_ID, name: 'Park', note: 'Loket, wet' }), profile()]);

    const page = await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID }, CALL);

    expect(page.total_count).toBe(2);
    expect(page.truncated).toBeUndefined();
    expect(page.next_cursor).toBeUndefined();
    expect(page.rows.map((row) => [row.profile_name, row.note])).toEqual([
      ['Trail', 'Bike park settings'],
      ['Park', 'Loket, wet'],
    ]);
  });

  it('reads the whole sheet of a full-suspension bike, clicks counted from fully closed', async () => {
    database([profile()]);

    const page = await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID }, CALL);

    expect(page.rows[0]).toEqual({
      profile_name: 'Trail',
      note: 'Bike park settings',
      tire_pressure_unit: 'bar',
      tires: {
        front: { psi: 26.1, bar: 1.8 },
        rear: { psi: 29, bar: 2 },
      },
      fork: {
        pressure_psi: 82,
        tokens: 2,
        sag_percent: 20,
        rebound_ls_clicks: 8,
        rebound_hs_clicks: 3,
        compression_ls_clicks: 6,
        compression_hs_clicks: 2,
      },
      shock: {
        pressure_psi: 185.5,
        tokens: 1,
        sag_percent: 30,
        rebound_ls_clicks: 10,
        rebound_hs_clicks: 4,
        compression_ls_clicks: 7,
        compression_hs_clicks: 1,
      },
    });
  });

  it('gives the tyres in both units and names the unit the owner reads them in', async () => {
    database([profile({ bikes: fullSuspension({ users: { tire_pressure_unit: 'psi' } }) })]);

    const row = (await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID }, CALL)).rows[0];

    expect(row.tire_pressure_unit).toBe('psi');
    expect(row.tires.front).toEqual({ psi: 26.1, bar: 1.8 });
    expect(row.tires.rear).toEqual({ psi: 29, bar: 2 });
  });

  it('answers no shock for a hardtail and neither fork nor shock for a gravel bike', async () => {
    database([
      profile({ id: 510, bike_id: HARDTAIL_ID, bikes: fullSuspension({ has_rear_suspension: false }) }),
      profile({
        id: 511,
        bike_id: GRAVEL_ID,
        bikes: fullSuspension({ has_front_suspension: false, has_rear_suspension: false }),
      }),
    ]);

    const hardtail = (await tools(OWNER_ID).get_setup.execute({ bike_id: HARDTAIL_ID }, CALL)).rows[0];
    const gravel = (await tools(OWNER_ID).get_setup.execute({ bike_id: GRAVEL_ID }, CALL)).rows[0];

    expect(suspension(hardtail.fork).pressure_psi).toBe(82);
    expect(hardtail.shock).toBeNull();
    expect(gravel.fork).toBeNull();
    expect(gravel.shock).toBeNull();
    expect(gravel.tires.front).toEqual({ psi: 26.1, bar: 1.8 });
  });

  it('reads a number nobody wrote down as null and a missing note as empty', async () => {
    database([blankProfile()]);

    const row = (await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID }, CALL)).rows[0];

    expect(row.note).toBe('');
    expect(row.tires).toEqual({ front: { psi: null, bar: null }, rear: { psi: null, bar: null } });
    expect(suspension(row.fork)).toEqual({
      pressure_psi: null,
      tokens: null,
      sag_percent: null,
      rebound_ls_clicks: null,
      rebound_hs_clicks: null,
      compression_ls_clicks: null,
      compression_hs_clicks: null,
    });
    expect(suspension(row.shock).pressure_psi).toBeNull();
  });

  it('reads a recorded zero as a zero, not as a gap', async () => {
    database([blankProfile({ fork_compression_hs: 0, fork_tokens: 0 })]);

    const fork = suspension((await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID }, CALL)).rows[0].fork);

    expect(fork.compression_hs_clicks).toBe(0);
    expect(fork.tokens).toBe(0);
  });

  it('says nothing about when a profile was written', async () => {
    database([profile()]);

    const answered = JSON.stringify(await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID }, CALL));

    expect(answered).not.toContain('created_at');
    expect(answered).not.toContain('updated_at');
    expect(answered).not.toContain('2026-03');
  });

  it('reads nothing off a bike with no profile', async () => {
    database([profile()]);

    const page = await tools(OWNER_ID).get_setup.execute({ bike_id: HARDTAIL_ID }, CALL);

    expect(page.rows).toEqual([]);
    expect(page.total_count).toBe(0);
  });

  it('reads nothing off an Archived Bike', async () => {
    database([
      profile({ id: 520, bike_id: ARCHIVED_BIKE_ID, bikes: fullSuspension({ is_deleted: true }) }),
      profile(),
    ]);

    const archived = await tools(OWNER_ID).get_setup.execute({ bike_id: ARCHIVED_BIKE_ID }, CALL);

    expect(archived.rows).toEqual([]);
    expect(archived.total_count).toBe(0);
  });

  it('returns nothing for a stranger', async () => {
    database([profile()]);

    const page = await tools(STRANGER_ID).get_setup.execute({ bike_id: BIKE_ID }, CALL);

    expect(page.rows).toEqual([]);
    expect(page.total_count).toBe(0);
  });
});

// The section at the type the assertion needs: a null section is a bike without that suspension,
// so an assertion on its numbers says out loud that it expected one.
function suspension(section: SuspensionSetup | null): SuspensionSetup {
  if (section === null) throw new Error('expected a suspension section, got null');

  return section;
}

// ---------------------------------------------------------------------------------------------
// Enough of Prisma to run the tool's own query against fixtures.
// ---------------------------------------------------------------------------------------------

interface Where {
  bike_id?: number;
  bikes?: { user_id?: number; is_deleted?: unknown };
}

function matches(row: ProfileFixture, where: Where): boolean {
  if (row.bike_id !== where.bike_id) return false;
  if (row.bikes.user_id !== where.bikes?.user_id) return false;
  if (where.bikes?.is_deleted !== undefined && row.bikes.is_deleted) return false;

  return true;
}
