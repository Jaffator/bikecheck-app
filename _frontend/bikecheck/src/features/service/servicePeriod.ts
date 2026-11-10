// The period the History Totals and the history list are read for, and how it reads once chosen.
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type { DayRange } from "@/features/rides/ridesTable";
import { pattern } from "./serviceDates";
import type { ServicePeriod } from "./service.types";

// Both ends open: every Service, including the ones carrying no Service Date.
export const ALL_TIME: ServicePeriod = { from: null, to: null };

// What the API takes and the URL carries. Dates are days, not instants: a service dated
// 1 January is the first of January wherever the user is standing.
const DAY_FORMAT = "YYYY-MM-DD";

// The periods the card names rather than spells out.
type PeriodPresetId = "all" | "thisYear";

interface PeriodPreset {
  id: PeriodPresetId;
  labelKey: string;
  // Built when asked for rather than held, so it still means what it says after midnight.
  period: () => ServicePeriod;
}

const PERIOD_PRESETS: PeriodPreset[] = [
  { id: "all", labelKey: "service.periodAll", period: () => ALL_TIME },
  {
    id: "thisYear",
    labelKey: "service.periodThisYear",
    period: () => ({
      from: dayjs().startOf("year").format(DAY_FORMAT),
      to: dayjs().endOf("year").format(DAY_FORMAT),
    }),
  },
];

// The period as the history's address carries it, "?from=…&to=…"; an open end is left out.
export function periodSearch(period: ServicePeriod): string {
  const params = new URLSearchParams();
  if (period.from !== null) params.set("from", period.from);
  if (period.to !== null) params.set("to", period.to);
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

function matchPreset(period: ServicePeriod): PeriodPresetId | null {
  const preset = PERIOD_PRESETS.find((candidate) => {
    const { from, to } = candidate.period();
    return from === period.from && to === period.to;
  });
  return preset?.id ?? null;
}

// What the panel reopens on; an open end, as a spend link may carry, starts it empty.
export function closedSpan({ from, to }: ServicePeriod): DayRange | null {
  return from !== null && to !== null ? { from, to } : null;
}

// Czech writes the day first, English the month - the same split the history's dates
// make. The `localizedFormat` dayjs plugin is not loaded, so the patterns are spelled out
// here rather than left to `format("L")`.
export const DAY_BY_LANGUAGE: Record<string, string> = {
  cs: "D. M. YYYY",
  en: "MMM D, YYYY",
};

function formatDay(day: string | null, language: string): string | null {
  if (day === null) return null;
  return dayjs(day).format(pattern(DAY_BY_LANGUAGE, language));
}

// How the chosen period reads on the card's eyebrow. A preset is named; anything else is
// spelled out, so the days chosen are never hidden behind a word.
export function periodLabel(period: ServicePeriod, t: TFunction, language: string): string {
  const preset = PERIOD_PRESETS.find((candidate) => candidate.id === matchPreset(period));
  if (preset !== undefined) return t(preset.labelKey);

  const from = formatDay(period.from, language);
  const to = formatDay(period.to, language);

  if (from !== null && to !== null) return `${from} – ${to}`;
  if (from !== null) return t("service.periodFrom", { date: from });
  if (to !== null) return t("service.periodTo", { date: to });
  return t("service.periodAll");
}
