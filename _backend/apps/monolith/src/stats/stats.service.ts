import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ownedBikesWhere } from '../bike/owned-bike.where';
import { colorIndexes } from '../bike/color-index';
import { serviceDateInPeriod } from '../bike-event/bike-event.service';
import { isoDay } from '../ai-chat/tools/tool-dates';
import { Response_SpendBikeDto, Response_SpendCategoryDto, Response_SpendDto } from './dto/response-spend';
import { Response_DistanceBikeDto, Response_DistanceDto } from './dto/response-distance';
import {
  Response_WearForecastDto,
  Response_WearForecastItemDto,
  Response_WearPointDto,
} from './dto/response-wear-forecast';
import { GarageReading, ServiceTrackingService } from '../service-tracking/service-tracking.service';
import { RIDE_WEAR, wearRideSelect, type WearRide } from '../service-tracking/ride-wear';

// A Service's money follows its Actions' Component Category: the part types an Action
// targets, or a catch-all Replacement's own category (ADR 0022).
const spendSelect = {
  total_cost: true,
  bikes: { select: { id: true, bike_brand: true, bike_model: true, year: true } },
  event_actions_done: {
    select: {
      partial_cost: true,
      events_action: {
        select: {
          component_group_id: true,
          event_action_targets: { select: { component_types: { select: { component_group_id: true } } } },
        },
      },
    },
  },
} satisfies Prisma.events_bikesSelect;

type SpendService = Prisma.events_bikesGetPayload<{ select: typeof spendSelect }>;
type SpendBike = NonNullable<SpendService['bikes']>;

// Whole cents per Component Category id, so a split adds up exactly; null is what no
// category could be given.
type Split = Map<number | null, number>;

interface BikeSpend {
  bike: SpendBike;
  split: Split;
}

// Days of Service Date, both inclusive; null is an open end.
interface ServiceWindow {
  from: string | null;
  to: string | null;
}

const TOP_CATEGORIES = 3;

const distanceSelect = {
  bike_id: true,
  started_at: true,
  distance_m: true,
  duration_min: true,
} satisfies Prisma.ridesSelect;
type DistanceRide = Prisma.ridesGetPayload<{ select: typeof distanceSelect }>;

const garageSelect = { id: true, bike_brand: true, bike_model: true, year: true } satisfies Prisma.bikesSelect;
type ColoredBike = Prisma.bikesGetPayload<{ select: typeof garageSelect }> & { color_index: number };

// UTC midnights, both days inclusive.
interface DayWindow {
  from: Date;
  to: Date;
}

interface BikeRides {
  daily_m: number[];
  ride_count: number;
  time_min: number;
}

