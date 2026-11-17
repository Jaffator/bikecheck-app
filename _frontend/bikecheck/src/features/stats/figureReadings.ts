// Home's figures read two ways: against the previous Period (Comparison) or a fixed yardstick (Equivalent).
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { distanceChange, previousMonthNumber, type DayRange } from "@/features/rides/ridesTable";
import { formatNumber } from "@/utils/number";
import { totalMeters, type DailySeries } from "./distanceDays";
import { isCustomPeriod, spanKind } from "./homePeriod";
import type { ComparedDistance, ComparedPeriod, Distance, HomePeriod } from "./stats.types";

export type FigureReading = "comparison" | "equivalent";

// The same for every rider, since the app does not know where they ride.
export interface Yardstick {
  // In the series' unit: metres.
  amount: number;
  graphic: "ring" | "mountain";
  // "17 % obvodu Země" while short of it, "11× obvod Země" once covered.
  shareKey: string;
  timesKey: string;
}

export const EARTH: Yardstick = {
  amount: 40_075_000,
  graphic: "ring",
  shareKey: "dashboard.equivalentEarthShare",
  timesKey: "dashboard.equivalentEarthTimes",
};

export const EVEREST: Yardstick = {
  amount: 8_849,
  graphic: "mountain",
  shareKey: "dashboard.equivalentEverestShare",
  timesKey: "dashboard.equivalentEverestTimes",
};

export interface Equivalent {
  // Whole yardsticks covered.
  times: number;
  // How far into the next one, 0 to 1.
  progress: number;
}

export function equivalentOf(value: number, yardstick: Yardstick): Equivalent {
  const ratio = value / yardstick.amount;
  const times = Math.floor(ratio);
  return { times, progress: ratio - times };
}

// "11×" once covered; "17 %" before, with one decimal under 1 %.
export function equivalentLabel(equivalent: Equivalent, language: string, t: TFunction): string {
  if (equivalent.times > 0) return `${formatNumber(equivalent.times, language)}×`;
  const percent = equivalent.progress * 100;
  // Capped, so a share never reads 100 % before the yardstick is reached.
  const value = percent < 1 ? percent : Math.min(99, Math.round(percent));
  return t("tracking.percentage", { value: formatNumber(value, language, { maximumFractionDigits: 1 }) });
}

// "+1 %", "−100 %" with a true minus, "0 %".
export function changeLabel(change: number, language: string, t: TFunction): string {
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return t("tracking.percentage", { value: `${sign}${formatNumber(Math.abs(change), language)}` });
}

// A Period with one before it, the custom ones included.
type ReadPeriod = ComparedPeriod | DayRange;

// A custom Period says what it stands against from its own first day, the ordinary ones from today.
export function versusPreviousText(period: HomePeriod, t: TFunction): string {
  const custom = isCustomPeriod(period);
  const start = custom ? dayjs(period.from) : dayjs();
  const kind = custom ? spanKind(period) : period;
  if (kind === "year") return t("ridesTable.vsYear", { year: start.year() - 1 });
  if (kind === "month") return t(`ridesTable.vsMonth.${String(previousMonthNumber(start))}`);
  return t("ridesTable.vsPreviousPeriod");
}

// A figure over the Period beside the same days of the Period before.
export interface ComparedFigure {
  current: number;
  previous: number;
  period: ReadPeriod;
  // The served last day, so the words name the days the server counted.
  to: string;
}

// A Period's distance with the one before it to read against.
export interface Compared {
  distance: ComparedDistance;
  period: ReadPeriod;
}

// Null for all time, which has no Period before it.
export function compared(distance: Distance, period: HomePeriod): Compared | null {
  if (period === "all" || distance.previous === null) return null;
  return { distance: { ...distance, previous: distance.previous }, period };
}

export function comparedFigure({ distance, period }: Compared, series: DailySeries): ComparedFigure {
  return {
    current: totalMeters(distance, series),
    previous: series.previous(distance.previous),
    period,
    to: distance.to,
  };
}

// Home reads a Comparison only over a custom Period; its ordinary segments read as Equivalents.
export function customComparison(distance: Distance, period: HomePeriod, series: DailySeries): ComparedFigure | null {
  const against = isCustomPeriod(period) ? compared(distance, period) : null;
  return against === null ? null : comparedFigure(against, series);
}

export interface Comparison {
  // Null when the previous Period had nothing, so there is no share to show.
  change: number | null;
  text: string;
}

export function comparisonOf(figure: ComparedFigure, language: string, t: TFunction): Comparison {
  const change = distanceChange(figure.current, figure.previous);
  if (change !== null) return { change, text: versusText(figure, language, t) };
  if (isCustomPeriod(figure.period)) return { change, text: t("dashboard.comparisonNoPrevious") };
  if (figure.current === 0) return { change, text: t("dashboard.comparisonNothingYet") };
  return { change, text: emptyText(figure, t) };
}

// "vs. říjen ke stejnému dni", "vs. 2025 ke stejnému dni"; a custom Period is read whole, so no same-day words.
function versusText({ period, to }: ComparedFigure, language: string, t: TFunction): string {
  if (isCustomPeriod(period)) return versusPreviousText(period, t);
  const today = dayjs(to);
  if (period === "year") return t("dashboard.comparisonYear", { year: today.year() - 1 });
  const month = new Intl.DateTimeFormat(language, { month: "long" }).format(today.subtract(1, "month").toDate());
  return t("dashboard.comparisonMonth", { month });
}

// "v říjnu do 3. dne nic"; dayjs clamps 31 March back to 28 February, as the server does.
function emptyText({ period, to }: ComparedFigure, t: TFunction): string {
  const today = dayjs(to);
  if (period === "year") return t("dashboard.comparisonEmptyYear", { year: today.year() - 1 });
  const before = today.subtract(1, "month");
  return t(`dashboard.comparisonEmptyMonth.${String(before.month() + 1)}`, { day: before.date() });
}

// What a row of time cells is called: "říj" for a month, "2025" for a year.
export function periodName(from: string, period: ComparedPeriod, language: string): string {
  const first = dayjs(from);
  if (period === "year") return String(first.year());
  return new Intl.DateTimeFormat(language, { month: "short" }).format(first.toDate());
}
