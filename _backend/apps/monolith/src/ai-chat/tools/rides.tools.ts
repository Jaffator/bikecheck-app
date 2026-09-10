import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { decodeCursor, encodeCursor, type Cursor } from './cursor';
import { dateRange, isoDay } from './tool-dates';
import { optionalId, optionalText } from './tool-input';
import { narrowed, withUnfilteredCount, type PageTool, type ToolPage } from './tool-page';

// One ride, as the model reads it. Units live in the field names, so stored metres are
// normalized to kilometres on the way out; a missing number is 0, so no field is optional.
export interface RideRow {
  ride_id: number;
  bike_id: number;
  bike_brand: string;
  bike_model: string;
  // ISO day, or null on a ride whose start nobody recorded.
  started_at: string | null;
  distance_km: number;
  duration_min: number;
  elevation_m: number;
}

const listRidesInput = z.object({
  bike_id: optionalId().describe('Only rides on this bike, from get_garage.'),
  from: optionalText().describe(
    'Ridden on or after this ISO day, e.g. "2026-01-01". Omit unless the question names a period.',
  ),
  to: optionalText().describe('Ridden on or before this ISO day. Omit unless the question names a period.'),
  cursor: optionalText().describe('next_cursor of the previous page. Omit for the first page.'),
});

export type ListRidesInput = z.infer<typeof listRidesInput>;

export type RidesToolSet = {
  list_rides: PageTool<ListRidesInput, RideRow>;
};

const LIST_RIDES_DESCRIPTION =
  'The rides recorded on the bikes the user owns, newest first: one row per ride, with the day ' +
  'it was ridden, how far, how long and how much it climbed. There is no total on offer - add ' +
  'the rows up yourself, and read total_count before you call a sum complete.';

// One page of rides. A thin row and hundreds to a season, so this is the largest of the pages -
// it keeps "how far did I ride last year" to few enough rounds.
const PAGE_SIZE = 200;

// The sort key of a ride with no start. Never empty - an empty key does not survive the cursor.
const NO_DATE = '-';

// Newest ride first, undated rides last, and the row id to break a tie - so a page never skips
// two rides started at the same moment.
const ridesOrder = [
  { started_at: { sort: 'desc', nulls: 'last' } },
  { id: 'desc' },
] satisfies Prisma.ridesOrderByWithRelationInput[];

// Everything a row is made of and nothing else. The Strava payload, the speeds and the wear
// meters stay out, and `bikename` is not selected at all.
const ridesSelect = {
  id: true,
  bike_id: true,
  started_at: true,
  distance_m: true,
  duration_min: true,
  elevation_up_m: true,
  bikes: { select: { bike_brand: true, bike_model: true } },
} satisfies Prisma.ridesSelect;

type RideRecord = Prisma.ridesGetPayload<{ select: typeof ridesSelect }>;

// The riding axis of the catalogue: what was ridden, when and how far. Ownership is on the ride
// itself and `userId` lives in the closure; no aggregate mode, the model adds the rows up.
export function ridesTools(prisma: PrismaService, userId: number): RidesToolSet {
  return {
    list_rides: {
      description: LIST_RIDES_DESCRIPTION,
      inputSchema: listRidesInput,
      execute: async (input: ListRidesInput): Promise<ToolPage<RideRow>> => {
        const filter = ridesWhere(userId, input);
        const after = pageStart(decodeCursor(input.cursor));
        const where = after === undefined ? filter : { ...filter, AND: [after] };

        // One more row than a page, which is how the end of the list is recognised.
        const [found, total_count] = await Promise.all([
          prisma.rides.findMany({
            where,
            orderBy: ridesOrder,
            take: PAGE_SIZE + 1,
            select: ridesSelect,
          }),
          prisma.rides.count({ where: filter }),
        ]);

        const cut = found.length > PAGE_SIZE;
        const rides = cut ? found.slice(0, PAGE_SIZE) : found;
        const rows = rides.map(toRideRow);
        const last = rides.at(-1);

        if (!cut || last === undefined) {
          return await withUnfilteredCount({ rows, total_count }, narrowed(input), () =>
            prisma.rides.count({ where: ridesWhere(userId, {}) }),
          );
        }

        return { rows, total_count, truncated: true, next_cursor: encodeCursor(sortKeyOf(last), last.id) };
      },
    },
  };
}

// Ownership plus whatever the model asked to narrow by. `rides.user_id` carries the owner; across
// every bike an Archived Bike's rides leave with it, asked for by id they still read (ADR 0024).
function ridesWhere(userId: number, input: Partial<ListRidesInput>): Prisma.ridesWhereInput {
  const on = dateRange(input.from, input.to);

  return {
    user_id: userId,
    is_deleted: { not: true },
    ...(input.bike_id === undefined ? { bikes: { is_deleted: { not: true } } } : { bike_id: input.bike_id }),
    ...(on === undefined ? {} : { started_at: on }),
  };
}

// Where the next page carries on, for `started_at DESC NULLS LAST, id DESC`. The sentinel means
// the last row read had no start.
function pageStart(cursor: Cursor | null): Prisma.ridesWhereInput | undefined {
  if (cursor === null) return undefined;
  if (cursor.sortKey === NO_DATE) return { started_at: null, id: { lt: cursor.id } };

  const at = new Date(cursor.sortKey);
  if (Number.isNaN(at.getTime())) return undefined;

  return {
    OR: [{ started_at: { lt: at } }, { started_at: at, id: { lt: cursor.id } }, { started_at: null }],
  };
}

function sortKeyOf(ride: RideRecord): string {
  return ride.started_at === null ? NO_DATE : ride.started_at.toISOString();
}

function toRideRow(ride: RideRecord): RideRow {
  return {
    ride_id: ride.id,
    bike_id: ride.bike_id,
    bike_brand: ride.bikes.bike_brand,
    bike_model: ride.bikes.bike_model ?? '',
    started_at: isoDay(ride.started_at),
    distance_km: kilometres(ride.distance_m),
    duration_min: ride.duration_min ?? 0,
    elevation_m: ride.elevation_up_m ?? 0,
  };
}

// Metres as kilometres, to one decimal - whole kilometres would turn a short ride into a
// rounding error.
function kilometres(metres: number | null): number {
  return metres === null ? 0 : Math.round(metres / 100) / 10;
}
