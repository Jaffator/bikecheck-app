import type { ToolCallOptions } from 'ai';
import type { PrismaService } from '../../../prisma/prisma.service';
import { setupTools, type SetupRow, type SetupToolSet, type SuspensionSetupRow } from './setup.tools';

const OWNER_ID = 7;
const STRANGER_ID = 8;

const BIKE_ID = 21;
const ARCHIVED_BIKE_ID = 22;

const FORK_ID = 61;
const SHOCK_ID = 62;
const CHAIN_ID = 63;
const OLD_FORK_ID = 60;
const FRONT_TIRE_ID = 71;

// What the model would send with a call. The tool reads only its input.
const CALL: ToolCallOptions = { toolCallId: 'test-call', messages: [] };

// One suspension setup as the table holds it, `setup_date` included - the column keeps a time of
// day rather than a day, so a test can watch it stay behind.
interface SuspensionFixture {
  id: number;
  setup_date: Date;
  pressure_psi: number | null;
  pressure_bar: number | null;
  sag_percentage: number | null;
  amount_tokens_spacers: number | null;
  rebound_ls: number | null;
  rebound_hs: number | null;
  compression_ls: number | null;
  compression_hs: number | null;
  notes: string | null;
}

interface TireFixture {
  id: number;
  tire_pressure_bar: number | null;
  tire_pressure_psi: number | null;
}

// One Mounted Component with whatever setups have been recorded against it.
interface PartFixture {
  id: number;
  bike_id: number;
  component_type_id: number;
  component_desc: string | null;
  position: string | null;
  removed_at: Date | null;
  is_deleted: boolean;
  component_types: { component_type: string };
  bikes: { user_id: number; is_deleted: boolean };
  suspension_setup: SuspensionFixture[];
  tire_setup: TireFixture[];
}

function suspensionSetup(overrides: Partial<SuspensionFixture> = {}): SuspensionFixture {
  return {
    id: 500,
    setup_date: new Date('1970-01-01T18:30:00.000Z'),
    pressure_psi: 82,
    pressure_bar: 6,
    sag_percentage: 20,
    amount_tokens_spacers: 2,
    rebound_ls: 8,
    rebound_hs: 3,
    compression_ls: 6,
    compression_hs: 2,
    notes: 'Bike park settings',
    ...overrides,
  };
}

function tireSetup(overrides: Partial<TireFixture> = {}): TireFixture {
  return { id: 600, tire_pressure_bar: 2, tire_pressure_psi: 26, ...overrides };
}

function part(overrides: Partial<PartFixture> = {}): PartFixture {
  return {
    id: FORK_ID,
    bike_id: BIKE_ID,
    component_type_id: 31,
    component_desc: 'Fox 36 Factory',
    position: 'front',
    removed_at: null,
    is_deleted: false,
    component_types: { component_type: 'Fork' },
    bikes: { user_id: OWNER_ID, is_deleted: false },
    suspension_setup: [suspensionSetup()],
    tire_setup: [],
    ...overrides,
  };
}

