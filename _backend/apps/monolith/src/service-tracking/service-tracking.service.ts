import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ownedBikeWhere, ownedBikesWhere } from '../bike/owned-bike.where';
import { attentionLevel, type WearAxis } from './attention-level';
import { Response_TrackedActionDto } from './dto/response-tracked-action';
import { Response_GarageTrackedActionDto } from './dto/response-garage-tracked-action';

// What a Tracked Action is read from: the part's accumulators, everything ever recorded
// against it, and the state of its own row. Nothing here is a percentage - the percentage
// is derived from these on every read and stored nowhere (ADR 0026).
const trackedPartInclude = {
  component_types: { select: { component_type: true, i18n_key: true } },
  action_done_component_map: {
    include: {
      event_actions_done: {
        select: {
          event_action_id: true,
          events_bikes: { select: { service_date: true, is_deleted: true } },
        },
      },
    },
  },
  tracked_action_state: true,
} satisfies Prisma.components_mountedInclude;

type TrackedPart = Prisma.components_mountedGetPayload<{ include: typeof trackedPartInclude }>;

// The bike's plan, with the kinds of part each action applies to.
const trackedIntervalInclude = {
  events_action: {
    select: {
      id: true,
      action_name: true,
      i18n_key: true,
      event_action_targets: { select: { component_type_id: true } },
    },
  },
} satisfies Prisma.bike_service_intervalInclude;

type TrackedInterval = Prisma.bike_service_intervalGetPayload<{ include: typeof trackedIntervalInclude }>;

// Only what is on the machine now: a part that came off, or one that should never have
// existed, is not part of it any more and owes it nothing.
const MOUNTED = { is_active: true, is_deleted: { not: true } } satisfies Prisma.components_mountedWhereInput;

// A Wear Baseline as one recorded occasion froze it, per axis.
type Baseline = TrackedPart['action_done_component_map'][number];

// Which parts carry a wear accumulator of their own. strava.service.ts grows exactly these
// columns for exactly these kinds of part, so the read has to look at the same column the
// writer fills: a chain's kilometres are its drivetrain kilometres, not the bike's.
const DRIVETRAIN_TYPES = new Set(['Chain', 'Cassette', 'Chainring']);
const SUSPENSION_TYPES = new Set(['Fork', 'Shock']);

// What one axis is measured from on one part: the accumulator that grows, and the value
// frozen against that same column when the job was last recorded.
interface Wear {
  accumulator: number | null;
  baseline: number | null | undefined;
}

// One axis of one Tracked Action, before the axes are compared.
interface Reading {
  axis: WearAxis;
  current: number;
  interval: number;
  percentage: number;
  extended: boolean;
}

