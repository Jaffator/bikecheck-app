import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ownedBikeWhere } from '../bike/owned-bike.where';
import { attentionLevel } from './attention-level';
import { Response_TrackedActionDto, TrackedAxis } from './dto/response-service-tracking';

// The Service Interval names the action, and the action names the kinds of part it is done
// on — which is what pairs a plan the bike carries with the parts actually on it.
const intervalInclude = {
  events_action: { include: { event_action_targets: { select: { component_type_id: true } } } },
} satisfies Prisma.bike_service_intervalInclude;

type IntervalRow = Prisma.bike_service_intervalGetPayload<{ include: typeof intervalInclude }>;

const mountedInclude = {
  component_types: { select: { id: true, component_type: true, i18n_key: true } },
} satisfies Prisma.components_mountedInclude;

type MountedRow = Prisma.components_mountedGetPayload<{ include: typeof mountedInclude }>;

// A Wear Baseline as the read loads it: the frozen accumulators, the action they were frozen
// for, and the date that decides which freeze is the latest.
const baselineInclude = {
  event_actions_done: {
    select: { id: true, event_action_id: true, events_bikes: { select: { service_date: true, is_deleted: true } } },
  },
} satisfies Prisma.action_done_component_mapInclude;

type BaselineRow = Prisma.action_done_component_mapGetPayload<{ include: typeof baselineInclude }>;

// The Extension a Tracked Action carries. The threshold its row also holds is what
// announcements are made from, and this read makes none.
type ExtensionRow = {
  extended_by_km: number | null;
  extended_by_min: number | null;
  extended_by_healthIndex: number | null;
};

// One axis, end to end: where the bike's plan states it, which accumulator on the part
// carries it, which frozen column resets it, and what an Extension adds to it. Everything
// axis-shaped lives here, so a fourth axis is one entry rather than four branches.
interface AxisSpec {
  axis: TrackedAxis;
  intervalOf: (interval: IntervalRow) => number | null;
  accumulatorOf: (mounted: MountedRow) => number;
  // Null where no Service freezes this axis, which leaves the baseline at zero.
  baselineOf: (baseline: BaselineRow) => number | null;
  extensionOf: (extension: ExtensionRow | undefined) => number;
}

const AXES: AxisSpec[] = [
  {
    axis: 'km',
    intervalOf: (interval) => interval.service_interval_km,
    accumulatorOf: (mounted) => mounted.total_km ?? 0,
    baselineOf: (baseline) => baseline.km_at_time,
    extensionOf: (extension) => extension?.extended_by_km ?? 0,
  },
  {
    axis: 'min',
    intervalOf: (interval) => interval.service_interval_min,
    accumulatorOf: (mounted) => mounted.total_time_min ?? 0,
    baselineOf: (baseline) => baseline.time_min_at_time,
    extensionOf: (extension) => extension?.extended_by_min ?? 0,
  },
  {
    axis: 'health_index',
    intervalOf: (interval) => interval.health_index_interval,
    accumulatorOf: (mounted) => mounted.health_index ?? 0,
    // action_done_component_map freezes no wear index, so this axis always measures from
    // zero: recording work does not reset it, and only replacing the part does — which is
    // what the wear index is read on. A column to freeze it is a schema change of its own.
    baselineOf: () => null,
    extensionOf: (extension) => extension?.extended_by_healthIndex ?? 0,
  },
];

// What one axis reads for one pair, before the axes are weighed against each other.
interface AxisReading {
  axis: TrackedAxis;
  current: number;
  interval: number;
  percentage: number;
}

// What is on the bike now. Dismounting writes both is_active and removed_at, so either one
// answers, and a part deleted outright was never really there. Rows predating the is_active
// default read as still mounted, which is what they are.
function stillMounted(part: MountedRow): boolean {
  return part.is_active !== false && part.removed_at === null && part.is_deleted !== true;
}

// A deleted Service is no longer part of the record, so it no longer freezes a Wear Baseline
// either — the same rule the build is dated by.
function fromLiveService(baseline: BaselineRow): boolean {
  return baseline.event_actions_done.events_bikes.is_deleted !== true;
}

// One part and one action, which is what a Wear Baseline and a Tracked Action's state are
// both keyed by (ADR 0027).
function pairKey(componentMountedId: number, actionId: number): string {
  return `${String(componentMountedId)}:${String(actionId)}`;
}

// Latest freeze first. A Service carrying no Service Date is the oldest thing there is;
// between two on the same day the one written later wins.
function latestFirst(left: BaselineRow, right: BaselineRow): number {
  const leftDate = left.event_actions_done.events_bikes.service_date?.getTime() ?? 0;
  const rightDate = right.event_actions_done.events_bikes.service_date?.getTime() ?? 0;
  if (leftDate !== rightDate) return rightDate - leftDate;
  return right.event_actions_done.id - left.event_actions_done.id;
}

// The frozen value for one axis: the most recent Service that froze it. A Service that left
// this axis alone is passed over rather than read as a zero.
function baselineOn(spec: AxisSpec, baselines: BaselineRow[]): number {
  for (const baseline of baselines) {
    const frozen = spec.baselineOf(baseline);
    if (frozen !== null) return frozen;
  }
  return 0;
}

