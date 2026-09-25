import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ownedBikesWhere } from '../bike/owned-bike.where';
import { serviceDateInPeriod } from '../bike-event/bike-event.service';
import { isoDay } from '../ai-chat/tools/tool-dates';
import { Response_SpendBikeDto, Response_SpendCategoryDto, Response_SpendDto } from './dto/response-spend';
import { Response_DistanceBikeDto, Response_DistanceDto } from './dto/response-distance';

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
type GarageBike = Prisma.bikesGetPayload<{ select: typeof garageSelect }>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

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
      bikes: bikeRows(bikes, top, categories),
    };
  }

  // Last year while this one draws no line, so the card is not blank all January.
  async getDistance(userId: number, year?: number): Promise<Response_DistanceDto> {
    // Archived bikes too: a colour ranks over them, so archiving one repaints nothing.
    const bikes = await this.prisma.bikes.findMany({
      where: ownedBikesWhere(userId, { includeArchived: true }),
      select: garageSelect,
    });
    const current = await this.distanceIn(userId, year ?? new Date().getUTCFullYear(), bikes);
    if (year !== undefined || current.bikes.length > 0) return current;

    const previous = await this.distanceIn(userId, current.year - 1, bikes);
    return previous.bikes.length > 0 ? previous : current;
  }

  private async distanceIn(userId: number, year: number, bikes: GarageBike[]): Promise<Response_DistanceDto> {
    const rides = await this.ridesIn(userId, year);
    const weeks = weeksOf(year, new Date());

    return { year, weeks: weeks.map((week) => isoDay(week)), bikes: distanceRows(bikes, rides, weeks) };
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
      key: categoryKey(id, top),
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

function categoryKey(id: number | null, top: number[]): string {
  if (id === null) return 'unassigned';
  return top.includes(id) ? `group:${id}` : 'other';
}

function bikeRows(bikes: BikeSpend[], top: number[], categories: Response_SpendCategoryDto[]): Response_SpendBikeDto[] {
  return bikes
    .map(({ bike, split }) => {
      const byKey = new Map<string, number>();
      for (const [id, amount] of split) {
        const key = categoryKey(id, top);
        byKey.set(key, (byKey.get(key) ?? 0) + amount);
      }
      return {
        bike_id: bike.id,
        bike_brand: bike.bike_brand,
        bike_model: bike.bike_model,
        year: bike.year,
        total: units(sum([...split.values()])),
        segments: categories.map(({ key }) => ({ key, amount: units(byKey.get(key) ?? 0) })),
      };
    })
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

// Mondays from the week holding 1 January to the current week - or the last week of a past
// year, so the x-axis never runs on into empty months.
function weeksOf(year: number, today: Date): Date[] {
  const last = Math.min(today.getTime(), Date.UTC(year, 11, 31));
  const weeks: Date[] = [];
  let monday = mondayOf(new Date(Date.UTC(year, 0, 1)));
  while (monday.getTime() <= last) {
    weeks.push(monday);
    monday = new Date(monday.getTime() + WEEK_MS);
  }
  return weeks;
}

// getUTCDay counts from Sunday.
function mondayOf(date: Date): Date {
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - sinceMonday));
}

function distanceRows(bikes: GarageBike[], rides: DistanceRide[], weeks: Date[]): Response_DistanceBikeDto[] {
  const meters = metersByWeek(rides, weeks);

  return [...bikes]
    .sort((a, b) => a.id - b.id)
    .map((bike, rank) => {
      // Summed in meters and rounded last, so each line only rises and ends at its total.
      const cumulative = runningTotal(meters.get(bike.id) ?? []).map((total) => Math.round(total / 1000));
      return {
        bike_id: bike.id,
        bike_brand: bike.bike_brand,
        bike_model: bike.bike_model,
        year: bike.year,
        color_index: rank,
        cumulative_km: cumulative,
        total_km: cumulative[cumulative.length - 1] ?? 0,
      };
    })
    .filter((row) => row.total_km > 0)
    .sort((a, b) => b.total_km - a.total_km || a.bike_id - b.bike_id);
}

// Metres per bike per week. A ride stamped past the current week lands in it, so the total
// still equals the last value.
function metersByWeek(rides: DistanceRide[], weeks: Date[]): Map<number, number[]> {
  const byBike = new Map<number, number[]>();
  if (weeks.length === 0) return byBike;

  for (const ride of rides) {
    if (ride.started_at === null) continue;
    const week = Math.min(Math.floor((ride.started_at.getTime() - weeks[0].getTime()) / WEEK_MS), weeks.length - 1);
    const meters = byBike.get(ride.bike_id) ?? new Array<number>(weeks.length).fill(0);
    meters[week] += ride.distance_m ?? 0;
    byBike.set(ride.bike_id, meters);
  }
  return byBike;
}

function runningTotal(values: number[]): number[] {
  let total = 0;
  return values.map((value) => {
    total += value;
    return total;
  });
}
