import type { ToolCallOptions } from 'ai';
import type { PrismaService } from '../../../prisma/prisma.service';
import { partsTools, type PartHistoryRow, type PartsToolSet } from './parts.tools';

const OWNER_ID = 7;
const STRANGER_ID = 8;

const BIKE_ID = 21;
const ARCHIVED_BIKE_ID = 22;
const CHAIN_ID = 55;
const OLD_CHAIN_ID = 54;
const DELETED_CHAIN_ID = 53;
const FORK_ID = 60;

const CHAIN_TYPE_ID = 12;
const FORK_TYPE_ID = 30;

const MOUNTED_AT = new Date('2026-03-01T10:00:00.000Z');
const REMOVED_AT = new Date('2026-08-20T18:30:00.000Z');

// What the model would send with a call. The tool reads only its input.
const CALL: ToolCallOptions = { toolCallId: 'test-call', messages: [] };

// The bike a part hangs off, `bikename` included - so a test can watch it not come out.
interface BikeFixture {
  user_id: number;
  is_deleted: boolean;
  bike_brand: string;
  bike_model: string | null;
  bikename: string | null;
}

// One Mounted Component as the table holds it, the wear accumulators included - so a test can
// watch those not come out either.
interface PartFixture {
  id: number;
  bike_id: number;
  component_type_id: number;
  component_desc: string | null;
  position: string | null;
  mounted_at: Date | null;
  removed_at: Date | null;
  total_km: number | null;
  total_time_min: number | null;
  is_active: boolean;
  is_deleted: boolean;
  drivetrain_km: number;
  suspension_min: number;
  health_index: number;
  bikes: BikeFixture;
  component_types: { component_type: string };
}

// One line item pointing at a part, which is what a service_count is counted from.
interface LinkFixture {
  component_mounted_id: number;
  event_actions_done: { bike_event_id: number; events_bikes: { is_deleted: boolean } };
}

function bike(overrides: Partial<BikeFixture> = {}): BikeFixture {
  return {
    user_id: OWNER_ID,
    is_deleted: false,
    bike_brand: 'Santa Cruz',
    bike_model: 'Hightower',
    bikename: 'Modrá bestie',
    ...overrides,
  };
}

function part(overrides: Partial<PartFixture> = {}): PartFixture {
  return {
    id: CHAIN_ID,
    bike_id: BIKE_ID,
    component_type_id: CHAIN_TYPE_ID,
    component_desc: 'Shimano XT M8100',
    position: null,
    mounted_at: MOUNTED_AT,
    removed_at: null,
    total_km: 1240,
    total_time_min: 3600,
    is_active: true,
    is_deleted: false,
    drivetrain_km: 900,
    suspension_min: 2100,
    health_index: 44,
    bikes: bike(),
    component_types: { component_type: 'Chain' },
    ...overrides,
  };
}

function link(componentMountedId: number, bikeEventId: number, deleted = false): LinkFixture {
  return {
    component_mounted_id: componentMountedId,
    event_actions_done: { bike_event_id: bikeEventId, events_bikes: { is_deleted: deleted } },
  };
}