// The reading on one axis, or null where the bike's plan says nothing about it. An interval
// of zero is no plan either — there is nothing to take a percentage of.
function readAxis(
  spec: AxisSpec,
  interval: IntervalRow,
  mounted: MountedRow,
  baselines: BaselineRow[],
  extension: ExtensionRow | undefined,
): AxisReading | null {
  const planned = spec.intervalOf(interval);
  if (planned === null) return null;

  // The Extension is added to the interval, never subtracted from the wear (ADR 0027).
  const against = planned + spec.extensionOf(extension);
  if (against <= 0) return null;

  // With no Service the baseline is zero, so mileage entered with a used part counts as
  // wear. A baseline above the accumulator can only come from corrected inputs, and a
  // negative percentage would report that as progress backwards.
  const current = Math.max(0, spec.accumulatorOf(mounted) - baselineOn(spec, baselines));

  return { axis: spec.axis, current, interval: against, percentage: (current / against) * 100 };
}

// An interval may in principle fill in more than one axis. Until one does, the rule is the
// plain one: the axis that reads highest is the one the owner is shown (ADR 0026).
function worstAxis(readings: AxisReading[]): AxisReading | null {
  if (readings.length === 0) return null;
  return readings.reduce((worst, reading) => (reading.percentage > worst.percentage ? reading : worst));
}

function toTrackedActionDto(part: MountedRow, interval: IntervalRow, reading: AxisReading): Response_TrackedActionDto {
  return {
    bike_id: part.bike_id,
    component_mounted_id: part.id,
    component_type_id: part.component_type_id,
    component_type: part.component_types.component_type,
    component_type_i18n_key: part.component_types.i18n_key,
    component_desc: part.component_desc,
    position: part.position,
    action_id: interval.event_actions_id,
    action_name: interval.events_action.action_name,
    action_i18n_key: interval.events_action.i18n_key,
    axis: reading.axis,
    current_value: reading.current,
    interval_value: reading.interval,
    percentage: reading.percentage,
    attention_level: attentionLevel(reading.percentage),
  };
}

@Injectable()
export class ServiceTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  // Every Tracked Action of one bike, worst first. Nothing here is stored: the accumulators,
  // the Wear Baselines and the bike's Service Intervals are read and the percentages fall
  // out of them (ADR 0026).
  async getBikeTrackedActions(bikeId: number, userId: number): Promise<Response_TrackedActionDto[]> {
    // Archived alike, because an Archived Bike is still readable and its page still asks.
    const bike = await this.prisma.bikes.findFirst({
      where: ownedBikeWhere(bikeId, userId, { includeArchived: true }),
      select: { id: true, is_deleted: true },
    });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${String(bikeId)} not found`);
    }

    // A bike that has been put away takes no new work and counts towards nothing, so it
    // tracks nothing either (ADR 0024) — an empty list rather than a page that fails.
    if (bike.is_deleted === true) return [];

    // An action the bike keeps no interval for has nothing to take a percentage of, so the
    // plan is what the pairing starts from rather than the catalogue.
    const intervals = await this.prisma.bike_service_interval.findMany({
      where: { bike_id: bikeId },
      include: intervalInclude,
    });
    if (intervals.length === 0) return [];

    // A part that has come off the bike is not being ridden, so it has nothing to measure.
    // The bike's parts are tens of rows, so which of them still count is decided here in one
    // place rather than half in the query and half in the code.
    const parts = await this.prisma.components_mounted.findMany({
      where: { bike_id: bikeId },
      include: mountedInclude,
    });
    const mounted = parts.filter(stillMounted);
    if (mounted.length === 0) return [];

    const mountedIds = mounted.map((part) => part.id);
    const baselines = await this.baselinesByPair(mountedIds);
    const extensions = await this.extensionsByPair(mountedIds);

    const tracked: Response_TrackedActionDto[] = [];

    for (const interval of intervals) {
      const targets = new Set(interval.events_action.event_action_targets.map((target) => target.component_type_id));

      for (const part of mounted) {
        if (!targets.has(part.component_type_id)) continue;

        // Two parts of the same kind are two pairs, each with its own baseline and state.
        const key = pairKey(part.id, interval.event_actions_id);
        const readings = AXES.map((spec) =>
          readAxis(spec, interval, part, baselines.get(key) ?? [], extensions.get(key)),
        ).filter((reading): reading is AxisReading => reading !== null);

        const worst = worstAxis(readings);
        if (worst === null) continue;

        tracked.push(toTrackedActionDto(part, interval, worst));
      }
    }

    // Worst first, which is the order every screen reads them in.
    return tracked.sort((left, right) => right.percentage - left.percentage);
  }

  // The Wear Baselines of these parts, grouped by the pair they were frozen for and left in
  // latest-first order.
  private async baselinesByPair(mountedIds: number[]): Promise<Map<string, BaselineRow[]>> {
    const rows = await this.prisma.action_done_component_map.findMany({
      where: { component_mounted_id: { in: mountedIds } },
      include: baselineInclude,
    });

    const byPair = new Map<string, BaselineRow[]>();
    for (const row of rows.filter(fromLiveService).sort(latestFirst)) {
      const key = pairKey(row.component_mounted_id, row.event_actions_done.event_action_id);
      const group = byPair.get(key);
      if (group) group.push(row);
      else byPair.set(key, [row]);
    }

    return byPair;
  }

  // What putting these parts' Tracked Actions off has already added to their intervals.
  private async extensionsByPair(mountedIds: number[]): Promise<Map<string, ExtensionRow>> {
    const rows = await this.prisma.service_snooze.findMany({
      where: { component_mounted_id: { in: mountedIds } },
    });

    return new Map(rows.map((row) => [pairKey(row.component_mounted_id, row.event_actions_id), row]));
  }
}
