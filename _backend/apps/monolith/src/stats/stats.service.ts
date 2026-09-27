import { Injectable } from '@nestjs/common';
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
import type { WearMeasure } from '../service-tracking/attention-level';

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

const TOP_CATEGORIES = 3;

const distanceSelect = { bike_id: true, started_at: true, distance_m: true } satisfies Prisma.ridesSelect;
type DistanceRide = Prisma.ridesGetPayload<{ select: typeof distanceSelect }>;

const garageSelect = { id: true, bike_brand: true, bike_model: true, year: true } satisfies Prisma.bikesSelect;
type ColoredBike = Prisma.bikesGetPayload<{ select: typeof garageSelect }> & { color_index: number };

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const wearRideSelect = {
  bike_id: true,
  started_at: true,
  distance_m: true,
  drivetrain_meters: true,
  duration_min: true,
  suspension_min: true,
  health_index_brake_pad: true,
} satisfies Prisma.ridesSelect;
type WearRide = Prisma.ridesGetPayload<{ select: typeof wearRideSelect }>;

// The ride columns strava.service.ts grows each accumulator by, so the curve rebuilds the same wear.
const RIDE_WEAR: Record<WearMeasure, (ride: WearRide) => number> = {
  total_km: (ride) => (ride.distance_m ?? 0) / 1000,
  drivetrain_km: (ride) => (ride.drivetrain_meters ?? 0) / 1000,
  total_time_min: (ride) => ride.duration_min ?? 0,
  suspension_min: (ride) => ride.suspension_min ?? 0,
  health_index: (ride) => ride.health_index_brake_pad ?? 0,
};

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

  async getSpend(userId: number, year?: number): Promise<Response_SpendDto> {
    const [[served, services], user] = await Promise.all([
      this.spendYear(userId, year),
      this.prisma.users.findUnique({ where: { id: userId }, select: { currency: true } }),
    ]);

    const bikes = splitByBike(services);
    const garage = sumSplits(bikes.map((entry) => entry.split));
    const top = topCategories(garage);
    const categories = await this.namedCategories(top, garage);

    return {
      year: served,
      currency: user?.currency ?? null,
      total: units(sum([...garage.values()])),
      categories,
      bikes: bikeRows(bikes),
    };
  }

  // Last year while this one draws no line, so the card is not blank all January.
  async getDistance(userId: number, year?: number): Promise<Response_DistanceDto> {
    const [bikes, colors] = await Promise.all([
      this.prisma.bikes.findMany({ where: ownedBikesWhere(userId), select: garageSelect }),
      colorIndexes(this.prisma, userId),
    ]);
    const garage = bikes.map((bike) => ({ ...bike, color_index: colors.get(bike.id) ?? 0 }));
    const current = await this.distanceIn(userId, year ?? new Date().getUTCFullYear(), garage);
    if (year !== undefined || current.bikes.length > 0) return current;

    const previous = await this.distanceIn(userId, current.year - 1, garage);
    return previous.bikes.length > 0 ? previous : current;
  }

  private async distanceIn(userId: number, year: number, garage: ColoredBike[]): Promise<Response_DistanceDto> {
    const rides = await this.ridesIn(userId, year);

    return { year, bikes: distanceRows(garage, metersByDay(rides, year, daysOf(year, new Date()))) };
  }

  // Bucketed in UTC, so the year's edges are UTC too.
  private async ridesIn(userId: number, year: number): Promise<DistanceRide[]> {
    return this.prisma.rides.findMany({
      where: {
        is_deleted: { not: true },
        bikes: ownedBikesWhere(userId),
        started_at: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
      },
      select: distanceSelect,
    });
  }

  // The year asked for, else this one - or last year while this one has nothing priced, so
  // the card is not blank all January.
  private async spendYear(userId: number, asked?: number): Promise<[number, SpendService[]]> {
    const year = asked ?? new Date().getFullYear();
    const services = await this.servicesIn(userId, year);
    if (asked !== undefined || spent(services) > 0) return [year, services];

    const previous = await this.servicesIn(userId, year - 1);
    return spent(previous) > 0 ? [year - 1, previous] : [year, services];
  }

  // The Services History Totals counts for the same year: archived bikes and deleted
  // Services left out (ADR 0024), dated by the history's own period rule.
  private async servicesIn(userId: number, year: number): Promise<SpendService[]> {
    return this.prisma.events_bikes.findMany({
      where: {
        is_deleted: { not: true },
        bikes: ownedBikesWhere(userId),
        ...serviceDateInPeriod(`${year}-01-01`, `${year}-12-31`),
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

// UTC days from 1 January to today inclusive, or the whole of a past year; none for a year ahead.
function daysOf(year: number, today: Date): number {
  const last = Math.min(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    Date.UTC(year, 11, 31),
  );
  return Math.max(0, (last - Date.UTC(year, 0, 1)) / DAY_MS + 1);
}

// getUTCDay counts from Sunday.
function mondayOf(date: Date): Date {
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - sinceMonday));
}

// Metres per bike per UTC day. A ride stamped after today lands on today, so the days still add
// up to every metre of the year.
function metersByDay(rides: DistanceRide[], year: number, days: number): Map<number, number[]> {
  const byBike = new Map<number, number[]>();
  if (days === 0) return byBike;

  for (const ride of rides) {
    if (ride.started_at === null) continue;
    const day = Math.min(Math.floor((ride.started_at.getTime() - Date.UTC(year, 0, 1)) / DAY_MS), days - 1);
    const meters = byBike.get(ride.bike_id) ?? new Array<number>(days).fill(0);
    meters[day] += ride.distance_m ?? 0;
    byBike.set(ride.bike_id, meters);
  }
  return byBike;
}

// Summed in metres and rounded last, so the client's months add up to the same total.
function distanceRows(garage: ColoredBike[], meters: Map<number, number[]>): Response_DistanceBikeDto[] {
  return garage
    .map(({ id, bike_brand, bike_model, year, color_index }) => {
      const daily = meters.get(id) ?? [];
      return {
        bike_id: id,
        bike_brand,
        bike_model,
        year,
        color_index,
        daily_m: daily,
        total_km: Math.round(sum(daily) / 1000),
      };
    })
    .filter((row) => row.total_km > 0)
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
