// The period the History Totals and the history list are read for: the presets that fill
// it in, and how it reads once chosen. The card's eyebrow and the filter both format
// here, so the two can never call the same period different things.
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { pattern } from "./serviceDates";
import type { ServicePeriod } from "./service.types";

// Both ends open: every Service, including the ones carrying no Service Date.
export const ALL_TIME: ServicePeriod = { from: null, to: null };

// What the API takes and the URL carries. Dates are days, not instants: a service dated
// 1 January is the first of January wherever the user is standing.
const DAY_FORMAT = "YYYY-MM-DD";

// The presets, in the order the filter offers them.
export type PeriodPresetId = "all" | "thisYear" | "last12Months";

interface PeriodPreset {
  id: PeriodPresetId;
  // The translation key that names it, on the filter and on the card alike.
  labelKey: string;
  // Built when asked for rather than held, so a preset chosen either side of midnight
  // means what it says.
  period: () => ServicePeriod;
}

export const PERIOD_PRESETS: PeriodPreset[] = [
  { id: "all", labelKey: "service.periodAll", period: () => ALL_TIME },
  {
    id: "thisYear",
    labelKey: "service.periodThisYear",
    period: () => ({
      from: dayjs().startOf("year").format(DAY_FORMAT),
      to: dayjs().endOf("year").format(DAY_FORMAT),
    }),
  },
  {
    id: "last12Months",
    labelKey: "service.periodLast12Months",
    // Twelve months back from today, today included.
    period: () => ({
      from: dayjs().subtract(12, "month").add(1, "day").format(DAY_FORMAT),
      to: dayjs().format(DAY_FORMAT),
    }),
  },
];

// Which preset a period is, if any. A period the user typed by hand matches none, and the
// filter shows no preset as chosen.
export function matchPreset(period: ServicePeriod): PeriodPresetId | null {
  const preset = PERIOD_PRESETS.find((candidate) => {
    const { from, to } = candidate.period();
    return from === period.from && to === period.to;
  });
  return preset?.id ?? null;
}

// Czech writes the day first, English the month - the same split the history's dates
// make. The `localizedFormat` dayjs plugin is not loaded, so the patterns are spelled out
// here rather than left to `format("L")`.
const DAY_BY_LANGUAGE: Record<string, string> = {
  cs: "D. M. YYYY",
  en: "MMM D, YYYY",
};

function formatDay(day: string | null, language: string): string | null {
  if (day === null) return null;
  return dayjs(day).format(pattern(DAY_BY_LANGUAGE, language));
}

// How the chosen period reads on the card's eyebrow. A preset is named; anything else is
// spelled out, so a period the user typed is never hidden behind a word.
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
