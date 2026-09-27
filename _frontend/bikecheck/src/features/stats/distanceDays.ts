// Months and weeks read from a bike's metres per UTC day. Every sum stays in metres; a value is
// rounded only where it is printed, so the months add up to exactly the year.
import type { Distance } from "./stats.types";

// The UTC day `index` days after 1 January; Date.UTC rolls over into the next months.
function dayOf(year: number, index: number): Date {
  return new Date(Date.UTC(year, 0, 1 + index));
}

// Every bike carries the same span, so the first one tells how many days were served.
export function servedDays(distance: Distance): number {
  return distance.bikes[0]?.daily_m.length ?? 0;
}

// January up to the month of the last day served: to this month, or all twelve for a past year.
export function monthCount(days: number, year: number): number {
  return days === 0 ? 0 : dayOf(year, days - 1).getUTCMonth() + 1;
}

export function monthlyMeters(daily: number[], year: number): number[] {
  const months = new Array<number>(monthCount(daily.length, year)).fill(0);
  daily.forEach((meters, day) => {
    months[dayOf(year, day).getUTCMonth()] += meters;
  });
  return months;
}

// Days between the Monday of 1 January's ISO week and 1 January itself; getUTCDay counts from Sunday.
function mondayOffset(year: number): number {
  return (dayOf(year, 0).getUTCDay() + 6) % 7;
}

// Monday of each ISO week (UTC date), from the week holding 1 January to the one holding the last day.
export function weekStarts(days: number, year: number): string[] {
  if (days === 0) return [];
  const offset = mondayOffset(year);
  const count = Math.floor((days - 1 + offset) / 7) + 1;
  return Array.from({ length: count }, (_, week) => dayOf(year, week * 7 - offset).toISOString().slice(0, 10));
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
