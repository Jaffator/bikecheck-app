// The desktop rides table: its filter as the URL carries it, its weeks and how its figures read.
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { parseHomePeriod } from "@/features/stats/homePeriod";
import type { HomePeriod } from "@/features/stats/stats.types";
import type { Ride } from "./rides.types";

export const TABLE_PAGE_SIZE = 20;

const DAY_FORMAT = "YYYY-MM-DD";

// Both days inclusive, YYYY-MM-DD, in the rider's time zone.
export interface DayRange {
  from: string;
  to: string;
}

export interface RideFilter {
  bikeId: number | null;
  // Null is every ride.
  range: DayRange | null;
}

// `?bike=&period=&page=`, the same Period switcher Service has.
export interface RideTableParams {
  bikeId: number | null;
  period: HomePeriod;
  page: number;
}

// Anything unreadable falls back to every bike, the year and the first page.
export function readTableParams(params: URLSearchParams): RideTableParams {
  const bike = Number(params.get("bike"));
  const page = Number(params.get("page"));
  return {
    bikeId: Number.isInteger(bike) && bike > 0 ? bike : null,
    period: parseHomePeriod(params.get("period")),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function filterOf(params: RideTableParams, today: dayjs.Dayjs = dayjs()): RideFilter {
  return { bikeId: params.bikeId, range: periodRange(params.period, today) };
}

// The whole calendar month or year, so the server compares it with the one before.
function periodRange(period: HomePeriod, today: dayjs.Dayjs): DayRange | null {
  if (period === "all") return null;
  return {
    from: today.startOf(period).format(DAY_FORMAT),
    to: today.endOf(period).format(DAY_FORMAT),
  };
}

// "Září 2026" or "2026"; null for every ride.
export function periodLabel(period: HomePeriod, language: string, today: dayjs.Dayjs = dayjs()): string | null {
  if (period === "all") return null;
  if (period === "year") return String(today.year());
  return monthLabel(today, language);
}

// "Září 2026"; capitalised because it heads a figure, though Czech writes months small.
function monthLabel(month: dayjs.Dayjs, language: string): string {
  const label = new Intl.DateTimeFormat(language, {
    month: "long",
    year: "numeric",
  }).format(month.toDate());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// 1–12, which picks the grammatical form "proti srpnu" needs.
export function previousMonthNumber(today: dayjs.Dayjs = dayjs()): number {
  return today.subtract(1, "month").month() + 1;
}

// The Monday of the rider's week, the way the server keys its weeks.
export function weekStartOf(day: dayjs.ConfigType): string {
  const local = dayjs(day);
  // day() counts from Sunday.
  return local.subtract((local.day() + 6) % 7, "day").format(DAY_FORMAT);
}

export interface WeekGroup {
  // Null gathers the rides with no start, which belong to no week.
  start: string | null;
  rides: Ride[];
}

// The page is newest first, so each week's rides stand together.
export function groupByWeek(rides: Ride[]): WeekGroup[] {
  return rides.reduce<WeekGroup[]>((groups, ride) => {
    const start = ride.started_at === null ? null : weekStartOf(ride.started_at);
    const last = groups.at(-1);
    if (last !== undefined && last.start === start)
      return [...groups.slice(0, -1), { start, rides: [...last.rides, ride] }];
    return [...groups, { start, rides: [ride] }];
  }, []);
}

export function weekLabel(start: string, language: string, t: TFunction, today: dayjs.Dayjs = dayjs()): string {
  const thisWeek = weekStartOf(today);
  if (start === thisWeek) return t("ridesTable.thisWeek");
  if (start === dayjs(thisWeek).subtract(7, "day").format(DAY_FORMAT)) return t("ridesTable.lastWeek");
  const monday = dayjs(start);
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "numeric",
  }).formatRange(monday.toDate(), monday.add(6, "day").toDate());
}

// Whole percent against the previous period; nothing to compare with when it had no distance.
export function distanceChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
