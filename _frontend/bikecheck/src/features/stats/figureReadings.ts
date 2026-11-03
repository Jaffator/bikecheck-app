// Home's figures read two ways: against the previous Period (Comparison) or a fixed yardstick (Equivalent).
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { distanceChange } from "@/features/rides/ridesTable";
import { formatNumber } from "@/utils/number";
import type { HomePeriod } from "./stats.types";

export type FigureReading = "comparison" | "equivalent";

// The same for every rider, since the app does not know where they ride.
export interface Yardstick {
  meters: number;
  graphic: "ring" | "mountain";
  // "17 % obvodu Země" while short of it, "11× obvod Země" once covered.
  shareKey: string;
  timesKey: string;
}

export const EARTH: Yardstick = {
  meters: 40_075_000,
  graphic: "ring",
  shareKey: "dashboard.equivalentEarthShare",
  timesKey: "dashboard.equivalentEarthTimes",
};

export const EVEREST: Yardstick = {
  meters: 8_849,
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

export function equivalentOf(meters: number, yardstick: Yardstick): Equivalent {
  const ratio = meters / yardstick.meters;
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

export type Trend = "up" | "down" | "flat";

export function trendOf(change: number): Trend {
  if (change > 0) return "up";
  return change < 0 ? "down" : "flat";
}

// "+1 %", "−100 %" with a true minus, "0 %".
export function changeLabel(change: number, language: string, t: TFunction): string {
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return t("tracking.percentage", { value: `${sign}${formatNumber(Math.abs(change), language)}` });
}

// A figure over the Period beside the same days of the Period before.
export interface ComparedFigure {
  current: number;
  previous: number;
  period: ComparedPeriod;
  // The served last day, so the words name the days the server counted.
  to: string;
}

export type ComparedPeriod = Exclude<HomePeriod, "all">;

export interface Comparison {
  // Null when the previous Period had nothing, so there is no share to show.
  change: number | null;
  text: string;
}

export function comparisonOf(figure: ComparedFigure, language: string, t: TFunction): Comparison {
  const change = distanceChange(figure.current, figure.previous);
  if (change !== null) return { change, text: versusText(figure, language, t) };
  if (figure.current === 0) return { change, text: t("dashboard.comparisonNothingYet") };
  return { change, text: emptyText(figure, t) };
}

// "vs. říjen ke stejnému dni", "vs. 2025 ke stejnému dni".
function versusText({ period, to }: ComparedFigure, language: string, t: TFunction): string {
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