describe('setupTools', () => {
  const mockPrisma = { components_mounted: { findMany: jest.fn() } };

  // The fixtures, filtered the way the database would filter them: the caller's own bike, the
  // parts still on it, and only those that have a setup of the kind asked for - each trimmed to
  // its newest setup row.
  function database(parts: PartFixture[]): void {
    mockPrisma.components_mounted.findMany.mockImplementation(({ where }: { where: Where }) =>
      Promise.resolve(
        parts
          .filter((row) => matches(row, where))
          .map(newest)
          .sort((left, right) => left.id - right.id),
      ),
    );
  }

  function tools(userId: number): SetupToolSet {
    return setupTools(mockPrisma as unknown as PrismaService, userId);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads what is dialled into the fork, with the units in the field names', async () => {
    database([part()]);

    const page = await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID, kind: 'suspension' }, CALL);

    expect(page.total_count).toBe(1);
    expect(page.truncated).toBeUndefined();
    expect(page.next_cursor).toBeUndefined();
    expect(page.rows[0]).toEqual({
      kind: 'suspension',
      component_mounted_id: FORK_ID,
      component_type_id: 31,
      component_type: 'Fork',
      component_desc: 'Fox 36 Factory',
      position: 'front',
      pressure_psi: 82,
      pressure_bar: 6,
      sag_percent: 20,
      tokens_spacers: 2,
      rebound_ls_clicks: 8,
      rebound_hs_clicks: 3,
      compression_ls_clicks: 6,
      compression_hs_clicks: 2,
      notes: 'Bike park settings',
    });
  });

  it('reads a tire in both units', async () => {
    database([
      part({
        id: FRONT_TIRE_ID,
        component_type_id: 44,
        component_desc: 'Maxxis Assegai',
        component_types: { component_type: 'Tire' },
        suspension_setup: [],
        tire_setup: [tireSetup()],
      }),
    ]);

    const page = await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID, kind: 'tire' }, CALL);

    expect(page.rows[0]).toEqual({
      kind: 'tire',
      component_mounted_id: FRONT_TIRE_ID,
      component_type_id: 44,
      component_type: 'Tire',
      component_desc: 'Maxxis Assegai',
      position: 'front',
      pressure_bar: 2,
      pressure_psi: 26,
    });
  });

  it('reads a setting nobody wrote down as 0 and a missing note as empty', async () => {
    database([
      part({
        component_desc: null,
        position: null,
        suspension_setup: [
          suspensionSetup({
            pressure_psi: null,
            pressure_bar: null,
            sag_percentage: null,
            amount_tokens_spacers: null,
            rebound_ls: null,
            rebound_hs: null,
            compression_ls: null,
            compression_hs: null,
            notes: null,
          }),
        ],
      }),
    ]);

    const row = suspension(
      (await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID, kind: 'suspension' }, CALL)).rows[0],
    );

    expect(row.pressure_psi).toBe(0);
    expect(row.sag_percent).toBe(0);
    expect(row.tokens_spacers).toBe(0);
    expect(row.rebound_hs_clicks).toBe(0);
    expect(row.compression_hs_clicks).toBe(0);
    expect(row.notes).toBe('');
    expect(row.component_desc).toBe('');
    expect(row.position).toBe('');
  });

  it('answers the setup last recorded on a part, not the one before it', async () => {
    database([
      part({
        suspension_setup: [
          suspensionSetup({ id: 500, pressure_psi: 70 }),
          suspensionSetup({ id: 501, pressure_psi: 90 }),
        ],
      }),
    ]);

    const row = suspension(
      (await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID, kind: 'suspension' }, CALL)).rows[0],
    );

    expect(row.pressure_psi).toBe(90);
  });

  it('says nothing about when the setup was made', async () => {
    database([part()]);

    const answered = JSON.stringify(
      await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID, kind: 'suspension' }, CALL),
    );

    expect(answered).not.toContain('setup_date');
    expect(answered).not.toContain('1970');
  });

  it('leaves out a part with no setup on record and one that came off the bike', async () => {
    database([
      part(),
      part({ id: SHOCK_ID, component_types: { component_type: 'Rear Shock' }, suspension_setup: [] }),
      part({ id: CHAIN_ID, component_types: { component_type: 'Chain' }, suspension_setup: [] }),
      part({ id: OLD_FORK_ID, removed_at: new Date('2026-02-02T00:00:00.000Z') }),
    ]);

    const page = await tools(OWNER_ID).get_setup.execute({ bike_id: BIKE_ID, kind: 'suspension' }, CALL);

    expect(page.rows.map((row) => row.component_mounted_id)).toEqual([FORK_ID]);
    expect(page.total_count).toBe(1);
  });

  it('reads nothing off an Archived Bike or a bike of somebody else', async () => {
    database([
      part({ id: OLD_FORK_ID, bike_id: ARCHIVED_BIKE_ID, bikes: { user_id: OWNER_ID, is_deleted: true } }),
      part(),
    ]);

    const archived = await tools(OWNER_ID).get_setup.execute({ bike_id: ARCHIVED_BIKE_ID, kind: 'suspension' }, CALL);

    expect(archived.rows).toEqual([]);
    expect(archived.total_count).toBe(0);
  });

  it('returns nothing for a stranger', async () => {
    database([part()]);

    const page = await tools(STRANGER_ID).get_setup.execute({ bike_id: BIKE_ID, kind: 'suspension' }, CALL);

    expect(page.rows).toEqual([]);
    expect(page.total_count).toBe(0);
  });
});

// The row at the type the assertion needs: the union says which kind it is, so a suspension
// assertion says so out loud rather than reaching past the discriminant.
function suspension(row: SetupRow): SuspensionSetupRow {
  if (row.kind !== 'suspension') throw new Error(`expected a suspension setup, got ${row.kind}`);

  return row;
}

// ---------------------------------------------------------------------------------------------
// Enough of Prisma to run the tool's own query against fixtures.
// ---------------------------------------------------------------------------------------------

interface Where {
  bike_id?: number;
  removed_at?: null;
  is_deleted?: unknown;
  bikes?: { user_id?: number; is_deleted?: unknown };
  suspension_setup?: unknown;
  tire_setup?: unknown;
}

function matches(part: PartFixture, where: Where): boolean {
  if (part.bike_id !== where.bike_id) return false;
  if (part.bikes.user_id !== where.bikes?.user_id) return false;
  if (part.bikes.is_deleted || part.is_deleted || part.removed_at !== null) return false;
  if (where.suspension_setup !== undefined) return part.suspension_setup.length > 0;
  if (where.tire_setup !== undefined) return part.tire_setup.length > 0;

  return true;
}

// What `orderBy: { id: 'desc' }, take: 1` does to the nested setups.
function newest(part: PartFixture): PartFixture {
  return {
    ...part,
    suspension_setup: [...part.suspension_setup].sort((left, right) => right.id - left.id).slice(0, 1),
    tire_setup: [...part.tire_setup].sort((left, right) => right.id - left.id).slice(0, 1),
  };
}
