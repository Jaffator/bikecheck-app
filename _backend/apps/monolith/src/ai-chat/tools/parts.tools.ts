import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ownedBikesWhere } from '../../bike/owned-bike.where';
import { decodeCursor, encodeCursor, type Cursor } from './cursor';
import { dateRange, isoDay } from './tool-dates';
import type { PageTool, ToolPage } from './tool-page';

// A part that is on the machine, or one that came off. Derived from `removed_at`; `is_active`
// never goes out, because two signals of the same thing would leave the model choosing.
export type PartStatus = 'mounted' | 'removed';

// One Mounted Component in the history of a bike, still on it or already off. Ids go out so the
// other tools can be called with them; units live in the field names; a missing number is 0, so
// no numeric field is optional. The wear accumulators - `drivetrain_km`, `suspension_min`,
// `health_index` - stay in: they are inputs to a reading, not answers.
export interface PartHistoryRow {
  component_mounted_id: number;
  bike_id: number;
  bike_brand: string;
  bike_model: string;
  component_type_id: number;
  component_type: string;
  component_desc: string;
  position: string;
  status: PartStatus;
  // ISO day, or null on a part whose date nobody recorded.
  mounted_at: string | null;
  removed_at: string | null;
  total_km: number;
  total_time_min: number;
  // Services that touched this part, zero included: an Unserviced Component is a finding to
  // state, not something to read out of an empty answer.
  service_count: number;
}

const listPartsInput = z.object({
  bike_id: z.number().int().optional().describe('Only parts of this bike, from get_garage.'),
  component_type_id: z.number().int().optional().describe('Only parts of this kind, from get_garage.'),
  position: z.string().optional().describe('Only parts in this position, e.g. "front".'),
  active: z.boolean().optional().describe('true for parts still mounted, false for parts taken off.'),
  mounted_from: z.string().optional().describe('Mounted on or after this ISO day, e.g. "2026-01-01".'),
  mounted_to: z.string().optional().describe('Mounted on or before this ISO day.'),
  removed_from: z.string().optional().describe('Taken off on or after this ISO day.'),
  removed_to: z.string().optional().describe('Taken off on or before this ISO day.'),
  cursor: z.string().optional().describe('next_cursor of the previous page. Omit for the first page.'),
});

export type ListPartsInput = z.infer<typeof listPartsInput>;

export type PartsToolSet = {
  list_parts: PageTool<ListPartsInput, PartHistoryRow>;
};

const LIST_PARTS_DESCRIPTION =
  'The history of the parts on the bikes the user owns, the ones already taken off included, ' +
  'newest mounting first. Every row says whether the part is mounted or removed and how many ' +
  'services touched it. Filter with the ids get_garage gave you. What was actually done to a ' +
  'part comes from list_services.';

// One page of parts. Fifty rows is a whole build many times over, so a page is a real page.
const PAGE_SIZE = 50;

// The sort key of a part with no mounting date. Never empty, because an empty key does not
// survive the cursor.
const NO_DATE = '-';

// Newest mounting first, undated parts last, and the row id to break a tie - which is what
// keeps a page from skipping parts mounted on the same day.
const partsOrder = [
  { mounted_at: { sort: 'desc', nulls: 'last' } },
  { id: 'desc' },
] satisfies Prisma.components_mountedOrderByWithRelationInput[];

// Everything a row is made of and nothing else. The bike comes along denormalized: the model
// reads brand and model as text, and `bikename` is not selected at all.
const partsSelect = {
  id: true,
  bike_id: true,
  component_type_id: true,
  component_desc: true,
  position: true,
  mounted_at: true,
  removed_at: true,
  total_km: true,
  total_time_min: true,
  bikes: { select: { bike_brand: true, bike_model: true } },
  component_types: { select: { component_type: true } },
} satisfies Prisma.components_mountedSelect;

type PartRecord = Prisma.components_mountedGetPayload<{ select: typeof partsSelect }>;

