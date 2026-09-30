import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ownedBikeWhere, ownedBikesWhere } from '../bike/owned-bike.where';
import { NotificationService } from '../notification/notification.service';
import {
  announces,
  attentionLevel,
  reachedBand,
  type AttentionLevel,
  type WearAxis,
  type WearMeasure,
} from './attention-level';
import { Response_TrackedActionDto } from './dto/response-tracked-action';
import { Response_GarageTrackedActionDto } from './dto/response-garage-tracked-action';
import { Response_WoreOffLineDto } from './dto/response-wore-off-line';
import { RIDE_WEAR, wearRideSelect, type WearRide } from './ride-wear';

// What a Tracked Action is read from: the part's accumulators, everything ever recorded
// against it, and the state of its own row. Nothing here is a percentage - the percentage
// is derived from these on every read and stored nowhere (ADR 0026).
const trackedPartInclude = {
  component_types: { select: { component_type: true, i18n_key: true, component_group_id: true } },
  action_done_component_map: {
    include: {
      event_actions_done: {
        select: {
          event_action_id: true,
          // created_at alongside service_date: the date decides which recording is the
          // latest, and where two share a day the timestamp breaks the tie.
          events_bikes: { select: { service_date: true, created_at: true, is_deleted: true } },
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
      // Which of the two things recording this job means, and so which button the drawer
      // offers: Log replacement, or Log service.
      replace_action: true,
      event_action_targets: { select: { component_type_id: true } },
    },
  },
} satisfies Prisma.bike_service_intervalInclude;

type TrackedInterval = Prisma.bike_service_intervalGetPayload<{ include: typeof trackedIntervalInclude }>;

// Only what is on the machine now: a part that came off, or one that should never have
// existed, is not part of it any more and owes it nothing.
const MOUNTED = { is_active: true, is_deleted: { not: true } } satisfies Prisma.components_mountedWhereInput;

// A descent rate reads the latest rides, and says nothing until enough of them are behind it.
const LATEST_RIDES_FOR_RATE = 10;
const MIN_RATE_RIDES = 3;
const MIN_RATE_DESCENT_MIN = 30;

// One ride as a descent rate reads it: the pad index it added over its minutes of descent.
type RateRide = Prisma.ridesGetPayload<{ select: { health_index_brake_pad: true; descent_min: true } }>;

// Pad index per minute of descent, by bike; null where there is too little to say.
type DescentRates = Map<number, number | null>;

// A Wear Baseline as one recorded occasion froze it, per axis.
type Baseline = TrackedPart['action_done_component_map'][number];

// Which parts carry a wear accumulator of their own. strava.service.ts grows exactly these
// columns for exactly these kinds of part, so the read has to look at the same column the
// writer fills: a chain's kilometres are its drivetrain kilometres, not the bike's.
const DRIVETRAIN_TYPES = new Set(['Chain', 'Cassette', 'Chainring']);
const SUSPENSION_TYPES = new Set(['Fork', 'Shock']);

// What one axis is measured from on one part: which accumulator it is, the value that
// accumulator has reached, and the value frozen against that same column when the job was
// last recorded.
interface Wear {
  measure: WearMeasure;
  accumulator: number | null;
  baseline: number | null | undefined;
}

// One axis of one Tracked Action, before the axes are compared.
interface Reading {
  axis: WearAxis;
  measure: WearMeasure;
  current: number;
  // The Service Interval in force: the owner's own where they set one, the bike's plan
  // otherwise. Nothing is added to it, so the percentage is the part's real wear.
  interval: number;
  percentage: number;
  // The bike's own plan on this axis, which clearing the override restores.
  planned: number;
  // The owner's own value, or null where this axis follows the plan.
  override: number | null;
}

export interface GarageReading {
  action: Response_GarageTrackedActionDto;
  // When the wear it counts began: the latest recording of the job, else the mounting.
  wearBaselineAt: Date | null;
}

// Service Tracking: how far every piece of a bike's maintenance has come. A Tracked Action
// is one mounted part paired with one action the bike keeps a Service Interval for
// (ADR 0027), and it reads as a percentage of the way to being due.
@Injectable()
export class ServiceTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

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

    return worstFirst(await this.readBike(bikeId));
  }

  // Everything across the owner's bikes that has come at least as far as the caller asks
  // about - the dashboard asks for 80. One flat list, worst first: the question it answers
  // is "what needs doing?", not "what needs doing on which bike?".
  async getGarageTrackedActions(userId: number, minPercentage: number): Promise<Response_GarageTrackedActionDto[]> {
    const needingAttention = (await this.getGarageReadings(userId))
      .filter((reading) => reading.action.percentage >= minPercentage)
      .map((reading) => reading.action);

    return worstFirst(needingAttention);
  }

  // Every Tracked Action on the owner's non-archived bikes, in no order.
  async getGarageReadings(userId: number): Promise<GarageReading[]> {
    // An Archived Bike stays put away, so it is never even loaded.
    const bikes = await this.prisma.bikes.findMany({
      where: ownedBikesWhere(userId),
      select: { id: true, bike_brand: true, bike_model: true, year: true },
    });
    if (bikes.length === 0) return [];

    const [intervals, parts] = await this.loadTracking({ in: bikes.map((bike) => bike.id) });
    const rates = await this.descentRates(intervals);

    // The pieces of each bike's name, without its id: how a bike is written out is the
    // frontend's one rule, and it already has it.
    const naming = new Map(bikes.map(({ id, ...name }) => [id, name]));

    return parts.flatMap((part) =>
      trackedActions([part], intervals, rates).flatMap((action) => {
        const name = naming.get(action.bike_id);
        if (name === undefined) return [];
        return [{ action: { ...action, ...name }, wearBaselineAt: wearBaselineAt(part, action.event_action_id) }];
      }),
    );
  }

  // What each ride wore off the Tracked Actions whose current cycle it belongs to, by ride id. Derived
  // from the reading as it stands now, rewound by every ride after it (ADR 0026).
  async getWoreOff(userId: number, rides: WearRide[]): Promise<Map<number, Response_WoreOffLineDto[]>> {
    const dated = rides.filter(isDated);
    if (dated.length === 0) return new Map();

    // An Archived Bike has no Tracked Actions, so its rides wore nothing off.
    const bikes = await this.prisma.bikes.findMany({
      where: { ...ownedBikesWhere(userId), id: { in: [...new Set(dated.map((ride) => ride.bike_id))] } },
      select: { id: true },
    });
    if (bikes.length === 0) return new Map();

    const [intervals, parts] = await this.loadTracking({ in: bikes.map((bike) => bike.id) });
    const cycles = currentCycles(parts, intervals);
    const stored = (await this.ridesFrom(firstCounted(dated, cycles))).filter(isDated);

    return new Map(dated.map((ride) => [ride.id, woreOffBy(ride, cycles, stored)]));
  }

  // The owner's own Service Interval for one Tracked Action, or null to put the bike's plan
  // back. Only the number is theirs - the axis follows the part's type (ADR 0033).
  async setTrackedActionInterval(
    componentMountedId: number,
    eventActionId: number,
    userId: number,
    intervalOverride: number | null,
  ): Promise<Response_TrackedActionDto> {
    if (intervalOverride !== null && intervalOverride <= 0) {
      throw new BadRequestException('A Service Interval must be greater than zero');
    }

    const { bikeId } = await this.requireTrackedAction(componentMountedId, eventActionId, userId);

    await this.writeSettings(componentMountedId, eventActionId, { interval_override: intervalOverride });

    // A new interval moves the reading, so it moves the band with it: a longer one re-arms
    // the next crossing, a shorter one may be that crossing. Raising it is what an owner
    // who wants to be told later does, so it has to be able to quiet the reading.
    await this.evaluateBike(bikeId, userId);

    return await this.readTrackedAction(bikeId, componentMountedId, eventActionId);
  }

  // Whether one Tracked Action may announce itself. False stops the push and nothing else.
  async setTrackedActionNotify(
    componentMountedId: number,
    eventActionId: number,
    userId: number,
    notify: boolean,
  ): Promise<Response_TrackedActionDto> {
    const { bikeId } = await this.requireTrackedAction(componentMountedId, eventActionId, userId);

    await this.writeSettings(componentMountedId, eventActionId, { notify });

    // No evaluation: muting moves no reading, and the band went on moving under the mute -
    // so unmuting is quiet and the next genuine crossing is the one that announces.
    return await this.readTrackedAction(bikeId, componentMountedId, eventActionId);
  }

  // The day the owner means to do one Tracked Action (YYYY-MM-DD), or null to remove the plan (ADR 0038).
  async setTrackedActionPlan(
    componentMountedId: number,
    eventActionId: number,
    userId: number,
    plannedFor: string | null,
  ): Promise<Response_TrackedActionDto> {
    const day = plannedFor === null ? null : plannedDay(plannedFor);
    const { bikeId } = await this.requireTrackedAction(componentMountedId, eventActionId, userId);

    await this.writeSettings(componentMountedId, eventActionId, {
      planned_for: day,
      planned_at: day === null ? null : new Date(),
    });

    // No evaluation: a plan moves no reading, so it crosses no band and announces nothing.
    return await this.readTrackedAction(bikeId, componentMountedId, eventActionId);
  }

  // Announcements, run at the end of every write that moves an input Service Tracking
  // reads - a ride, a Service, a Replacement, a corrected accumulator, a changed interval.
  // Every one of those axes moves only through a write the app itself makes, so there is no
  // scheduler and nothing to poll.
  //
  // One rule covers all of them: `reached_threshold` is moved to whichever band the
  // reading now falls in, up or down. A move up - to 70, 95, 100 or any ten above it -
  // announces. A move down - which is what a Service, a Replacement or a lengthened
  // interval produces - is silent, and by lowering the band it re-arms the next crossing.
  async evaluateBike(bikeId: number, userId: number): Promise<void> {
    // An Archived Bike stays put away: it produces no readings, so it announces nothing.
    const bike = await this.prisma.bikes.findFirst({
      where: ownedBikeWhere(bikeId, userId),
      select: { id: true, bike_brand: true, bike_model: true, year: true },
    });
    if (!bike) return;

    const [intervals, parts] = await this.loadTracking(bikeId);

    const stored = announcedBands(parts);
    const evaluated = trackedActions(parts, intervals).map((action) => moved(action, stored));
    const crossings = evaluated.filter((reading) => reading.crossed);
    const announcedAt = new Date();

    await Promise.all(
      // A reading in the quiet band with no row of its own has nothing to record that the
      // absent row does not already say.
      evaluated
        .filter((reading) => reading.band !== 0 || reading.stored !== undefined)
        .map((reading) => this.writeBand(reading, reading.crossed ? announcedAt : null)),
    );

    // At most one notification per bike per evaluation, however many Tracked Actions
    // crossed in it: syncing a month of rides must not fire a dozen pushes.
    if (crossings.length === 0) return;

    // A crossing is what makes the app speak; what it then says is where the bike stands.
    // An action announced last week is still an action waiting, so it is counted too -
    // one line has to size the job, not only report the last thing to move.
    const overdue = countAt(evaluated, 'overdue');
    const due = countAt(evaluated, 'critical');
    const soon = countAt(evaluated, 'warning');

    await this.notificationService.create({
      userId,
      type: 'maintenance_due',
      payload: {
        bikeId,
        bikeName: [bike.bike_brand, bike.bike_model, bike.year].filter(Boolean).join(' '),
        soonCount: soon,
        dueCount: due,
        overdueCount: overdue,
        // The worst band the bike stands in, which names the notification and colours it.
        level: overdue > 0 ? 'overdue' : due > 0 ? 'critical' : 'warning',
        // What just moved, worst first - the line names the worst of them and counts the
        // rest, so the sort is what decides which one gets named.
        crossed: worstFirst(crossings.map(({ action }) => action)).map((action) => ({
          componentKey: action.component_type_i18n_key,
          componentName: action.component_type,
          actionKey: action.action_i18n_key,
          actionName: action.action_name,
          percentage: action.percentage,
          componentMountedId: action.component_mounted_id,
          actionId: action.event_action_id,
          groupId: action.component_group_id,
        })),
      },
    });
  }

  // The same, for a write that touched several bikes - a backfill of pending rides spread
  // across the garage. Each bike is still evaluated once, so each sends at most one.
  async evaluateBikes(bikeIds: number[], userId: number): Promise<void> {
    for (const bikeId of new Set(bikeIds)) {
      await this.evaluateBike(bikeId, userId);
    }
  }

  // What every write asks first: whose bike carries this part, is it still on it, and is the
  // pairing a Tracked Action at all. Answers with the bike it is on.
  private async requireTrackedAction(
    componentMountedId: number,
    eventActionId: number,
    userId: number,
  ): Promise<{ bikeId: number }> {
    // One question answers the ownership: whose bike carries this part, and is it still on it.
    const bike = await this.prisma.bikes.findFirst({
      where: { ...ownedBikesWhere(userId), components_mounted: { some: { id: componentMountedId, ...MOUNTED } } },
      select: { id: true },
    });
    if (!bike) {
      throw new NotFoundException(`Tracked Action on component ${componentMountedId} not found`);
    }

    const [intervals, parts] = await this.loadTracking(bike.id);
    const part = parts.find((row) => row.id === componentMountedId);
    const interval = intervals.find((row) => row.event_actions_id === eventActionId);

    // A pairing the bike keeps no Service Interval for, or one this kind of part is not a
    // target of, is not a Tracked Action at all - so there is nothing to write.
    if (part === undefined || interval === undefined || !targets(interval).has(part.component_type_id)) {
      throw new NotFoundException(`Tracked Action ${componentMountedId}:${eventActionId} not found`);
    }

    if (worstAxis(part, interval) === null) {
      throw new NotFoundException(`Tracked Action ${componentMountedId}:${eventActionId} has no Service Interval`);
    }

    return { bikeId: bike.id };
  }

  // What a write answers with: the Tracked Action read the way every other caller reads it,
  // so what the tap returns and what the next page load shows can never disagree.
  private async readTrackedAction(
    bikeId: number,
    componentMountedId: number,
    eventActionId: number,
  ): Promise<Response_TrackedActionDto> {
    const updated = (await this.readBike(bikeId)).find(
      (row) => row.component_mounted_id === componentMountedId && row.event_action_id === eventActionId,
    );
    if (updated === undefined) {
      throw new NotFoundException(`Tracked Action ${componentMountedId}:${eventActionId} not found`);
    }

    return updated;
  }

  // The settings a pairing carries, written whether it has a row yet or not. Only what the
  // caller names: the announced band is never written from here.
  private async writeSettings(
    componentMountedId: number,
    eventActionId: number,
    settings: {
      interval_override?: number | null;
      notify?: boolean;
      planned_for?: Date | null;
      planned_at?: Date | null;
    },
  ): Promise<void> {
    const pair = { component_mounted_id: componentMountedId, event_actions_id: eventActionId };

    await this.prisma.tracked_action_state.upsert({
      where: { component_mounted_id_event_actions_id: pair },
      create: { ...pair, ...settings },
      update: settings,
    });
  }

  // Every Tracked Action on one bike as it stands, in no particular order. Whose bike it is
  // and whether it is archived are the caller's question, not this one's.
  private async readBike(bikeId: number): Promise<Response_TrackedActionDto[]> {
    const [intervals, parts] = await this.loadTracking(bikeId);

    return trackedActions(parts, intervals, await this.descentRates(intervals));
  }

  // Each bike's descent rate, read only for bikes that plan anything on the health index.
  private async descentRates(intervals: TrackedInterval[]): Promise<DescentRates> {
    const bikeIds = [
      ...new Set(intervals.filter((row) => row.health_index_interval !== null).map((row) => row.bike_id)),
    ];

    return new Map(
      await Promise.all(
        bikeIds.map(
          async (bikeId): Promise<[number, number | null]> => [bikeId, descentRate(await this.rateRides(bikeId))],
        ),
      ),
    );
  }

  // The bike's latest rides that know their descent time; older imports have none.
  private async rateRides(bikeId: number): Promise<RateRide[]> {
    return await this.prisma.rides.findMany({
      where: { bike_id: bikeId, is_deleted: { not: true }, descent_min: { not: null } },
      orderBy: [{ started_at: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      take: LATEST_RIDES_FOR_RATE,
      select: { health_index_brake_pad: true, descent_min: true },
    });
  }

  // The band this Tracked Action now stands in, written whether it moved or not, so the
  // stored band is always the one the current reading falls in. The timestamp is only
  // touched when something was actually announced.
  private async writeBand(reading: Moved, announcedAt: Date | null): Promise<void> {
    const pair = {
      component_mounted_id: reading.action.component_mounted_id,
      event_actions_id: reading.action.event_action_id,
    };

    await this.prisma.tracked_action_state.upsert({
      where: { component_mounted_id_event_actions_id: pair },
      create: { ...pair, reached_threshold: reading.band, announced_at: announcedAt },
      update: { reached_threshold: reading.band, ...(announcedAt === null ? {} : { announced_at: announcedAt }) },
    });
  }

  // The plans and the parts, which are the two halves of every Tracked Action. Loaded
  // together by every read, for one bike or for a whole garage.
  private async loadTracking(bikeId: number | { in: number[] }): Promise<[TrackedInterval[], TrackedPart[]]> {
    return await Promise.all([
      this.prisma.bike_service_interval.findMany({ where: { bike_id: bikeId }, include: trackedIntervalInclude }),
      this.prisma.components_mounted.findMany({ where: { bike_id: bikeId, ...MOUNTED }, include: trackedPartInclude }),
    ]);
  }

  // Each bike's rides from the one given on, once: every ride after a page ride is what rewinds it.
  private async ridesFrom(first: Map<number, Date>): Promise<WearRide[]> {
    if (first.size === 0) return [];

    return await this.prisma.rides.findMany({
      where: {
        is_deleted: { not: true },
        OR: [...first].map(([bikeId, from]) => ({ bike_id: bikeId, started_at: { gte: from } })),
      },
      select: wearRideSelect,
    });
  }
}

// How many lines one ride shows: the Tracked Actions it pushed closest to due, not every one it touched.
const WORE_OFF_LINES = 3;

type DatedRide = WearRide & { started_at: Date };

// One Tracked Action and the moment its current cycle began; only a ride after it counts.
interface Cycle {
  action: Response_TrackedActionDto;
  startsAfter: Date;
}

// A ride with no start belongs to no cycle, so nothing about it is guessed.
function isDated(ride: WearRide): ride is DatedRide {
  return ride.started_at !== null;
}

// Every Tracked Action on these parts with the start of its current cycle. A part with no
// mount date has no known start, so none of its Tracked Actions claims any ride.
function currentCycles(parts: TrackedPart[], intervals: TrackedInterval[]): Cycle[] {
  return parts.flatMap((part) =>
    trackedActions([part], intervals).flatMap((action) => {
      const startsAfter = cycleStart(part, action);
      return startsAfter === null ? [] : [{ action, startsAfter }];
    }),
  );
}

// The end of the day of the latest Service recording the Action, else of the mounting - the moment the
// Wear Baseline freezes at (ADR 0001). A wear index has no baseline, so it counts from the mounting.
function cycleStart(part: TrackedPart, action: Response_TrackedActionDto): Date | null {
  const serviced =
    action.axis === 'health_index'
      ? null
      : (latestBaseline(part, action.event_action_id)?.event_actions_done.events_bikes.service_date ?? null);
  const from = serviced ?? part.mounted_at;

  return from === null ? null : endOfDay(from);
}

// A Service Date is a day, so a ride on it counts as ridden before the work.
export function endOfDay(day: Date): Date {
  const end = new Date(day);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

// Per bike, the earliest ride that falls in any of its cycles; nothing before it is ever summed.
function firstCounted(rides: DatedRide[], cycles: Cycle[]): Map<number, Date> {
  const first = new Map<number, Date>();
  for (const ride of rides.filter((one) => cycles.some((cycle) => inCycle(one, cycle)))) {
    const known = first.get(ride.bike_id);
    if (known === undefined || ride.started_at < known) first.set(ride.bike_id, ride.started_at);
  }
  return first;
}

function inCycle(ride: DatedRide, { action, startsAfter }: Cycle): boolean {
  return ride.bike_id === action.bike_id && ride.started_at > startsAfter;
}

// One ride's lines: each Tracked Action whose cycle it belongs to and added wear to, closest to due first.
function woreOffBy(ride: DatedRide, cycles: Cycle[], stored: DatedRide[]): Response_WoreOffLineDto[] {
  const later = stored.filter((other) => other.bike_id === ride.bike_id && riddenAfter(other, ride));

  return cycles
    .filter((cycle) => inCycle(ride, cycle))
    .map(({ action }) => woreOffLine(action, ride, later))
    .filter((line) => line.amount > 0)
    .sort(closestToDue)
    .slice(0, WORE_OFF_LINES);
}

// Two rides started at the same moment are told apart by which was stored last.
function riddenAfter(other: DatedRide, ride: DatedRide): boolean {
  const byStart = other.started_at.getTime() - ride.started_at.getTime();
  return byStart === 0 ? other.id > ride.id : byStart > 0;
}

// The reading as it stood when the ride ended - today's minus every ride after it - and
// before the ride began. Floored and clamped the way the reading itself is.
function woreOffLine(action: Response_TrackedActionDto, ride: DatedRide, later: DatedRide[]): Response_WoreOffLineDto {
  const wear = RIDE_WEAR[action.measure];
  const amount = wear(ride);
  const atEnd = action.current - later.reduce((total, other) => total + wear(other), 0);

  return {
    component_mounted_id: action.component_mounted_id,
    event_action_id: action.event_action_id,
    component_type: action.component_type,
    component_type_i18n_key: action.component_type_i18n_key,
    position: action.position,
    action_name: action.action_name,
    action_i18n_key: action.action_i18n_key,
    replace_action: action.replace_action,
    measure: action.measure,
    amount: Math.round(amount),
    before: wholePercent(atEnd - amount, action.interval),
    after: wholePercent(atEnd, action.interval),
  };
}

function wholePercent(wear: number, interval: number): number {
  return Math.floor((Math.max(0, wear) / interval) * 100);
}

// Highest after first, then the biggest gain; the part and the action keep a tie stable.
function closestToDue(one: Response_WoreOffLineDto, other: Response_WoreOffLineDto): number {
  return (
    other.after - one.after ||
    other.after - other.before - (one.after - one.before) ||
    one.component_mounted_id - other.component_mounted_id ||
    one.event_action_id - other.event_action_id
  );
}

// Where one Tracked Action now stands against what was last announced for it.
interface Moved {
  action: Response_TrackedActionDto;
  band: number;
  // Absent when the pairing has no row yet, which is not the same as a row reading 0.
  stored: number | undefined;
  crossed: boolean;
}

// How many Tracked Actions stand at one Attention Level right now. Counted by level and
// not by band: past 100 one level spreads over every band above it, so counting bands
// would report a chain at 132% as neither overdue nor anything else.
function countAt(readings: Moved[], level: AttentionLevel): number {
  return readings.filter((reading) => reading.action.level === level).length;
}

// A move up into a band worth interrupting for is the only thing that announces. A
// backfill of a whole season lands in the band it ends in, so the thresholds it blew past
// on the way are not announced one by one.
//
// A muted pairing never crosses, so it never announces - but its band still moves below,
// which is what keeps unmuting quiet rather than a backlog (ADR 0033).
function moved(action: Response_TrackedActionDto, storedBands: Map<string, number>): Moved {
  const band = reachedBand(action.percentage);
  const stored = storedBands.get(pairKey(action.component_mounted_id, action.event_action_id));

  return { action, band, stored, crossed: action.notify && announces(band) && band > (stored ?? 0) };
}

// What has already been announced for each pairing. A pairing with no row has been
// announced nothing, which is the same as band 0 - but the two are told apart, because a
// row that does not exist yet and does not need to exist is not written.
function announcedBands(parts: TrackedPart[]): Map<string, number> {
  return new Map(
    parts.flatMap((part) =>
      part.tracked_action_state.map((state): [string, number] => [
        pairKey(part.id, state.event_actions_id),
        state.reached_threshold,
      ]),
    ),
  );
}

// One Tracked Action is a part and an action (ADR 0027), which is what identifies its row.
function pairKey(componentMountedId: number, eventActionId: number): string {
  return `${componentMountedId}:${eventActionId}`;
}

// Every pairing of these parts with these plans, each read as it stands. A plan belongs to
// one bike, so a bike's parts are only ever read against that bike's own intervals.
function trackedActions(
  parts: TrackedPart[],
  intervals: TrackedInterval[],
  // Only the reads a client sees load rates; without them no descent left is estimated.
  rates: DescentRates = new Map(),
): Response_TrackedActionDto[] {
  return parts.flatMap((part) =>
    intervals
      .filter((interval) => interval.bike_id === part.bike_id && targets(interval).has(part.component_type_id))
      .map((interval) => toTrackedAction(part, interval, rates.get(part.bike_id) ?? null))
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
function toTrackedAction(
  part: TrackedPart,
  interval: TrackedInterval,
  descentRate: number | null,
): Response_TrackedActionDto | null {
  const reading = worstAxis(part, interval);
  if (reading === null) return null;

  const state = stateFor(part, interval.event_actions_id);

  return {
    bike_id: part.bike_id,
    component_mounted_id: part.id,
    component_type_id: part.component_type_id,
    // The Component Category the part sits in - what a link into the service wizard names.
    component_group_id: part.component_types.component_group_id,
    component_type: part.component_types.component_type,
    component_type_i18n_key: part.component_types.i18n_key,
    component_desc: part.component_desc,
    position: part.position,
    event_action_id: interval.event_actions_id,
    action_name: interval.events_action.action_name,
    action_i18n_key: interval.events_action.i18n_key,
    axis: reading.axis,
    measure: reading.measure,
    current: reading.current,
    interval: reading.interval,
    percentage: reading.percentage,
    level: attentionLevel(reading.percentage),
    default_interval: reading.planned,
    interval_override: reading.override,
    // A pairing with no row of its own has never been muted, which is what announcing by
    // default means.
    notify: state?.notify ?? true,
    mounted_at: part.mounted_at,
    planned_for: livePlan(part, interval.event_actions_id),
    replace_action: interval.events_action.replace_action,
    remaining_descent_min: remainingDescentMin(reading, descentRate),
  };
}

// Too few rides or minutes give a pace that swings ride to ride; no wear gives no pace to count down at.
function descentRate(rides: RateRide[]): number | null {
  const minutes = rides.reduce((total, ride) => total + (ride.descent_min ?? 0), 0);
  const index = rides.reduce((total, ride) => total + (ride.health_index_brake_pad ?? 0), 0);
  if (rides.length < MIN_RATE_RIDES || minutes < MIN_RATE_DESCENT_MIN || index <= 0) return null;

  return index / minutes;
}

// Rounded down like the percentage: less left is the safe side. Once due, the percentage already says so.
function remainingDescentMin(reading: Reading, rate: number | null): number | null {
  if (reading.axis !== 'health_index' || rate === null || reading.current >= reading.interval) return null;

  return Math.floor((reading.interval - reading.current) / rate);
}

// The state row one pairing keeps, or undefined where it has never needed one.
function stateFor(part: TrackedPart, eventActionId: number): TrackedPart['tracked_action_state'][number] | undefined {
  return part.tracked_action_state.find((row) => row.event_actions_id === eventActionId);
}

// The axis the bike's interval row fills in. Where it fills in more than one, the part is
// due when the first of its measures says so, so the highest percentage wins.
function worstAxis(part: TrackedPart, interval: TrackedInterval): Reading | null {
  const state = stateFor(part, interval.event_actions_id);
  const frozen = latestBaseline(part, interval.event_actions_id);

  const wear = wearColumns(part, frozen);

  // What each axis is measured against, where the bike's plan fills one in.
  const planned: Record<WearAxis, number | null> = {
    km: interval.service_interval_km,
    min: interval.service_interval_min,
    health_index: interval.health_index_interval,
  };

  const readings = AXIS_ORDER.map((axis) => readingOn(axis, planned[axis], null, wear[axis])).filter(
    (reading): reading is Reading => reading !== null,
  );

  if (readings.length === 0) return null;

  // Which axis is read is the bike's plan's to decide, never the override's (ADR 0033) - so
  // the worst is found on the plan, and the override then replaces the value on that axis.
  const worst = readings.reduce((one, other) => (other.percentage > one.percentage ? other : one));
  const override = state?.interval_override ?? null;
  if (override === null) return worst;

  return readingOn(worst.axis, planned[worst.axis], override, wear[worst.axis]) ?? worst;
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
      ? { measure: 'drivetrain_km', accumulator: part.drivetrain_km, baseline: frozen?.drivetrain_km_at_time }
      : { measure: 'total_km', accumulator: part.total_km, baseline: frozen?.km_at_time },
    min: SUSPENSION_TYPES.has(type)
      ? { measure: 'suspension_min', accumulator: part.suspension_min, baseline: frozen?.suspension_min_at_time }
      : { measure: 'total_time_min', accumulator: part.total_time_min, baseline: frozen?.time_min_at_time },
    health_index: { measure: 'health_index', accumulator: part.health_index, baseline: 0 },
  };
}

// The three axes a Tracked Action can be read on, in the order they are read in.
const AXIS_ORDER = ['km', 'min', 'health_index'] as const satisfies readonly WearAxis[];

// One axis, or null where the bike keeps no interval on it. Never capped: 132% reads as
// 132%. Reported in whole percent, which is what the bands are drawn in - so the number on
// screen and the colour behind it can never disagree. Rounded down, never up: 99.6% of the
// way to due is not yet due, and must not read as 100%.
// The plan says whether an axis is read at all; the override only replaces its value.
function readingOn(axis: WearAxis, planned: number | null, override: number | null, wear: Wear): Reading | null {
  if (planned === null) return null;

  const interval = override ?? planned;
  if (interval <= 0) return null;

  // A baseline above the accumulator is a part whose wear was corrected downwards, not
  // wear owed back.
  const current = Math.max(0, (wear.accumulator ?? 0) - (wear.baseline ?? 0));

  return {
    axis,
    measure: wear.measure,
    current,
    interval,
    percentage: Math.floor((current / interval) * 100),
    planned,
    override,
  };
}

// The Wear Baseline for one action on one part: what the most recent recording of that job
// froze. A deleted Service is no longer part of the record, so it holds no baseline either
// - the same rule the build dates a part by. None means the reading starts from zero, so
// the mileage entered when a used part was added counts as wear.
function latestBaseline(part: TrackedPart, eventActionId: number): Baseline | null {
  const recorded = recordingsOf(part, eventActionId);

  if (recorded.length === 0) return null;

  return recorded.reduce((latest, junction) => (recordedLater(junction, latest) ? junction : latest));
}

// Every recording of one action on one part that is still on record.
function recordingsOf(part: TrackedPart, eventActionId: number): Baseline[] {
  return part.action_done_component_map.filter(
    (junction) =>
      junction.event_actions_done.event_action_id === eventActionId &&
      junction.event_actions_done.events_bikes.is_deleted !== true,
  );
}

// The planned day while the plan stands; worked out on read, so no Service write touches it (ADR 0026).
function livePlan(part: TrackedPart, eventActionId: number): string | null {
  const state = stateFor(part, eventActionId);
  if (!state?.planned_for || !state.planned_at) return null;

  const plannedAt = state.planned_at;
  const ended = recordingsOf(part, eventActionId).some((junction) => recordedSince(junction, plannedAt));
  return ended ? null : utcDay(state.planned_for);
}

// Whether a recording falls after the plan was set: a later UTC day, or the same day written later
// (the Wear Baseline's tie-break). A Service with no date ends nothing.
function recordedSince(junction: Baseline, plannedAt: Date): boolean {
  const { service_date: serviceDate, created_at: createdAt } = junction.event_actions_done.events_bikes;
  if (serviceDate === null) return false;

  const serviceDay = utcDay(serviceDate);
  const planDay = utcDay(plannedAt);
  if (serviceDay !== planDay) return serviceDay > planDay;
  return createdAt !== null && createdAt > plannedAt;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A plan's day as the DATE column holds it: midnight UTC. Refuses a day that does not exist or has passed.
function plannedDay(day: string): Date {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (!DAY_PATTERN.test(day) || Number.isNaN(parsed.getTime()) || utcDay(parsed) !== day) {
    throw new BadRequestException(`${day} is not a day`);
  }
  if (day < utcDay(new Date())) {
    throw new BadRequestException('A plan cannot be for a day that has passed');
  }
  return parsed;
}

// A moment's day in UTC, as YYYY-MM-DD - which also sorts as text.
function utcDay(moment: Date): string {
  return moment.toISOString().slice(0, 10);
}

// An undated latest Service stays unknown: the mounting would count wear it already reset.
function wearBaselineAt(part: TrackedPart, eventActionId: number): Date | null {
  const latest = latestBaseline(part, eventActionId);
  return latest === null ? part.mounted_at : latest.event_actions_done.events_bikes.service_date;
}

// Later work wins. The date on a Service carries no time, so two done on the same day are
// told apart by which entered the record last.
function recordedLater(candidate: Baseline, than: Baseline): boolean {
  const byDay = servicedAt(candidate) - servicedAt(than);
  if (byDay !== 0) return byDay > 0;
  return recordedAt(candidate) > recordedAt(than);
}

// When the work behind a baseline happened. An undated Service is the oldest there is, so
// a dated one always wins over it.
function servicedAt(junction: Baseline): number {
  return junction.event_actions_done.events_bikes.service_date?.getTime() ?? 0;
}

// When the Service behind a baseline was written down.
function recordedAt(junction: Baseline): number {
  return junction.event_actions_done.events_bikes.created_at?.getTime() ?? 0;
}
