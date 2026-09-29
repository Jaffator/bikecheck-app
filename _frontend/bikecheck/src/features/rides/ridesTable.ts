// The desktop rides table: its filter as the URL carries it, its weeks and how its figures read.
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type { Ride } from "./rides.types";

export const TABLE_PAGE_SIZE = 20;
export const ALL_MONTHS = "all";

const DAY_FORMAT = "YYYY-MM-DD";
const MONTH_FORMAT = "YYYY-MM";
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

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

// `?bike=&month=&page=`; a month is YYYY-MM or `all`.
export interface RideTableParams {
  bikeId: number | null;
  month: string;
  page: number;
}

// Anything unreadable falls back to every bike, this month and the first page.
export function readTableParams(params: URLSearchParams, today: dayjs.Dayjs = dayjs()): RideTableParams {
  const bike = Number(params.get("bike"));
  const month = params.get("month");
  const page = Number(params.get("page"));
  return {
    bikeId: Number.isInteger(bike) && bike > 0 ? bike : null,
    month: month !== null && (month === ALL_MONTHS || MONTH_PATTERN.test(month)) ? month : today.format(MONTH_FORMAT),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function filterOf(params: RideTableParams): RideFilter {
  return { bikeId: params.bikeId, range: monthRange(params.month) };
}

function monthRange(month: string): DayRange | null {
  if (month === ALL_MONTHS) return null;
  const start = dayjs(`${month}-01`);
  return {
    from: start.format(DAY_FORMAT),
    to: start.endOf("month").format(DAY_FORMAT),
  };
}

// This month and the chosen one stay offered even before they have a ride.
export function monthOptions(months: string[], chosen: string, today: dayjs.Dayjs = dayjs()): string[] {
  const offered = new Set([...months, today.format(MONTH_FORMAT), ...(chosen === ALL_MONTHS ? [] : [chosen])]);
  return [...offered].sort((a, b) => b.localeCompare(a));
}

// "Září 2026"; capitalised because it heads a figure, though Czech writes months small.
export function monthLabel(month: string, language: string): string {
  const label = new Intl.DateTimeFormat(language, {
    month: "long",
    year: "numeric",
  }).format(dayjs(`${month}-01`).toDate());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// 1–12, which picks the grammatical form "proti srpnu" needs.
export function previousMonthNumber(month: string): number {
  return dayjs(`${month}-01`).subtract(1, "month").month() + 1;
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

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
}
