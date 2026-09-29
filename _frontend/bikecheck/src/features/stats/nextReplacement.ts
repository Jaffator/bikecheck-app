// The next part to run out, read off the wear forecast. Desktop Home's figure and the empty
// Needs attention card both show it, so they cannot pick two different parts.
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { trackedPartLabel } from "@/features/service_tracking/attentionLevel";
import { remainingFigure } from "@/features/service_tracking/intervalFigures";
import { useWearForecast } from "./stats.queries";
import type { WearForecastItem } from "./stats.types";

export type NextReplacement = WearForecastItem & { projected_date: string };

// The pick and its four pieces; the part and the bike are names, what is left and the weeks are figures.
export interface NextReplacementView {
  item: NextReplacement;
  part: string;
  left: string;
  bike: string;
  weeks: string;
}

// Only a Replacement; overdue is the Due figure's, and without a projected date there is nothing to look ahead to.
export function nextReplacement(items: WearForecastItem[]): NextReplacement | null {
  return (
    items.find(
      (item): item is NextReplacement =>
        item.replace_action && item.level !== "overdue" && item.projected_date !== null,
    ) ?? null
  );
}

// Rounded up and never under one, so a few days out still reads as a week; the phone forecast counts the same.
export function weeksUntil(date: string): number {
  return Math.max(1, Math.ceil(dayjs(date).diff(dayjs().startOf("day"), "day") / 7));
}

// Undefined while the forecast loads; null when nothing is projected or the forecast failed.
export function useNextReplacement(): NextReplacementView | null | undefined {
  const { t, i18n } = useTranslation();
  const { data: forecast, isError } = useWearForecast();
  if (forecast === undefined) return isError ? null : undefined;

  const item = nextReplacement(forecast.items);
  if (item === null) return null;
  return {
    item,
    part: trackedPartLabel(item, t),
    left: remainingFigure(item, i18n.language),
    bike: bikeTitle(item),
    weeks: t("stats.aboutWeeks", { count: weeksUntil(item.projected_date) }),
  };
}
