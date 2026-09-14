import { validateTypes } from '@ai-sdk/provider-utils';
import type { ToolCallOptions } from 'ai';
import type { PrismaService } from '../../../prisma/prisma.service';
import { servicesTools, type ListServicesInput, type ServiceRow, type ServicesToolSet } from './services.tools';

const OWNER_ID = 7;
const STRANGER_ID = 8;

const BIKE_ID = 21;
const ARCHIVED_BIKE_ID = 22;

const CHAIN_ID = 55;
const FORK_ID = 60;
const PADS_ID = 61;

const CHAIN_TYPE_ID = 12;
const FORK_TYPE_ID = 30;
const PADS_TYPE_ID = 40;

const CHAIN_REPLACEMENT_ID = 5;
const FORK_SERVICE_ID = 6;
const PADS_REPLACEMENT_ID = 7;

const SERVICE_ID = 400;
const OTHER_SERVICE_ID = 401;
const DELETED_SERVICE_ID = 402;

const SERVICE_DATE = new Date('2026-05-14T09:00:00.000Z');

// What the model would send with a call. The tool reads only its input.
const CALL: ToolCallOptions = { toolCallId: 'test-call', messages: [] };

interface BikeFixture {
  user_id: number;
  is_deleted: boolean;
  bike_brand: string;
  bike_model: string | null;
  bikename: string | null;
}

interface PartFixture {
  id: number;
  component_type_id: number;
  component_desc: string | null;
  position: string | null;
  component_types: { component_type: string };
}

interface LinkFixture {
  component_mounted_id: number;
  components_mounted: PartFixture;
}

interface TagFixture {
  event_action_tag: string;
  user_id: number | null;
}

interface ActionFixture {
  id: number;
  event_action_id: number;
  note: string | null;
  partial_cost: number | null;
  part_replaced: boolean | null;
  events_action: { action_name: string; event_action_tags: TagFixture[] };
  action_done_component_map: LinkFixture[];
}

