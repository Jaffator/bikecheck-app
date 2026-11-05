// Calendar days and weeks as the rider lives them: in their own IANA time zone, weeks from Monday.

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Both days inclusive, as YYYY-MM-DD; an absent end is open.
export interface DayRange {
  from?: string;
  to?: string;
}

export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Rejects 2026-02-30 as well as rubbish, since Date.UTC would roll it into March; month 13 parses to nothing.
export function isDay(day: string): boolean {
  const parsed = Date.parse(`${day}T00:00:00.000Z`);
  return DAY_PATTERN.test(day) && !Number.isNaN(parsed) && new Date(parsed).toISOString().startsWith(day);
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// The rider's calendar date of an instant; en-CA writes it as YYYY-MM-DD.
export function localDay(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instant,
  );
}

// The instant the rider's day begins.
export function dayStart(day: string, tz: string): Date {
  const utcMidnight = Date.parse(`${day}T00:00:00.000Z`);
  // Asked twice: the offset at a UTC guess can differ from the one at the real midnight across a DST switch.
  const guess = utcMidnight - offsetAt(utcMidnight, tz);
  return new Date(utcMidnight - offsetAt(guess, tz));
}

// How far the zone's wall clock runs ahead of UTC at that moment.
function offsetAt(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(ms));
  const part = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((one) => one.type === type)?.value);
  const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  return wall - Math.floor(ms / 1000) * 1000;
}

// The Monday of the rider's week holding the instant.
export function weekStart(instant: Date, tz: string): string {
  const day = localDay(instant, tz);
  // getUTCDay counts from Sunday.
  const weekday = (new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

// A whole calendar month or year steps back by its own length, so September compares with all of August; any
// other span by its days.
export function previousRange(from: string, to: string): Required<DayRange> {
  const start = new Date(`${from}T00:00:00.000Z`);
  const months = monthsInCalendarPeriod(from, to);
  if (months !== null) {
    // setUTCMonth, as Date.UTC would read a year below 100 as 19xx.
    const previous = new Date(start);
    previous.setUTCMonth(start.getUTCMonth() - months);
    return { from: previous.toISOString().slice(0, 10), to: addDays(from, -1) };
  }
  const days = Math.round((Date.parse(`${to}T00:00:00.000Z`) - start.getTime()) / DAY_MS) + 1;
  return { from: addDays(from, -days), to: addDays(from, -1) };
}

// Several whole months are no calendar period, so they have no predecessor of their own kind and step back by days.
function monthsInCalendarPeriod(from: string, to: string): 1 | 12 | null {
  if (!from.endsWith('-01') || !addDays(to, 1).endsWith('-01')) return null;
  if (from.slice(0, 7) === to.slice(0, 7)) return 1;
  return from.slice(0, 4) === to.slice(0, 4) && from.endsWith('-01-01') && to.endsWith('-12-31') ? 12 : null;
}

// The started_at bounds a range sets; none for an open end.
export function startedWithin(range: DayRange, tz: string): { gte?: Date; lt?: Date } | null {
  if (range.from === undefined && range.to === undefined) return null;
  return {
    ...(range.from === undefined ? {} : { gte: dayStart(range.from, tz) }),
    ...(range.to === undefined ? {} : { lt: dayStart(addDays(range.to, 1), tz) }),
  };
}