describe('partsTools', () => {
  const mockPrisma = {
    components_mounted: { findMany: jest.fn(), count: jest.fn() },
    action_done_component_map: { findMany: jest.fn() },
  };

  // The fixtures behind a database that answers the tool's own where, orderBy and take - so a
  // test reads what execute() answered rather than what it asked for.
  function database(parts: PartFixture[], links: LinkFixture[] = []): void {
    mockPrisma.components_mounted.findMany.mockImplementation(
      ({ where, orderBy, take }: { where: unknown; orderBy: OrderBy; take: number }) =>
        Promise.resolve(
          ordered(
            parts.filter((row) => matches(row, where)),
            orderBy,
          ).slice(0, take),
        ),
    );
    mockPrisma.components_mounted.count.mockImplementation(({ where }: { where: unknown }) =>
      Promise.resolve(parts.filter((row) => matches(row, where)).length),
    );
    mockPrisma.action_done_component_map.findMany.mockImplementation(({ where }: { where: unknown }) =>
      Promise.resolve(links.filter((row) => matches(row, where))),
    );
  }

  function tools(userId: number): PartsToolSet {
    return partsTools(mockPrisma as unknown as PrismaService, userId);
  }

  function ids(rows: PartHistoryRow[]): number[] {
    return rows.map((row) => row.component_mounted_id);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads a part that came off as history, with ISO days and the bike as text', async () => {
    database([part({ id: OLD_CHAIN_ID, removed_at: REMOVED_AT, position: 'rear' })]);

    const page = await tools(OWNER_ID).list_parts.execute({}, CALL);

    expect(page.total_count).toBe(1);
    expect(page.truncated).toBeUndefined();
    expect(page.next_cursor).toBeUndefined();
    expect(page.rows[0]).toEqual({
      component_mounted_id: OLD_CHAIN_ID,
      bike_id: BIKE_ID,
      bike_brand: 'Santa Cruz',
      bike_model: 'Hightower',
      component_type_id: CHAIN_TYPE_ID,
      component_type: 'Chain',
      component_desc: 'Shimano XT M8100',
      position: 'rear',
      status: 'removed',
      mounted_at: '2026-03-01',
      removed_at: '2026-08-20',
      total_km: 1240,
      total_time_min: 3600,
      service_count: 0,
    });
  });

  it('keeps the nickname, the wear accumulators and is_active out of the row', async () => {
    database([part()]);

    const page = await tools(OWNER_ID).list_parts.execute({}, CALL);

    expect(page.rows[0].status).toBe('mounted');
    const answered = JSON.stringify(page);
    expect(answered).not.toContain('Modrá bestie');
    expect(answered).not.toContain('is_active');
    expect(answered).not.toContain('drivetrain');
    expect(answered).not.toContain('suspension_min');
    expect(answered).not.toContain('health_index');
  });

  it('reads a missing number as 0 and a missing text as empty, and an undated part as null', async () => {
    database([part({ component_desc: null, position: null, mounted_at: null, total_km: null, total_time_min: null })]);

    const [row] = (await tools(OWNER_ID).list_parts.execute({}, CALL)).rows;

    expect(row.total_km).toBe(0);
    expect(row.total_time_min).toBe(0);
    expect(row.component_desc).toBe('');
    expect(row.position).toBe('');
    expect(row.mounted_at).toBeNull();
    expect(row.removed_at).toBeNull();
  });

  it('counts one occasion once, leaves a deleted Service out and says zero for an untouched part', async () => {
    database(
      [part(), part({ id: FORK_ID, component_type_id: FORK_TYPE_ID, component_types: { component_type: 'Fork' } })],
      [link(CHAIN_ID, 300), link(CHAIN_ID, 300), link(CHAIN_ID, 301), link(CHAIN_ID, 302, true)],
    );

    const page = await tools(OWNER_ID).list_parts.execute({}, CALL);
    const counts = new Map(page.rows.map((row) => [row.component_mounted_id, row.service_count]));

    expect(counts.get(CHAIN_ID)).toBe(2);
    expect(counts.get(FORK_ID)).toBe(0);
  });

  it('answers with what is still mounted, or with what came off', async () => {
    database([part(), part({ id: OLD_CHAIN_ID, removed_at: REMOVED_AT })]);

    const list = tools(OWNER_ID).list_parts;

    expect(ids((await list.execute({ active: true }, CALL)).rows)).toEqual([CHAIN_ID]);
    expect(ids((await list.execute({ active: false }, CALL)).rows)).toEqual([OLD_CHAIN_ID]);
  });

  it('narrows to one kind of part and to a position however it is written', async () => {
    database([part({ position: 'front' }), part({ id: FORK_ID, component_type_id: FORK_TYPE_ID, position: 'rear' })]);

    const list = tools(OWNER_ID).list_parts;

    expect(ids((await list.execute({ component_type_id: FORK_TYPE_ID }, CALL)).rows)).toEqual([FORK_ID]);
    expect(ids((await list.execute({ position: 'Front' }, CALL)).rows)).toEqual([CHAIN_ID]);
  });

  it('narrows by the day a part went on and the day it came off', async () => {
    database([
      part({ id: OLD_CHAIN_ID, mounted_at: new Date('2025-01-05T00:00:00.000Z'), removed_at: REMOVED_AT }),
      part(),
    ]);

    const list = tools(OWNER_ID).list_parts;

    expect(ids((await list.execute({ mounted_from: '2026-01-01' }, CALL)).rows)).toEqual([CHAIN_ID]);
    expect(ids((await list.execute({ mounted_to: '2025-01-05' }, CALL)).rows)).toEqual([OLD_CHAIN_ID]);
    expect(ids((await list.execute({ removed_from: '2026-08-20', removed_to: '2026-08-20' }, CALL)).rows)).toEqual([
      OLD_CHAIN_ID,
    ]);
  });

  it('puts the newest mounting first and an undated part last', async () => {
    database([
      part({ id: 1, mounted_at: new Date('2025-06-01T00:00:00.000Z') }),
      part({ id: 2, mounted_at: null }),
      part({ id: 3, mounted_at: new Date('2026-06-01T00:00:00.000Z') }),
    ]);

    const page = await tools(OWNER_ID).list_parts.execute({}, CALL);

    expect(ids(page.rows)).toEqual([3, 1, 2]);
  });

  it('cuts the page and carries on from the cursor without skipping a shared date', async () => {
    // Sixty parts mounted on the same day: the date alone cannot order them, so only the cursor's
    // second half keeps the pages apart.
    const together = Array.from({ length: 60 }, (_value, index) => part({ id: 100 + index }));
    database(together);

    const list = tools(OWNER_ID).list_parts;
    const first = await list.execute({}, CALL);

    expect(first.rows).toHaveLength(50);
    expect(first.total_count).toBe(60);
    expect(first.truncated).toBe(true);
    expect(first.next_cursor).toEqual(expect.any(String));

    const second = await list.execute({ cursor: first.next_cursor }, CALL);

    expect(second.rows).toHaveLength(10);
    expect(second.total_count).toBe(60);
    expect(second.truncated).toBeUndefined();
    expect(second.next_cursor).toBeUndefined();

    const read = [...ids(first.rows), ...ids(second.rows)];
    expect(new Set(read).size).toBe(60);
    expect(read).toEqual(together.map((row) => row.id).reverse());
  });

  it('reads nonsense from the model as no cursor and starts from the beginning', async () => {
    database([part(), part({ id: OLD_CHAIN_ID, removed_at: REMOVED_AT })]);

    const page = await tools(OWNER_ID).list_parts.execute({ cursor: 'not-a-cursor' }, CALL);

    expect(page.total_count).toBe(2);
    expect(page.rows).toHaveLength(2);
  });

  it('leaves a deleted part and an Archived Bike out of the history', async () => {
    database([
      part(),
      part({ id: DELETED_CHAIN_ID, is_deleted: true }),
      part({ id: FORK_ID, bike_id: ARCHIVED_BIKE_ID, bikes: bike({ is_deleted: true }) }),
    ]);

    const page = await tools(OWNER_ID).list_parts.execute({}, CALL);

    expect(ids(page.rows)).toEqual([CHAIN_ID]);
    expect(page.total_count).toBe(1);
  });

  it('returns nothing for a stranger', async () => {
    database([part()], [link(CHAIN_ID, 300)]);

    const page = await tools(STRANGER_ID).list_parts.execute({ bike_id: BIKE_ID }, CALL);

    expect(page.rows).toEqual([]);
    expect(page.total_count).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Enough of Prisma to run the tool's own query against fixtures.
// ---------------------------------------------------------------------------------------------

type Row = Record<string, unknown>;

type OrderBy = Array<Record<string, unknown>>;

const OPERATORS = new Set(['equals', 'not', 'lt', 'lte', 'gt', 'gte', 'in', 'mode']);

function matches(row: unknown, where: unknown): boolean {
  if (where === undefined) return true;
  if (row === null || row === undefined) return false;

  return Object.entries(where as Row).every(([key, value]) => {
    if (key === 'AND') return (value as unknown[]).every((clause) => matches(row, clause));
    if (key === 'OR') return (value as unknown[]).some((clause) => matches(row, clause));

    return field((row as Row)[key], value);
  });
}

function field(actual: unknown, expected: unknown): boolean {
  if (expected === null) return actual === null || actual === undefined;
  if (Array.isArray(actual)) {
    const some = (expected as { some?: unknown }).some;
    return actual.some((item) => matches(item, some));
  }
  if (expected instanceof Date || typeof expected !== 'object') return same(actual, expected, false);
  if (Object.keys(expected as Row).every((key) => OPERATORS.has(key))) return operators(actual, expected as Row);

  return matches(actual, expected);
}

function operators(actual: unknown, filter: Row): boolean {
  const loose = filter.mode === 'insensitive';

  return Object.entries(filter).every(([operator, value]) => {
    switch (operator) {
      case 'mode':
        return true;
      case 'equals':
        return same(actual, value, loose);
      case 'not':
        return !field(actual, value);
      case 'in':
        return (value as unknown[]).some((item) => same(actual, item, loose));
      case 'lt':
        return order(actual) < order(value);
      case 'lte':
        return order(actual) <= order(value);
      case 'gt':
        return order(actual) > order(value);
      case 'gte':
        return order(actual) >= order(value);
      default:
        return false;
    }
  });
}

function same(actual: unknown, expected: unknown, loose: boolean): boolean {
  if (actual instanceof Date && expected instanceof Date) return actual.getTime() === expected.getTime();
  if (loose && typeof actual === 'string' && typeof expected === 'string') {
    return actual.toLowerCase() === expected.toLowerCase();
  }

  return actual === expected;
}

// A missing value has no place on the scale, which is what makes every comparison against it
// false - as it is in the database.
function order(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  return typeof value === 'number' ? value : Number.NaN;
}

function ordered<T extends Row>(rows: T[], orderBy: OrderBy): T[] {
  return [...rows].sort((left, right) => {
    for (const clause of orderBy) {
      const [key, value] = Object.entries(clause)[0];
      const spec = typeof value === 'string' ? { sort: value } : (value as { sort: string; nulls?: string });
      const compared = rank(left[key], right[key], spec);
      if (compared !== 0) return compared;
    }

    return 0;
  });
}

// Nulls are placed, not compared, so where they go is decided before the direction is applied.
function rank(left: unknown, right: unknown, spec: { sort: string; nulls?: string }): number {
  const one = order(left);
  const other = order(right);
  const oneMissing = Number.isNaN(one);
  const otherMissing = Number.isNaN(other);

  if (oneMissing !== otherMissing) return oneMissing === (spec.nulls === 'last') ? 1 : -1;
  if (oneMissing || one === other) return 0;

  const ascending = one < other ? -1 : 1;

  return spec.sort === 'desc' ? -ascending : ascending;
}