// The Periods Home reads its figures over.
export const PERIODS = ['month', 'year', 'all'] as const;
export type Period = (typeof PERIODS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const PACE_WEEKS = 4;
const FORECAST_ITEMS = 5;

// Kept together so only the 5 soonest pay for rebuilding their curve.
interface Projection {
  reading: GarageReading;
  rides: WearRide[];
  pace: number;
  projectedAt: Date | null;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceTracking: ServiceTrackingService,
  ) {}

  async getSpend(userId: number, period?: string): Promise<Response_SpendDto> {
    const asked = periodOf(period);
    const [[window, services], user] = await Promise.all([
      asked === undefined ? this.spendOrLastYear(userId) : this.spendOver(userId, asked),
      this.prisma.users.findUnique({ where: { id: userId }, select: { currency: true } }),
    ]);

    const bikes = splitByBike(services);
    const garage = sumSplits(bikes.map((entry) => entry.split));
    const top = topCategories(garage);
    const categories = await this.namedCategories(top, garage);

    return {
      ...window,
      currency: user?.currency ?? null,
      total: units(sum([...garage.values()])),
      categories,
      bikes: bikeRows(bikes),
    };
  }

  async getDistance(userId: number, period?: string): Promise<Response_DistanceDto> {
    const asked = periodOf(period);
    const [bikes, colors] = await Promise.all([
      this.prisma.bikes.findMany({ where: ownedBikesWhere(userId), select: garageSelect }),
      colorIndexes(this.prisma, userId),
    ]);
    const garage = bikes.map((bike) => ({ ...bike, color_index: colors.get(bike.id) ?? 0 }));
    const today = utcDay(new Date());

    return asked === undefined
      ? this.distanceOrLastYear(userId, garage, today)
      : this.distanceOver(userId, asked, garage, today);
  }

  // All time begins on the day of the earliest dated ride, or today when there is none.
  private async distanceOver(
    userId: number,
    period: Period,
    garage: ColoredBike[],
    today: Date,
  ): Promise<Response_DistanceDto> {
    if (period === 'all') {
      const rides = await this.ridesSince(userId);
      return distanceOf({ from: earliestDay(rides, today), to: today }, rides, garage);
    }
    const from = period === 'month' ? monthStart(today) : yearStart(today.getUTCFullYear());
    return distanceOf({ from, to: today }, await this.ridesSince(userId, from), garage);
  }

  // The phone's card asks for no Period: last year while this one draws nothing, so it is not blank all January.
  private async distanceOrLastYear(userId: number, garage: ColoredBike[], today: Date): Promise<Response_DistanceDto> {
    const thisYear = { from: yearStart(today.getUTCFullYear()), to: today };
    const current = distanceOf(thisYear, await this.ridesSince(userId, thisYear.from), garage);
    if (drawn(current)) return current;

    const lastYear = { from: yearStart(today.getUTCFullYear() - 1), to: new Date(thisYear.from.getTime() - DAY_MS) };
    const previous = distanceOf(lastYear, await this.ridesSince(userId, lastYear.from, thisYear.from), garage);
    return drawn(previous) ? previous : current;
  }

  // Bucketed in UTC, so the edges are UTC too. Open-ended up to today, so a ride stamped later
  // still counts - on today. A ride with no start belongs to no day, so to no Period.
  private async ridesSince(userId: number, from?: Date, before?: Date): Promise<DistanceRide[]> {
    return this.prisma.rides.findMany({
      where: {
        is_deleted: { not: true },
        bikes: ownedBikesWhere(userId),
        started_at: {
          not: null,
          ...(from === undefined ? {} : { gte: from }),
          ...(before === undefined ? {} : { lt: before }),
        },
      },
      select: distanceSelect,
    });
  }

  // Open-ended, as Home asks History Totals for the same Period, so the two totals agree.
  private async spendOver(userId: number, period: Period): Promise<[ServiceWindow, SpendService[]]> {
    const now = new Date();
    const from: Record<Period, string | null> = {
      month: localDay(now.getFullYear(), now.getMonth(), 1),
      year: localDay(now.getFullYear(), 0, 1),
      all: null,
    };
    const window = { from: from[period], to: null };
    return [window, await this.servicesIn(userId, window)];
  }

  // The phone's card asks for no Period: this year, or last year while this one has nothing
  // priced, so it is not blank all January.
  private async spendOrLastYear(userId: number): Promise<[ServiceWindow, SpendService[]]> {
    const year = new Date().getFullYear();
    const current = yearWindow(year);
    const services = await this.servicesIn(userId, current);
    if (spent(services) > 0) return [current, services];

    const previous = yearWindow(year - 1);
    const earlier = await this.servicesIn(userId, previous);
    return spent(earlier) > 0 ? [previous, earlier] : [current, services];
  }

  // The Services History Totals counts for the same Period: archived bikes and deleted
  // Services left out (ADR 0024), dated by the history's own Period rule.
  private async servicesIn(userId: number, window: ServiceWindow): Promise<SpendService[]> {
    return this.prisma.events_bikes.findMany({
      where: {
        is_deleted: { not: true },
        bikes: ownedBikesWhere(userId),
        ...serviceDateInPeriod(window.from ?? undefined, window.to ?? undefined),
      },
      select: spendSelect,
    });
  }

  // A slice worth nothing is left out, so the legend never shows a 0 %.
  private async namedCategories(top: number[], garage: Split): Promise<Response_SpendCategoryDto[]> {
    const categories = await this.prisma.component_groups.findMany({
      where: { id: { in: top } },
      select: { id: true, group_name: true, i18n_key: true },
    });
    const named = new Map(categories.map((category) => [category.id, category]));

    const rows: Response_SpendCategoryDto[] = top.map((id) => ({
      key: `group:${id}`,
      component_group_id: id,
      group_name: named.get(id)?.group_name ?? null,
      i18n_key: named.get(id)?.i18n_key ?? null,
      amount: units(garage.get(id) ?? 0),
    }));
    const other = sum([...garage].filter(([id]) => id !== null && !top.includes(id)).map(([, amount]) => amount));
    const folded = [
      { key: 'other', amount: other },
      { key: 'unassigned', amount: garage.get(null) ?? 0 },
    ].map(({ key, amount }) => ({
      key,
      component_group_id: null,
      group_name: null,
      i18n_key: null,
      amount: units(amount),
    }));

    return [...rows, ...folded].filter((row) => row.amount > 0);
  }

  async getWearForecast(userId: number): Promise<Response_WearForecastDto> {
    const now = new Date();
    const readings = await this.serviceTracking.getGarageReadings(userId);
    const rides = await this.wearRides(readings, now);

    const items = readings
      .map((reading) => projection(reading, rides, now))
      .sort(soonestFirst(now))
      .slice(0, FORECAST_ITEMS)
      .map((soonest) => forecastItem(soonest, now));
    return { items };
  }

  // Back to the earliest Wear Baseline, and at least the weeks the pace reads.
  private async wearRides(readings: GarageReading[], now: Date): Promise<WearRide[]> {
    if (readings.length === 0) return [];

    const baselines = readings.flatMap(({ wearBaselineAt }) =>
      wearBaselineAt === null ? [] : [wearBaselineAt.getTime()],
    );
    return this.prisma.rides.findMany({
      where: {
        is_deleted: { not: true },
        bike_id: { in: [...new Set(readings.map(({ action }) => action.bike_id))] },
        started_at: { gte: new Date(Math.min(paceFrom(now), ...baselines)) },
      },
      select: wearRideSelect,
    });
  }
}