// Service Tracking: how far every piece of a bike's maintenance has come. A Tracked Action
// is one mounted part paired with one action the bike keeps a Service Interval for
// (ADR 0027), and it reads as a percentage of the way to being due.
@Injectable()
export class ServiceTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  // Every Tracked Action on one bike, worst first - the quiet ones included, so work that
  // is not urgent yet can still be planned.
  async getBikeTrackedActions(bikeId: number, userId: number): Promise<Response_TrackedActionDto[]> {
    // Read with the archive included, so an Archived Bike's own page still loads; it simply
    // has no Tracked Actions to show (ADR 0024).
    const bike = await this.prisma.bikes.findFirst({
      where: ownedBikeWhere(bikeId, userId, { includeArchived: true }),
      select: { id: true, is_deleted: true },
    });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${bikeId} not found`);
    }
    if (bike.is_deleted === true) return [];

    const [intervals, parts] = await Promise.all([
      this.prisma.bike_service_interval.findMany({
        where: { bike_id: bikeId },
        include: trackedIntervalInclude,
      }),
      this.prisma.components_mounted.findMany({
        where: { bike_id: bikeId, ...MOUNTED },
        include: trackedPartInclude,
      }),
    ]);

    return worstFirst(trackedActions(parts, intervals));
  }

  // Everything across the owner's bikes that has come at least as far as the caller asks
  // about - the dashboard asks for 80. One flat list, worst first: the question it answers
  // is "what needs doing?", not "what needs doing on which bike?".
  async getGarageTrackedActions(userId: number, minPercentage: number): Promise<Response_GarageTrackedActionDto[]> {
    // An Archived Bike stays put away, so it is never even loaded.
    const bikes = await this.prisma.bikes.findMany({
      where: ownedBikesWhere(userId),
      select: { id: true, bike_brand: true, bike_model: true, year: true },
    });
    if (bikes.length === 0) return [];

    const bike_id = { in: bikes.map((bike) => bike.id) };
    const [intervals, parts] = await Promise.all([
      this.prisma.bike_service_interval.findMany({ where: { bike_id }, include: trackedIntervalInclude }),
      this.prisma.components_mounted.findMany({ where: { bike_id, ...MOUNTED }, include: trackedPartInclude }),
    ]);

    // The pieces of each bike's name, without its id: how a bike is written out is the
    // frontend's one rule, and it already has it.
    const naming = new Map(bikes.map(({ id, ...name }) => [id, name]));

    const needingAttention = trackedActions(parts, intervals)
      .filter((action) => action.percentage >= minPercentage)
      .flatMap((action) => {
        const name = naming.get(action.bike_id);
        return name === undefined ? [] : [{ ...action, ...name }];
      });

    return worstFirst(needingAttention);
  }
}

// Every pairing of these parts with these plans, each read as it stands. A plan belongs to
// one bike, so a bike's parts are only ever read against that bike's own intervals.
function trackedActions(parts: TrackedPart[], intervals: TrackedInterval[]): Response_TrackedActionDto[] {
  return parts.flatMap((part) =>
    intervals
      .filter((interval) => interval.bike_id === part.bike_id && targets(interval).has(part.component_type_id))
      .map((interval) => toTrackedAction(part, interval))
      .filter((action): action is Response_TrackedActionDto => action !== null),
  );
}

// Worst first, which is the only order any of these lists is read in.
function worstFirst<T extends { percentage: number }>(actions: T[]): T[] {
  return [...actions].sort((one, other) => other.percentage - one.percentage);
}

// The kinds of part an action applies to. An action targeting none of what is mounted
// produces no Tracked Action.
function targets(interval: TrackedInterval): Set<number> {
  return new Set(interval.events_action.event_action_targets.map((target) => target.component_type_id));
}

// One pairing read as a percentage. Null when the bike's plan sets no usable axis for it -
// an interval of zero can say nothing about how far along anything is.
function toTrackedAction(part: TrackedPart, interval: TrackedInterval): Response_TrackedActionDto | null {
  const reading = worstAxis(part, interval);
  if (reading === null) return null;

  return {
    bike_id: part.bike_id,
    component_mounted_id: part.id,
    component_type_id: part.component_type_id,
    component_type: part.component_types.component_type,
    component_type_i18n_key: part.component_types.i18n_key,
    component_desc: part.component_desc,
    position: part.position,
    event_action_id: interval.event_actions_id,
    action_name: interval.events_action.action_name,
    action_i18n_key: interval.events_action.i18n_key,
    axis: reading.axis,
    current: reading.current,
    interval: reading.interval,
    percentage: reading.percentage,
    level: attentionLevel(reading.percentage),
    extended: reading.extended,
  };
}

// The axis the bike's interval row fills in. Where it fills in more than one, the part is
// due when the first of its measures says so, so the highest percentage wins.
function worstAxis(part: TrackedPart, interval: TrackedInterval): Reading | null {
  const state = part.tracked_action_state.find((row) => row.event_actions_id === interval.event_actions_id);
  const frozen = latestBaseline(part, interval.event_actions_id);

  const wear = wearColumns(part, frozen);

  const readings: Reading[] = [
    readingOn('km', interval.service_interval_km, state?.extended_by_km ?? 0, wear.km),
    readingOn('min', interval.service_interval_min, state?.extended_by_min ?? 0, wear.min),
    readingOn('health_index', interval.health_index_interval, state?.extended_by_healthIndex ?? 0, wear.health_index),
  ].filter((reading): reading is Reading => reading !== null);

  if (readings.length === 0) return null;

  return readings.reduce((worst, reading) => (reading.percentage > worst.percentage ? reading : worst));
}

// Which column each axis reads on this part, paired with the baseline frozen against that
// same column. A chain, a cassette and a chainring wear by the kilometres they drove under
// load, and a fork and a shock by the minutes they worked; everything else wears by the
// bike's own totals.
//
// A wear index has no frozen column, and needs none: the parts measured by one are replaced
// rather than serviced, and a Replacement starts a new row at zero (ADR 0003). A Service
// recorded against such a part therefore does not reset its reading.
function wearColumns(part: TrackedPart, frozen: Baseline | null): Record<WearAxis, Wear> {
  const type = part.component_types.component_type;

  return {
    km: DRIVETRAIN_TYPES.has(type)
      ? { accumulator: part.drivetrain_km, baseline: frozen?.drivetrain_km_at_time }
      : { accumulator: part.total_km, baseline: frozen?.km_at_time },
    min: SUSPENSION_TYPES.has(type)
      ? { accumulator: part.suspension_min, baseline: frozen?.suspension_min_at_time }
      : { accumulator: part.total_time_min, baseline: frozen?.time_min_at_time },
    health_index: { accumulator: part.health_index, baseline: 0 },
  };
}

// One axis, or null where the bike keeps no interval on it. Never capped: 132% reads as
// 132%. Reported in whole percent, which is what the bands are drawn in - so the number on
// screen and the colour behind it can never disagree. Rounded down, never up: 99.6% of the
// way to due is not yet due, and must not read as 100%.
function readingOn(axis: WearAxis, intervalValue: number | null, extension: number, wear: Wear): Reading | null {
  if (intervalValue === null) return null;

  const interval = intervalValue + extension;
  if (interval <= 0) return null;

  // A baseline above the accumulator is a part whose wear was corrected downwards, not
  // wear owed back.
  const current = Math.max(0, (wear.accumulator ?? 0) - (wear.baseline ?? 0));

  return {
    axis,
    current,
    interval,
    percentage: Math.floor((current / interval) * 100),
    extended: extension > 0,
  };
}

// The Wear Baseline for one action on one part: what the most recent recording of that job
// froze. A deleted Service is no longer part of the record, so it holds no baseline either
// - the same rule the build dates a part by. None means the reading starts from zero, so
// the mileage entered when a used part was added counts as wear.
function latestBaseline(part: TrackedPart, eventActionId: number): Baseline | null {
  const recorded = part.action_done_component_map.filter(
    (junction) =>
      junction.event_actions_done.event_action_id === eventActionId &&
      junction.event_actions_done.events_bikes.is_deleted !== true,
  );

  if (recorded.length === 0) return null;

  return recorded.reduce((latest, junction) => (servicedAt(junction) > servicedAt(latest) ? junction : latest));
}

// When the work behind a baseline happened. An undated Service is the oldest there is, so
// a dated one always wins over it.
function servicedAt(junction: Baseline): number {
  return junction.event_actions_done.events_bikes.service_date?.getTime() ?? 0;
}
