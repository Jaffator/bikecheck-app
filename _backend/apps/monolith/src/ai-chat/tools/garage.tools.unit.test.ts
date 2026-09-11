import type { ToolCallOptions } from 'ai';
import type { PrismaService } from '../../../prisma/prisma.service';
import { garageTools, type GarageToolSet } from './garage.tools';

const OWNER_ID = 7;
const STRANGER_ID = 8;

const BIKE_ID = 21;
const ARCHIVED_BIKE_ID = 22;
const CHAIN_ID = 55;
const OLD_CHAIN_ID = 54;

// What the model would send with a call. get_garage takes no arguments.
const CALL: ToolCallOptions = { toolCallId: 'test-call', messages: [] };

// One Mounted Component as the read loads it.
interface PartRow {
  id: number;
  component_type_id: number;
  component_desc: string | null;
  position: string | null;
  total_km: number | null;
  total_time_min: number | null;
  removed_at: Date | null;
  is_deleted: boolean;
  component_types: { component_type: string };
}

// One bike as the read loads it, `bikename` included - so a test can watch it not come out.
interface BikeRow {
  id: number;
  user_id: number;
  is_deleted: boolean;
  bike_brand: string;
  bike_model: string | null;
  bikename: string | null;
  year: number | null;
  total_km: number | null;
  total_time_min: number | null;
  total_elevation_m: number | null;
  strava_gear_id: string | null;
  components_mounted: PartRow[];
}

function part(overrides: Partial<PartRow> = {}): PartRow {
  return {
    id: CHAIN_ID,
    component_type_id: 12,
    component_desc: 'Shimano XT M8100',
    position: null,
    total_km: 1240,
    total_time_min: 3600,
    removed_at: null,
    is_deleted: false,
    component_types: { component_type: 'Chain' },
    ...overrides,
  };
}

function bike(overrides: Partial<BikeRow> = {}): BikeRow {
  return {
    id: BIKE_ID,
    user_id: OWNER_ID,
    is_deleted: false,
    bike_brand: 'Santa Cruz',
    bike_model: 'Hightower',
    bikename: 'Modrá bestie',
    year: 2021,
    total_km: 4300,
    total_time_min: 12_000,
    total_elevation_m: 51_000,
    strava_gear_id: null,
    components_mounted: [part()],
    ...overrides,
  };
}

describe('garageTools', () => {
  const mockPrisma = { bikes: { findMany: jest.fn() } };

  // The fixtures, filtered the way the database would filter them: the caller's unarchived
  // bikes, each carrying only the parts still on it.
  function garage(bikes: BikeRow[]): void {
    mockPrisma.bikes.findMany.mockImplementation(({ where }: { where: { user_id?: number; is_deleted?: unknown } }) =>
      Promise.resolve(
        bikes
          .filter((row) => row.user_id === where.user_id && (where.is_deleted === undefined || !row.is_deleted))
          .map((row) => ({
            ...row,
            components_mounted: row.components_mounted.filter(
              (mounted) => mounted.removed_at === null && !mounted.is_deleted,
            ),
          })),
      ),
    );
  }

  // The tool set as the loop builds it, over a Prisma that serves the fixtures.
  function tools(userId: number): GarageToolSet {
    return garageTools(mockPrisma as unknown as PrismaService, userId);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('names a bike by brand and model, with units in the field names and no nickname', async () => {
    garage([bike()]);

    const page = await tools(OWNER_ID).get_garage.execute({}, CALL);

    expect(page.total_count).toBe(1);
    expect(page.rows[0]).toEqual({
      bike_id: BIKE_ID,
      bike_brand: 'Santa Cruz',
      bike_model: 'Hightower',
      year: 2021,
      total_km: 4300,
      total_time_min: 12_000,
      elevation_m: 51_000,
      strava_paired: false,
      parts: [
        {
          component_mounted_id: CHAIN_ID,
          component_type_id: 12,
          component_type: 'Chain',
          position: '',
          component_desc: 'Shimano XT M8100',
          total_km: 1240,
          total_time_min: 3600,
        },
      ],
    });
    expect(JSON.stringify(page)).not.toContain('Modrá bestie');
  });

  // Which gear id a bike answers to says nothing to its owner; that rides land on it by
  // themselves does. So the pairing goes out as a fact and the id stays behind.
  it('says a bike is paired with Strava without handing out the gear id', async () => {
    garage([bike({ strava_gear_id: 'b1234567' })]);

    const page = await tools(OWNER_ID).get_garage.execute({}, CALL);

    expect(page.rows[0].strava_paired).toBe(true);
    expect(JSON.stringify(page)).not.toContain('b1234567');
  });

  it('reads a number nobody recorded as null, which is not a zero', async () => {
    garage([
      bike({
        total_km: null,
        total_time_min: null,
        total_elevation_m: null,
        components_mounted: [part({ total_km: null, total_time_min: null, component_desc: null })],
      }),
    ]);

    const [row] = (await tools(OWNER_ID).get_garage.execute({}, CALL)).rows;

    expect(row.total_km).toBeNull();
    expect(row.total_time_min).toBeNull();
    expect(row.elevation_m).toBeNull();
    expect(row.parts[0].total_km).toBeNull();
    expect(row.parts[0].total_time_min).toBeNull();
    expect(row.parts[0].component_desc).toBe('');
  });

  it('carries only what is on the machine now', async () => {
    garage([
      bike({
        components_mounted: [part(), part({ id: OLD_CHAIN_ID, removed_at: new Date('2026-02-02T00:00:00.000Z') })],
      }),
    ]);

    const [row] = (await tools(OWNER_ID).get_garage.execute({}, CALL)).rows;

    expect(row.parts.map((mounted) => mounted.component_mounted_id)).toEqual([CHAIN_ID]);
  });

  it('leaves an Archived Bike out of the garage', async () => {
    garage([bike(), bike({ id: ARCHIVED_BIKE_ID, is_deleted: true })]);

    const page = await tools(OWNER_ID).get_garage.execute({}, CALL);

    expect(page.rows.map((row) => row.bike_id)).toEqual([BIKE_ID]);
  });

  it('returns nothing for a stranger', async () => {
    garage([bike()]);

    const page = await tools(STRANGER_ID).get_garage.execute({}, CALL);

    expect(page.rows).toEqual([]);
    expect(page.total_count).toBe(0);
  });
});
