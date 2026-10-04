// Buckets and weeks read from a bike's metres per UTC day, index 0 = the served `from`. Every sum
// stays in metres; a value is rounded only where it is printed, so the buckets add up to exactly the total.
import type { TFunction } from "i18next";
import { formatKm } from "@/features/profile/profileFormat";
import type { DistanceBucket } from "./homePeriod";
import type { Distance, DistanceBike, HomePeriod } from "./stats.types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Distance and climb share one span and one detail rule; only the days summed and the unit differ.
export interface DailySeries {
  daily: (bike: DistanceBike) => number[];
  format: (meters: number, language: string) => string;
}

export const RIDDEN: DailySeries = {
  daily: (bike) => bike.daily_m,
  format: (meters, language) => formatKm(Math.round(meters / 1000), language),
};

export const CLIMBED: DailySeries = {
  daily: (bike) => bike.daily_elevation_m,
  format: (meters, language) => `${new Intl.NumberFormat(language).format(meters)} m`,
};

// The UTC day `index` days after `from`.
function dayOf(from: string, index: number): Date {
  return new Date(Date.parse(`${from}T00:00:00.000Z`) + index * DAY_MS);
}

// The phone asks for no Period, so what it is served always starts on 1 January.
export function servedYear(distance: Distance): number {
  return dayOf(distance.from, 0).getUTCFullYear();
}

// Every bike carries the same span, so the first one tells how many days were served.
export function servedDays(distance: Distance): number {
  return distance.bikes[0]?.daily_m.length ?? 0;
}

// Counted from the bucket holding `from`.
function bucketIndex(from: Date, day: Date, bucket: DistanceBucket): number {
  if (bucket === "day") return Math.round((day.getTime() - from.getTime()) / DAY_MS);
  const years = day.getUTCFullYear() - from.getUTCFullYear();
  return bucket === "year" ? years : years * 12 + day.getUTCMonth() - from.getUTCMonth();
}

// The first UTC day of each bucket, from the one holding `from` to the one holding `to`.
export function bucketStarts(distance: Distance, bucket: DistanceBucket): Date[] {
  const from = dayOf(distance.from, 0);
  const count = bucketIndex(from, dayOf(distance.to, 0), bucket) + 1;
  return Array.from({ length: count }, (_, index) => {
    if (bucket === "day") return dayOf(distance.from, index);
    if (bucket === "month") return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1));
    return new Date(Date.UTC(from.getUTCFullYear() + index, 0, 1));
  });
}

export function bucketMeters(daily: number[], distance: Distance, bucket: DistanceBucket): number[] {
  const from = dayOf(distance.from, 0);
  const buckets = new Array<number>(bucketStarts(distance, bucket).length).fill(0);
  daily.forEach((meters, day) => {
    buckets[bucketIndex(from, dayOf(distance.from, day), bucket)] += meters;
  });
  return buckets;
}

// Every bike's metres over the served span, which the bars add up to exactly.
export function totalMeters(distance: Distance, series: DailySeries): number {
  return metersSince(distance, dayOf(distance.from, 0), series);
}

// Every bike's metres from `since` to the last day served; a day before `from` reads as `from`.
function metersSince(distance: Distance, since: Date, series: DailySeries): number {
  const first = Math.max(0, bucketIndex(dayOf(distance.from, 0), since, "day"));
  const days = distance.bikes.flatMap((bike) => series.daily(bike).slice(first));
  return days.reduce((sum, meters) => sum + meters, 0);
}

// getUTCDay counts from Sunday.
function mondayOf(day: Date): Date {
  return new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY_MS);
}

// The current bucket one level down: this month of the year, this week of the month, this year of all time.
export function periodGain(
  distance: Distance,
  period: HomePeriod,
  series: DailySeries,
  language: string,
  t: TFunction,
): string {
  const today = dayOf(distance.to, 0);
  const amount = (since: Date): string => series.format(metersSince(distance, since, series), language);

  if (period === "month") return t("dashboard.gainWeek", { amount: amount(mondayOf(today)) });
  if (period === "all") {
    const year = today.getUTCFullYear();
    return t("dashboard.gainYear", { amount: amount(new Date(Date.UTC(year, 0, 1))), year });
  }
  const month = new Intl.DateTimeFormat(language, { month: "long", timeZone: "UTC" }).format(today);
  return t("dashboard.gainMonth", {
    amount: amount(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))),
    month,
  });
}

// Days between the Monday of 1 January's ISO week and 1 January itself; getUTCDay counts from Sunday.
function mondayOffset(year: number): number {
  return (new Date(Date.UTC(year, 0, 1)).getUTCDay() + 6) % 7;
}

// Monday of each ISO week (UTC date), from the week holding 1 January to the one holding the last day.
export function weekStarts(days: number, year: number): string[] {
  if (days === 0) return [];
  const offset = mondayOffset(year);
  const count = Math.floor((days - 1 + offset) / 7) + 1;
  return Array.from({ length: count }, (_, week) =>
    new Date(Date.UTC(year, 0, 1 + week * 7 - offset)).toISOString().slice(0, 10),
  );
}

// Metres ridden by the end of each of those weeks.
export function weeklyRunningMeters(daily: number[], year: number): number[] {
  const offset = mondayOffset(year);
  const weeks = new Array<number>(weekStarts(daily.length, year).length).fill(0);
  daily.forEach((meters, day) => {
    weeks[Math.floor((day + offset) / 7)] += meters;
  });

  let total = 0;
  return weeks.map((meters) => {
    total += meters;
    return total;
  });
}

// What one point of the distance line covers: a month steps by day, a year by week, all time by month.
export type DistanceStep = "day" | "week" | "month";

export interface RunningDistance {
  step: DistanceStep;
  // The first UTC day of each step, YYYY-MM-DD.
  starts: string[];
  // Per bike, in the order of the served bikes: metres ridden by the end of each step.
  meters: number[][];
}

// No Period is the phone's year, so it steps by week as desktop's year does.
export function runningDistance(distance: Distance, period: HomePeriod | undefined): RunningDistance {
  if (period === "month" || period === "all") {
    const bucket = period === "month" ? "day" : "month";
    return {
      step: bucket,
      starts: bucketStarts(distance, bucket).map((start) => start.toISOString().slice(0, 10)),
      meters: distance.bikes.map((bike) => runningSum(bucketMeters(bike.daily_m, distance, bucket))),
    };
  }

  const year = servedYear(distance);
  return {
    step: "week",
    starts: weekStarts(servedDays(distance), year),
    meters: distance.bikes.map((bike) => weeklyRunningMeters(bike.daily_m, year)),
  };
}

function runningSum(values: number[]): number[] {
  let total = 0;
  return values.map((value) => {
    total += value;
    return total;
  });
}
