import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ownedBikesWhere } from '../../bike/owned-bike.where';
import type { AttentionLevel, WearAxis, WearMeasure } from '../../service-tracking/attention-level';
import type { Response_GarageTrackedActionDto } from '../../service-tracking/dto/response-garage-tracked-action';
import type { ServiceTrackingService } from '../../service-tracking/service-tracking.service';
import { decodeCursor, encodeCursor, type Cursor } from './cursor';
import type { PageTool, ToolPage } from './tool-page';

// One Tracked Action as the model reads it - one mounted part paired with one job the bike keeps
// a Service Interval for (ADR 0027). Every number is finished: the model subtracts nothing and
// bands nothing. The unit of `current`, `interval` and `remaining` is whatever `axis` on the same
// row says, which is the one place a unit is not in the field name.
export interface TrackedActionRow {
  bike_id: number;
  bike_brand: string;
  bike_model: string;
  component_mounted_id: number;
  component_type_id: number;
  component_type: string;
  component_desc: string;
  position: string;
  event_action_id: number;
  action_name: string;
  axis: WearAxis;
  measure: WearMeasure;
  current: number;
  interval: number;
  // What is left of the interval. Negative is how far past it the part already is.
  remaining: number;
  // Whole percent of the way to being due, never capped: 132 stays 132 (ADR 0026).
  percentage: number;
  level: AttentionLevel;
  extended: boolean;
  // Nothing has ever fed the accumulator this was read from, so the row is not a reading.
  unfed: boolean;
}

const listTrackedActionsInput = z.object({
  bike_id: z.number().int().optional().describe('Only readings on this bike, from get_garage.'),
  min_percentage: z
    .number()
    .int()
    .optional()
    .describe('Only readings at this percentage or above, e.g. 80 for what needs attention.'),
  cursor: z.string().optional().describe('next_cursor of the previous page. Omit for the first page.'),
});

export type ListTrackedActionsInput = z.infer<typeof listTrackedActionsInput>;

export type TrackedActionsToolSet = {
  list_tracked_actions: PageTool<ListTrackedActionsInput, TrackedActionRow>;
};

const LIST_TRACKED_ACTIONS_DESCRIPTION =
  'What the app itself says needs doing: every part mounted right now paired with a job the bike ' +
  'keeps an interval for, worst first. Ask with min_percentage 80 for what needs attention, with ' +
  'a bike_id for how one machine stands, with neither for everything. A row is a finished ' +
  'reading - subtract nothing and decide no threshold yourself. current, interval and remaining ' +
  'are in the unit axis names on the same row: kilometres, minutes or wear index points. A ' +
  'remaining below zero is how far past the interval the part already is. percentage is whole ' +
  'percent of the way to being due and is never capped, so 132 means well past due, and level is ' +
  'the band the app reads that at: "good", "warning" from 80, "critical" from 95, "overdue" from ' +
  '100. measure says which accumulator the wear was read from, which is the answer to "why is it ' +
  'at 90% when I only rode 400 km". extended means the job was put off, so interval is longer ' +
  'than the bike plans. unfed means the accumulator was never fed, so there is nothing to ' +
  'measure the wear from - never read such a row as being in order.';

// One page of readings. A bike carries tens of pairings, so fifty rows is a whole garage's worst
// end many times over.
const PAGE_SIZE = 50;

// What separates the two halves of the sort key. The cursor has two slots and a Tracked Action
// needs three numbers, so the percentage and the part travel together in the key.
const PAIR = ':';

// Where a page carries on: the sort key and the pair that identifies the row it stopped at.
interface Position {
  percentage: number;
  component_mounted_id: number;
  event_action_id: number;
}

// The wear axis of the catalogue: how far every job on the machine has come. The reading is not
// derived here - `ServiceTrackingService` owns that arithmetic, and reading it through the same
// code the dashboard reads is what keeps the chat from speaking a third language about the
// thresholds. `prisma` is here for `unfed` alone, and `userId` lives in the closure - it is in no
// schema, so there is nothing for the model to substitute.
export function trackedActionTools(
  serviceTracking: ServiceTrackingService,
  prisma: PrismaService,
  userId: number,
): TrackedActionsToolSet {
  return {
    list_tracked_actions: {
      description: LIST_TRACKED_ACTIONS_DESCRIPTION,
      inputSchema: listTrackedActionsInput,
      execute: async (input: ListTrackedActionsInput): Promise<ToolPage<TrackedActionRow>> => {
        // The garage path, which is the one that already carries the bike's name on every row.
        // An Archived Bike never reaches it, so it never reaches the chat either.
        const tracked = await serviceTracking.getGarageTrackedActions(userId, cutoff(input.min_percentage));
        const found = input.bike_id === undefined ? tracked : tracked.filter((row) => row.bike_id === input.bike_id);

        const fed = await feedingBikes(prisma, userId, found);
        const sorted = found.map((action) => toTrackedActionRow(action, !fed.has(action.bike_id))).sort(byWorst);

        const start = startOf(sorted, pageStart(decodeCursor(input.cursor)));
        const page = sorted.slice(start, start + PAGE_SIZE);
        const total_count = sorted.length;

        const last = page.at(-1);
        const cut = start + page.length < total_count;

        if (!cut || last === undefined) return { rows: page, total_count };

        return { rows: page, total_count, truncated: true, next_cursor: cursorOf(last) };
      },
    },
  };
}