function splitByBike(services: SpendService[]): BikeSpend[] {
  const bikes = new Map<number, BikeSpend>();
  for (const service of services) {
    if (service.bikes === null) continue;
    const entry = bikes.get(service.bikes.id) ?? { bike: service.bikes, split: new Map() };
    entry.split = sumSplits([entry.split, splitService(service)]);
    bikes.set(service.bikes.id, entry);
  }
  return [...bikes.values()];
}

// How one Service's total splits across categories. Work in one category takes the whole
// receipt; mixed work goes by the prices typed per Action, and the rest stays unassigned.
function splitService(service: SpendService): Split {
  const total = cents(service.total_cost);
  const categories = new Set(service.event_actions_done.map(categoryOf));
  const [only] = categories;
  if (categories.size === 1 && only !== null) return new Map([[only, total]]);

  const priced = sumSplits(
    service.event_actions_done.map((action): Split => new Map([[categoryOf(action), cents(action.partial_cost)]])),
  );
  priced.delete(null);

  const typed = sum([...priced.values()]);
  return typed > total ? shrunkTo(priced, total) : new Map([...priced, [null, total - typed]]);
}

// Prices above the receipt shrink together; the last takes the rounding, so the Service
// still adds up to its total to the cent.
function shrunkTo(priced: Split, total: number): Split {
  const typed = sum([...priced.values()]);
  const entries = [...priced];
  const shares = entries
    .slice(0, -1)
    .map(([id, amount]): [number | null, number] => [id, Math.round((amount * total) / typed)]);
  const [lastId] = entries[entries.length - 1];

  return new Map([...shares, [lastId, total - sum(shares.map(([, amount]) => amount))]]);
}