interface ServiceFixture {
  id: number;
  bike_id: number | null;
  service_date: Date | null;
  total_cost: number | null;
  note: string | null;
  is_deleted: boolean;
  bikes: BikeFixture;
  event_actions_done: ActionFixture[];
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

const CHAIN: PartFixture = {
  id: CHAIN_ID,
  component_type_id: CHAIN_TYPE_ID,
  component_desc: 'Shimano XT M8100',
  position: null,
  component_types: { component_type: 'Chain' },
};

const FORK: PartFixture = {
  id: FORK_ID,
  component_type_id: FORK_TYPE_ID,
  component_desc: 'Fox 36 Factory',
  position: 'front',
  component_types: { component_type: 'Fork' },
};

const PADS: PartFixture = {
  id: PADS_ID,
  component_type_id: PADS_TYPE_ID,
  component_desc: null,
  position: 'rear',
  component_types: { component_type: 'Brake pads' },
};

function on(...parts: PartFixture[]): LinkFixture[] {
  return parts.map((part) => ({ component_mounted_id: part.id, components_mounted: part }));
}

function action(overrides: Partial<ActionFixture> = {}): ActionFixture {
  return {
    id: 900,
    event_action_id: CHAIN_REPLACEMENT_ID,
    note: 'Řetěz dojezděný',
    partial_cost: 650,
    part_replaced: true,
    events_action: { action_name: 'Chain Replacement', event_action_tags: [] },
    action_done_component_map: on(CHAIN),
    ...overrides,
  };
}

function service(overrides: Partial<ServiceFixture> = {}): ServiceFixture {
  return {
    id: SERVICE_ID,
    bike_id: BIKE_ID,
    service_date: SERVICE_DATE,
    total_cost: 1250.5,
    note: 'Jarní servis',
    is_deleted: false,
    bikes: bike(),
    event_actions_done: [action()],
    ...overrides,
  };
}

// The second occasion: a fork service that replaced nothing, and a pad replacement.
function forkAndPads(): ServiceFixture {
  return service({
    id: OTHER_SERVICE_ID,
    service_date: new Date('2026-07-02T09:00:00.000Z'),
    event_actions_done: [
      action({
        id: 901,
        event_action_id: FORK_SERVICE_ID,
        events_action: { action_name: 'Fork Full Service', event_action_tags: [] },
        part_replaced: false,
        partial_cost: 2400,
        note: null,
        action_done_component_map: on(FORK),
      }),
      action({
        id: 902,
        event_action_id: PADS_REPLACEMENT_ID,
        events_action: { action_name: 'Brake Pads Replacement', event_action_tags: [] },
        part_replaced: true,
        partial_cost: 400,
        note: null,
        action_done_component_map: on(PADS),
      }),
    ],
  });
}

describe('servicesTools', () => {
  const mockPrisma = { events_bikes: { findMany: jest.fn(), count: jest.fn() } };

  // The fixtures behind a database that answers the tool's own where, orderBy and take - so a
  // test reads what execute() answered rather than what it asked for.
  function database(services: ServiceFixture[]): void {
    mockPrisma.events_bikes.findMany.mockImplementation(
      ({ where, orderBy, take }: { where: unknown; orderBy: OrderBy; take: number }) =>
        Promise.resolve(
          ordered(
            services.filter((row) => matches(row, where)),
            orderBy,
          ).slice(0, take),
        ),
    );
    mockPrisma.events_bikes.count.mockImplementation(({ where }: { where: unknown }) =>
      Promise.resolve(services.filter((row) => matches(row, where)).length),
    );
  }

  function tools(userId: number): ServicesToolSet {
    return servicesTools(mockPrisma as unknown as PrismaService, userId);
  }

  function ids(rows: ServiceRow[]): number[] {
    return rows.map((row) => row.service_id);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads one occasion with its actions, the parts they touched and what each cost', async () => {
    database([service()]);

    const page = await tools(OWNER_ID).list_services.execute({}, CALL);

    expect(page.total_count).toBe(1);
    expect(page.truncated).toBeUndefined();
    expect(page.next_cursor).toBeUndefined();
    expect(page.rows[0]).toEqual({
      service_id: SERVICE_ID,
      bike_id: BIKE_ID,
      bike_brand: 'Santa Cruz',
      bike_model: 'Hightower',
      service_date: '2026-05-14',
      cost: 1250.5,
      note: 'Jarní servis',
      actions: [
        {
          action_id: CHAIN_REPLACEMENT_ID,
          action_name: 'Chain Replacement',
          tags: [],
          note: 'Řetěz dojezděný',
          cost: 650,
          part_replaced: true,
          parts: [
            {
              component_mounted_id: CHAIN_ID,
              component_type_id: CHAIN_TYPE_ID,
              component_type: 'Chain',
              component_desc: 'Shimano XT M8100',
              position: '',
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(page)).not.toContain('Modrá bestie');
  });

  it('reads a missing cost as null and a missing note as empty, and an undated occasion as null', async () => {
    database([
      service({
        total_cost: null,
        note: null,
        service_date: null,
        event_actions_done: [action({ partial_cost: null, note: null, part_replaced: null })],
      }),
    ]);

    const [row] = (await tools(OWNER_ID).list_services.execute({}, CALL)).rows;

    expect(row.cost).toBeNull();
    expect(row.note).toBe('');
    expect(row.service_date).toBeNull();
    expect(row.actions[0].cost).toBeNull();
    expect(row.actions[0].note).toBe('');
    expect(row.actions[0].part_replaced).toBe(false);
  });

  it("carries the seeded tags and the caller's own, never a tag another user added", async () => {
    database([
      service({
        event_actions_done: [
          action({
            events_action: {
              action_name: 'Fork Full Service',
              event_action_tags: [
                { event_action_tag: 'Oil change', user_id: null },
                { event_action_tag: 'Můj vlastní', user_id: OWNER_ID },
                { event_action_tag: 'Cizí tag', user_id: STRANGER_ID },
              ],
            },
          }),
        ],
      }),
    ]);

    const [row] = (await tools(OWNER_ID).list_services.execute({}, CALL)).rows;

    expect(row.actions[0].tags).toEqual(['Oil change', 'Můj vlastní']);
  });

  it('wants a part and a replacement on one and the same action', async () => {
    database([service(), forkAndPads()]);

    const list = tools(OWNER_ID).list_services;

    expect(ids((await list.execute({ replaced_only: true, component_type_id: CHAIN_TYPE_ID }, CALL)).rows)).toEqual([
      SERVICE_ID,
    ]);
    // The fork was serviced on that occasion, but nothing replaced it. What comes back is the
    // whole list marked as the swap it is, never an empty page that reads like a fact.
    const noFork = await list.execute({ replaced_only: true, component_type_id: FORK_TYPE_ID }, CALL);
    expect(noFork.filter_ignored).toBe(true);
    expect(ids(noFork.rows)).toEqual([OTHER_SERVICE_ID, SERVICE_ID]);
    expect(ids((await list.execute({ replaced_only: true }, CALL)).rows)).toEqual([OTHER_SERVICE_ID, SERVICE_ID]);
  });

  it('hands back a matching occasion whole, not only the action that matched', async () => {
    database([service(), forkAndPads()]);

    const page = await tools(OWNER_ID).list_services.execute({ mounted_component_id: FORK_ID }, CALL);

    expect(ids(page.rows)).toEqual([OTHER_SERVICE_ID]);
    expect(page.rows[0].actions.map((done) => done.action_id)).toEqual([FORK_SERVICE_ID, PADS_REPLACEMENT_ID]);
  });

  it('narrows to one bike and a period', async () => {
    database([service(), forkAndPads()]);

    const list = tools(OWNER_ID).list_services;

    expect(ids((await list.execute({ from: '2026-06-01' }, CALL)).rows)).toEqual([OTHER_SERVICE_ID]);
    expect(ids((await list.execute({ to: '2026-05-14' }, CALL)).rows)).toEqual([SERVICE_ID]);
    // An archived bike is nobody's to read, so its filter matches nothing and the unnarrowed
    // list stands in.
    expect((await list.execute({ bike_id: ARCHIVED_BIKE_ID }, CALL)).filter_ignored).toBe(true);
  });

  // What the model actually sends goes through the tool's own schema first, which is where a
  // filled-in argument is either kept or dropped. Calling execute() directly would walk past it.
  async function asked(input: unknown): Promise<ListServicesInput> {
    return await validateTypes({ value: input, schema: tools(OWNER_ID).list_services.inputSchema });
  }

  it('drops the zeros a filling model sends instead of filtering by them', async () => {
    database([service()]);

    // Exactly what gpt-4o-mini sent when it told a user with a service on record that they had
    // never serviced anything: every optional argument filled, the ids at 0.
    const input = await asked({
      bike_id: BIKE_ID,
      component_type_id: 0,
      mounted_component_id: 0,
      replaced_only: false,
    });

    expect(ids((await tools(OWNER_ID).list_services.execute(input, CALL)).rows)).toEqual([SERVICE_ID]);
  });

  it('reads an empty string from a filling model as no date filter', async () => {
    database([service()]);

    const input = await asked({ from: '', to: '   ' });

    expect(ids((await tools(OWNER_ID).list_services.execute(input, CALL)).rows)).toEqual([SERVICE_ID]);
  });

  // Words did not stop a model reading its own empty page as a fact - see the eval - so the
  // page it gets back is the one it should have asked for.
  it('hands back the unnarrowed list when the filters matched nothing', async () => {
    database([service()]);

    const page = await tools(OWNER_ID).list_services.execute({ mounted_component_id: FORK_ID }, CALL);

    expect(ids(page.rows)).toEqual([SERVICE_ID]);
    expect(page.total_count).toBe(1);
    expect(page.filter_ignored).toBe(true);
  });

  // The one case where empty is the answer: nothing is on record either way.
  it('says nothing is recorded only when the list is empty without the filters too', async () => {
    database([]);

    const page = await tools(OWNER_ID).list_services.execute({ mounted_component_id: FORK_ID }, CALL);

    expect(page.rows).toEqual([]);
    expect(page.unfiltered_count).toBe(0);
    expect(page.filter_ignored).toBeUndefined();
  });

  it('leaves unfiltered_count out when the answer is empty and nothing was narrowed', async () => {
    database([]);

    const page = await tools(OWNER_ID).list_services.execute({}, CALL);

    expect(page.rows).toEqual([]);
    expect(page.unfiltered_count).toBeUndefined();
  });

  it('leaves unfiltered_count out when the filter found something', async () => {
    database([service(), forkAndPads()]);

    const page = await tools(OWNER_ID).list_services.execute({ bike_id: BIKE_ID }, CALL);

    expect(page.unfiltered_count).toBeUndefined();
  });

  it('puts the newest work first and an undated occasion last', async () => {
    database([
      service({ id: 1, service_date: new Date('2025-06-01T00:00:00.000Z') }),
      service({ id: 2, service_date: null }),
      service({ id: 3, service_date: new Date('2026-06-01T00:00:00.000Z') }),
    ]);

    const page = await tools(OWNER_ID).list_services.execute({}, CALL);

    expect(ids(page.rows)).toEqual([3, 1, 2]);
  });

  it('cuts the page and carries on from the cursor without skipping a shared date', async () => {
    // Thirty occasions on the same day: the date alone cannot order them, so only the cursor's
    // second half keeps the pages apart.
    const together = Array.from({ length: 30 }, (_value, index) => service({ id: 500 + index }));
    database(together);

    const list = tools(OWNER_ID).list_services;
    const first = await list.execute({}, CALL);

    expect(first.rows).toHaveLength(25);
    expect(first.total_count).toBe(30);
    expect(first.truncated).toBe(true);
    expect(first.next_cursor).toEqual(expect.any(String));

    const second = await list.execute({ cursor: first.next_cursor }, CALL);

    expect(second.rows).toHaveLength(5);
    expect(second.total_count).toBe(30);
    expect(second.truncated).toBeUndefined();
    expect(second.next_cursor).toBeUndefined();

    const read = [...ids(first.rows), ...ids(second.rows)];
    expect(new Set(read).size).toBe(30);
    expect(read).toEqual(together.map((row) => row.id).reverse());
  });

  it('reads nonsense from the model as no cursor and starts from the beginning', async () => {
    database([service(), forkAndPads()]);

    const page = await tools(OWNER_ID).list_services.execute({ cursor: 'not-a-cursor' }, CALL);

    expect(page.total_count).toBe(2);
    expect(page.rows).toHaveLength(2);
  });

  it('leaves a deleted Service and an Archived Bike out of the record', async () => {
    database([
      service(),
      service({ id: DELETED_SERVICE_ID, is_deleted: true }),
      service({ id: 403, bike_id: ARCHIVED_BIKE_ID, bikes: bike({ is_deleted: true }) }),
    ]);

    const page = await tools(OWNER_ID).list_services.execute({}, CALL);

    expect(ids(page.rows)).toEqual([SERVICE_ID]);
    expect(page.total_count).toBe(1);
  });

  it('returns nothing for a stranger', async () => {
    database([service()]);

    const page = await tools(STRANGER_ID).list_services.execute({ bike_id: BIKE_ID }, CALL);

    expect(page.rows).toEqual([]);
    expect(page.total_count).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Enough of Prisma to run the tool's own query against fixtures.

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
  if (expected instanceof Date || typeof expected !== 'object') return same(actual, expected);
  if (Object.keys(expected as Row).every((key) => OPERATORS.has(key))) return operators(actual, expected as Row);

  return matches(actual, expected);
}

function operators(actual: unknown, filter: Row): boolean {
  return Object.entries(filter).every(([operator, value]) => {
    switch (operator) {
      case 'mode':
        return true;
      case 'equals':
        return same(actual, value);
      case 'not':
        return !field(actual, value);
      case 'in':
        return (value as unknown[]).some((item) => same(actual, item));
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

function same(actual: unknown, expected: unknown): boolean {
  if (actual instanceof Date && expected instanceof Date) return actual.getTime() === expected.getTime();

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