// The history axis of the catalogue: which parts a bike has carried and for how long. Ownership
// is written here, and `userId` lives in the closure - it is in no schema, so there is nothing
// for the model to substitute.
export function partsTools(prisma: PrismaService, userId: number): PartsToolSet {
  return {
    list_parts: {
      description: LIST_PARTS_DESCRIPTION,
      inputSchema: listPartsInput,
      execute: async (input: ListPartsInput): Promise<ToolPage<PartHistoryRow>> => {
        const filter = partsWhere(userId, input);
        const after = pageStart(decodeCursor(input.cursor));
        const where = after === undefined ? filter : { ...filter, AND: [after] };

        // One more row than a page, which is how the end of the list is recognised.
        const [found, total_count] = await Promise.all([
          prisma.components_mounted.findMany({
            where,
            orderBy: partsOrder,
            take: PAGE_SIZE + 1,
            select: partsSelect,
          }),
          prisma.components_mounted.count({ where: filter }),
        ]);

        const cut = found.length > PAGE_SIZE;
        const parts = cut ? found.slice(0, PAGE_SIZE) : found;
        const counts = await serviceCounts(
          prisma,
          parts.map((part) => part.id),
        );

        const rows = parts.map((part) => toPartHistoryRow(part, counts.get(part.id) ?? 0));
        const last = parts.at(-1);

        if (!cut || last === undefined) return { rows, total_count };

        return { rows, total_count, truncated: true, next_cursor: encodeCursor(sortKeyOf(last), last.id) };
      },
    },
  };
}

// Ownership plus whatever the model asked to narrow by. A part of a bike this user does not own
// is not reachable through any combination of the filters, because the relation is the first
// clause. A deleted part is a row that should never have existed, so it is not history.
function partsWhere(userId: number, input: ListPartsInput): Prisma.components_mountedWhereInput {
  const mountedAt = dateRange(input.mounted_from, input.mounted_to);
  const removedAt = removedAtFilter(input);

  return {
    bikes: ownedBikesWhere(userId),
    is_deleted: { not: true },
    ...(input.bike_id === undefined ? {} : { bike_id: input.bike_id }),
    ...(input.component_type_id === undefined ? {} : { component_type_id: input.component_type_id }),
    ...(input.position === undefined ? {} : { position: { equals: input.position, mode: 'insensitive' } }),
    ...(mountedAt === undefined ? {} : { mounted_at: mountedAt }),
    ...(removedAt === undefined ? {} : { removed_at: removedAt }),
  };
}

// `active` and the removal dates speak about the same column, so they are decided together: a
// part still mounted has no removal date to fall in a range.
function removedAtFilter(input: ListPartsInput): Prisma.components_mountedWhereInput['removed_at'] {
  if (input.active === true) return null;

  const range = dateRange(input.removed_from, input.removed_to);
  if (input.active === false) return { not: null, ...range };

  return range;
}

// Where the next page carries on, for `mounted_at DESC NULLS LAST, id DESC`. The sentinel says
// the last row read had no date, so only undated parts are left.
function pageStart(cursor: Cursor | null): Prisma.components_mountedWhereInput | undefined {
  if (cursor === null) return undefined;
  if (cursor.sortKey === NO_DATE) return { mounted_at: null, id: { lt: cursor.id } };

  const at = new Date(cursor.sortKey);
  if (Number.isNaN(at.getTime())) return undefined;

  return {
    OR: [{ mounted_at: { lt: at } }, { mounted_at: at, id: { lt: cursor.id } }, { mounted_at: null }],
  };
}

function sortKeyOf(part: PartRecord): string {
  return part.mounted_at === null ? NO_DATE : part.mounted_at.toISOString();
}

// How many Services touched each of these parts, zero included. A deleted Service is no longer
// part of the record, so it does not count; two actions on one occasion still count once,
// because the occasion is what a user means by "a service".
async function serviceCounts(prisma: PrismaService, ids: number[]): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();

  const links = await prisma.action_done_component_map.findMany({
    where: {
      component_mounted_id: { in: ids },
      event_actions_done: { events_bikes: { is_deleted: { not: true } } },
    },
    select: { component_mounted_id: true, event_actions_done: { select: { bike_event_id: true } } },
  });

  const occasions = new Map<number, Set<number>>();
  for (const link of links) {
    const services = occasions.get(link.component_mounted_id) ?? new Set<number>();
    services.add(link.event_actions_done.bike_event_id);
    occasions.set(link.component_mounted_id, services);
  }

  return new Map(ids.map((id) => [id, occasions.get(id)?.size ?? 0]));
}

function toPartHistoryRow(part: PartRecord, serviceCount: number): PartHistoryRow {
  return {
    component_mounted_id: part.id,
    bike_id: part.bike_id,
    bike_brand: part.bikes.bike_brand,
    bike_model: part.bikes.bike_model ?? '',
    component_type_id: part.component_type_id,
    component_type: part.component_types.component_type,
    component_desc: part.component_desc ?? '',
    position: part.position ?? '',
    status: part.removed_at === null ? 'mounted' : 'removed',
    mounted_at: isoDay(part.mounted_at),
    removed_at: isoDay(part.removed_at),
    total_km: part.total_km ?? 0,
    total_time_min: part.total_time_min ?? 0,
    service_count: serviceCount,
  };
}