function categoryOf(action: SpendService['event_actions_done'][number]): number | null {
  const [target] = action.events_action.event_action_targets;
  return target?.component_types.component_group_id ?? action.events_action.component_group_id;
}

// Largest first; unassigned money is never one of them.
function topCategories(garage: Split): number[] {
  return [...garage]
    .filter((entry): entry is [number, number] => entry[0] !== null && entry[1] > 0)
    .sort(([idA, a], [idB, b]) => b - a || idA - idB)
    .slice(0, TOP_CATEGORIES)
    .map(([id]) => id);
}

function bikeRows(bikes: BikeSpend[]): Response_SpendBikeDto[] {
  return bikes
    .map(({ bike, split }) => ({
      bike_id: bike.id,
      bike_brand: bike.bike_brand,
      bike_model: bike.bike_model,
      year: bike.year,
      total: units(sum([...split.values()])),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || a.bike_id - b.bike_id);
}

function yearWindow(year: number): ServiceWindow {
  return { from: localDay(year, 0, 1), to: localDay(year, 11, 31) };
}

// A Service Date is the day the owner wrote down, so its Period is read in local time.
function localDay(year: number, month: number, day: number): string {
  return `${String(year)}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function spent(services: SpendService[]): number {
  return sum(services.map((service) => cents(service.total_cost)));
}

function cents(amount: Prisma.Decimal | null): number {
  return amount === null ? 0 : Math.round(Number(amount) * 100);
}

function units(cents: number): number {
  return cents / 100;
}

function sumSplits(splits: Split[]): Split {
  const total: Split = new Map();
  for (const split of splits) {
    for (const [id, amount] of split) total.set(id, (total.get(id) ?? 0) + amount);
  }
  return total;
}

function sum(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function yearStart(year: number): Date {
  return new Date(Date.UTC(year, 0, 1));
}

function monthStart(day: Date): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
}

// A Period Home knows, or none at all; anything else is the caller's mistake, not an empty chart.
function periodOf(value?: string): Period | undefined {
  if (value === undefined || isPeriod(value)) return value;
  throw new BadRequestException(`Unknown period: ${value}`);
}

function isPeriod(value: string): value is Period {
  return (PERIODS as readonly string[]).includes(value);
}

// getUTCDay counts from Sunday.
function mondayOf(date: Date): Date {
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - sinceMonday));
}

function distanceOf(window: DayWindow, rides: DistanceRide[], garage: ColoredBike[]): Response_DistanceDto {
  return { from: isoDay(window.from), to: isoDay(window.to), bikes: distanceRows(garage, ridesByBike(rides, window)) };
}

// Today at the latest, so a ride stamped ahead still leaves a window of one day.
function earliestDay(rides: DistanceRide[], today: Date): Date {
  const first = rides.reduce(
    (earliest, { started_at }) => (started_at === null ? earliest : Math.min(earliest, started_at.getTime())),
    today.getTime(),
  );
  return utcDay(new Date(first));
}

// Something to draw: a window whose rides all round to 0 km is as empty as one without rides.
function drawn(distance: Response_DistanceDto): boolean {
  return distance.bikes.some((bike) => bike.total_km > 0);
}

// Each bike's rides per UTC day of the window. A ride stamped after its last day lands on that
// day, so the days still add up to every metre ridden.
function ridesByBike(rides: DistanceRide[], window: DayWindow): Map<number, BikeRides> {
  const days = (window.to.getTime() - window.from.getTime()) / DAY_MS + 1;
  const byBike = new Map<number, BikeRides>();

  for (const ride of rides) {
    if (ride.started_at === null) continue;
    const day = Math.min(Math.floor((ride.started_at.getTime() - window.from.getTime()) / DAY_MS), days - 1);
    const entry = byBike.get(ride.bike_id) ?? { daily_m: new Array<number>(days).fill(0), ride_count: 0, time_min: 0 };
    entry.daily_m[day] += ride.distance_m ?? 0;
    entry.ride_count += 1;
    entry.time_min += ride.duration_min ?? 0;
    byBike.set(ride.bike_id, entry);
  }
  return byBike;
}

// Every bike ridden in the window, even for no distance. Summed in metres and rounded last, so
// the client's buckets add up to the same total.
function distanceRows(garage: ColoredBike[], ridden: Map<number, BikeRides>): Response_DistanceBikeDto[] {
  return garage
    .flatMap(({ id, bike_brand, bike_model, year, color_index }) => {
      const rides = ridden.get(id);
      if (rides === undefined) return [];
      return [
        {
          bike_id: id,
          bike_brand,
          bike_model,
          year,
          color_index,
          ...rides,
          total_km: Math.round(sum(rides.daily_m) / 1000),
        },
      ];
    })
    .sort((a, b) => b.total_km - a.total_km || a.bike_id - b.bike_id);
}

function paceFrom(now: Date): number {
  return now.getTime() - PACE_WEEKS * WEEK_MS;
}

// Only a part not yet due and still being ridden gets a date.
function projection(reading: GarageReading, garageRides: WearRide[], now: Date): Projection {
  const { bike_id, measure, current, interval, level } = reading.action;
  const rides = garageRides.filter((ride) => ride.bike_id === bike_id);
  const recent = rides.filter((ride) => startedAfter(ride, paceFrom(now)));
  const pace = sum(recent.map(RIDE_WEAR[measure])) / PACE_WEEKS;
  const projectedAt =
    level !== 'overdue' && pace > 0 ? new Date(now.getTime() + ((interval - current) / pace) * WEEK_MS) : null;

  return { reading, rides, pace, projectedAt };
}

// A tie goes to the worse reading.
function soonestFirst(now: Date): (a: Projection, b: Projection) => number {
  return (a, b) => runsOutAt(a, now) - runsOutAt(b, now) || b.reading.action.percentage - a.reading.action.percentage;
}

// Overdue runs out today; a part with no date sorts last.
function runsOutAt({ reading, projectedAt }: Projection, now: Date): number {
  if (reading.action.level === 'overdue') return now.getTime();
  return projectedAt?.getTime() ?? Number.POSITIVE_INFINITY;
}

function forecastItem({ reading, rides, pace, projectedAt }: Projection, now: Date): Response_WearForecastItemDto {
  return {
    ...reading.action,
    pace_per_week: pace > 0 ? pace : null,
    projected_date: projectedAt === null ? null : isoDay(projectedAt),
    points: wearPoints(reading, rides, now),
  };
}

// Rebuilt backwards: wear at a moment is today's minus every ride after it. Today is the reading itself.
function wearPoints({ action, wearBaselineAt }: GarageReading, rides: WearRide[], now: Date): Response_WearPointDto[] {
  const today = { date: isoDay(now), percentage: action.percentage };
  if (wearBaselineAt === null) return [today];

  const rideWear = RIDE_WEAR[action.measure];
  const wearAt = (cutoff: Date, labelDay: Date): Response_WearPointDto => {
    const since = sum(rides.filter((ride) => startedAfter(ride, cutoff.getTime())).map(rideWear));
    const percentage = Math.floor((Math.max(0, action.current - since) / action.interval) * 100);
    return { date: isoDay(labelDay), percentage };
  };

  const first = wearAt(wearBaselineAt, wearBaselineAt);
  // A week ends when the next Monday begins; dated by its Sunday, which may be the baseline's own day.
  const weekEnds = mondaysBetween(wearBaselineAt, now)
    .map((monday) => wearAt(monday, new Date(monday.getTime() - DAY_MS)))
    .filter((point) => point.date !== first.date);
  return [first, ...weekEnds, today];
}

function startedAfter(ride: WearRide, time: number): boolean {
  return ride.started_at !== null && ride.started_at.getTime() > time;
}

function mondaysBetween(from: Date, to: Date): Date[] {
  const mondays: Date[] = [];
  for (let monday = mondayOf(from).getTime() + WEEK_MS; monday <= to.getTime(); monday += WEEK_MS) {
    mondays.push(new Date(monday));
  }
  return mondays;
}