// A cutoff below zero is no cutoff at all: a reading is never less than 0% of the way to due.
function cutoff(minPercentage: number | undefined): number {
  if (minPercentage === undefined || !Number.isFinite(minPercentage)) return 0;

  return Math.max(0, Math.trunc(minPercentage));
}

// Which of these bikes has a ride on record. One grouped query, whatever the list is: a bike
// with no ride has nothing growing any accumulator, so its readings all sit at zero and must
// not be read as being in order. Ownership is written here as everywhere, so a bike id the
// filter let through still only counts this user's own rides.
async function feedingBikes(
  prisma: PrismaService,
  userId: number,
  actions: Response_GarageTrackedActionDto[],
): Promise<Set<number>> {
  const bikeIds = [...new Set(actions.map((action) => action.bike_id))];
  if (bikeIds.length === 0) return new Set();

  const ridden = await prisma.rides.groupBy({
    by: ['bike_id'],
    where: { bike_id: { in: bikeIds }, user_id: userId, is_deleted: { not: true }, bikes: ownedBikesWhere(userId) },
    _count: { _all: true },
  });

  return new Set(ridden.map((group) => group.bike_id));
}

// Worst first, then the pair that identifies the row (ADR 0027). The tiebreaker is not optional:
// most of a garage shares `percentage: 0`, and without it a page could skip a reading.
function byWorst(one: Position, other: Position): number {
  if (one.percentage !== other.percentage) return other.percentage - one.percentage;
  if (one.component_mounted_id !== other.component_mounted_id) {
    return one.component_mounted_id - other.component_mounted_id;
  }

  return one.event_action_id - other.event_action_id;
}

// Where the next page starts. A cursor pointing at nothing this list holds is nonsense from the
// model, which reads as no cursor and a first page rather than a failed answer.
function startOf(rows: TrackedActionRow[], after: Position | null): number {
  if (after === null) return 0;

  const start = rows.findIndex((row) => byWorst(after, row) < 0);

  return start === -1 ? rows.length : start;
}

function cursorOf(row: TrackedActionRow): string {
  return encodeCursor(`${row.percentage}${PAIR}${row.component_mounted_id}`, row.event_action_id);
}

function pageStart(cursor: Cursor | null): Position | null {
  if (cursor === null) return null;

  const halves = cursor.sortKey.split(PAIR);
  if (halves.length !== 2) return null;

  const percentage = Number(halves[0]);
  const componentMountedId = Number(halves[1]);
  if (!Number.isInteger(percentage) || !Number.isInteger(componentMountedId)) return null;

  return { percentage, component_mounted_id: componentMountedId, event_action_id: cursor.id };
}

// The garage row as the model reads it. `remaining` is computed here, at the tool's boundary,
// the same place the other tools normalize their units. `year` is dropped even though the garage
// DTO carries it: no other tool has it, and the difference would have the model naming a bike
// two ways. The i18n keys are dropped for the same reason - the model translates the name.
function toTrackedActionRow(action: Response_GarageTrackedActionDto, unfed: boolean): TrackedActionRow {
  return {
    bike_id: action.bike_id,
    bike_brand: action.bike_brand,
    bike_model: action.bike_model ?? '',
    component_mounted_id: action.component_mounted_id,
    component_type_id: action.component_type_id,
    component_type: action.component_type,
    component_desc: action.component_desc ?? '',
    position: action.position ?? '',
    event_action_id: action.event_action_id,
    action_name: action.action_name,
    axis: action.axis,
    measure: action.measure,
    current: action.current,
    interval: action.interval,
    remaining: action.interval - action.current,
    percentage: action.percentage,
    level: action.level,
    extended: action.extended,
    unfed,
  };
}
