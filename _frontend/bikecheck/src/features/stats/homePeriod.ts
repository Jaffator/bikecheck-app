// Home's Period: how the address carries it, how a reading names it, and what it asks
// History Totals and the distance chart for.
import dayjs, { type Dayjs } from "dayjs";
import type { TFunction } from "i18next";
import { pattern } from "@/features/service/serviceDates";
import { ALL_TIME, DAY_BY_LANGUAGE } from "@/features/service/servicePeriod";
import type { DayRange } from "@/features/rides/ridesTable";
import type { ServicePeriod } from "@/features/service/service.types";
import type { ComparedPeriod, HomePeriod, NamedPeriod } from "./stats.types";

// Several whole months are "days": they have no predecessor of their own kind.
export type SpanKind = ComparedPeriod | "days";

// A span the distance is summed over.
export type DistanceBucket = "day" | "week" | "month" | "year";

// What Home, Rides and Service open on; never written to the address.
export const DEFAULT_HOME_PERIOD: NamedPeriod = "month";

const DAY_FORMAT = "YYYY-MM-DD";

// The first day of a span in the same year as its last, which says the year for both.
const DAY_IN_YEAR_BY_LANGUAGE: Record<string, string> = {
  cs: "D. M.",
  en: "MMM D",
};

export function isCustomPeriod(period: HomePeriod): period is DayRange {
  return typeof period === "object";
}

export function parseNamedPeriod(raw: string | null): NamedPeriod {
  return raw === "year" || raw === "all" ? raw : DEFAULT_HOME_PERIOD;
}

// dayjs rolls 30 February into March, so only a day that prints back as itself is real.
function isDay(raw: string): boolean {
  return dayjs(raw).format(DAY_FORMAT) === raw;
}

// `?period=` or a `?from=&to=` pair. Anything broken is the default, so a bad link still opens a working page.
export function parseHomePeriod(params: URLSearchParams): HomePeriod {
  const from = params.get("from");
  const to = params.get("to");
  if (from === null && to === null) return parseNamedPeriod(params.get("period"));
  if (from === null || to === null || !isDay(from) || !isDay(to) || from > to) return DEFAULT_HOME_PERIOD;
  return { from, to };
}

// The default stays out of the address, and no address carries both forms.
export function writeHomePeriod(params: URLSearchParams, period: HomePeriod): void {
  ["period", "from", "to"].forEach((key) => params.delete(key));
  if (isCustomPeriod(period)) {
    params.set("from", period.from);
    params.set("to", period.to);
  } else if (period !== DEFAULT_HOME_PERIOD) {
    params.set("period", period);
  }
}

// The month or year holding the day, end to end.
export function wholeSpan(day: string, unit: ComparedPeriod): DayRange {
  const held = dayjs(day);
  return { from: held.startOf(unit).format(DAY_FORMAT), to: held.endOf(unit).format(DAY_FORMAT) };
}

// What a span reads as: the server's rule for what it compares with, and the panel's tab for it.
export function spanKind({ from, to }: DayRange): SpanKind {
  const isWhole = (unit: ComparedPeriod): boolean => {
    const whole = wholeSpan(from, unit);
    return whole.from === from && whole.to === to;
  };
  if (isWhole("month")) return "month";
  return isWhole("year") ? "year" : "days";
}

function isCurrent(range: DayRange, unit: ComparedPeriod, today: Dayjs): boolean {
  const day = today.format(DAY_FORMAT);
  const whole = wholeSpan(day, unit);
  return range.from === whole.from && (range.to === whole.to || range.to === day);
}

// The current month or year is its ordinary segment: the same reading, counted up to today.
export function choosePeriod(range: DayRange, today: Dayjs = dayjs()): HomePeriod {
  if (isCurrent(range, "month", today)) return "month";
  return isCurrent(range, "year", today) ? "year" : range;
}

// "12. 3. – 15. 8. 2026"; one day reads once, and a span over New Year names both years.
export function customPeriodLabel({ from, to }: DayRange, language: string): string {
  const last = dayjs(to).format(pattern(DAY_BY_LANGUAGE, language));
  if (from === to) return last;
  const sameYear = dayjs(from).year() === dayjs(to).year();
  const first = dayjs(from).format(pattern(sameYear ? DAY_IN_YEAR_BY_LANGUAGE : DAY_BY_LANGUAGE, language));
  return `${first} – ${last}`;
}

// "September", "2026", "all time" or the days chosen.
export function homePeriodLabel(period: HomePeriod, language: string, t: TFunction): string {
  if (isCustomPeriod(period)) return customPeriodLabel(period, language);
  if (period === "all") return t("stats.periodAllTime");
  if (period === "year") return String(dayjs().year());
  return new Intl.DateTimeFormat(language, { month: "long" }).format(new Date());
}

// Open-ended, as the spend card's own window is, so the figure and the card never disagree.
export function homePeriodServices(period: HomePeriod): ServicePeriod {
  if (period === "all") return ALL_TIME;
  if (isCustomPeriod(period)) return period;
  return { from: dayjs().startOf(period).format(DAY_FORMAT), to: null };
}
