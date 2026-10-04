// Home's Period: how the address carries it, how a reading names it, and what it asks
// History Totals and the distance chart for.
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { ALL_TIME } from "@/features/service/servicePeriod";
import type { ServicePeriod } from "@/features/service/service.types";
import type { HomePeriod } from "./stats.types";

// A span the distance is summed over.
export type DistanceBucket = "day" | "month" | "year";

// What Home, Rides and Service open on; never written to the address.
export const DEFAULT_HOME_PERIOD: HomePeriod = "month";

// Nothing, or anything Home does not know, is the default, so a broken link still opens a working page.
export function parseHomePeriod(raw: string | null): HomePeriod {
  return raw === "year" || raw === "all" ? raw : DEFAULT_HOME_PERIOD;
}

// "September", "2026" or "all time".
export function homePeriodLabel(period: HomePeriod, language: string, t: TFunction): string {
  if (period === "all") return t("stats.periodAllTime");
  if (period === "year") return String(dayjs().year());
  return new Intl.DateTimeFormat(language, { month: "long" }).format(new Date());
}

// Open-ended, as the spend card's own window is, so the figure and the card never disagree.
export function homePeriodServices(period: HomePeriod): ServicePeriod {
  if (period === "all") return ALL_TIME;
  return { from: dayjs().startOf(period).format("YYYY-MM-DD"), to: null };
}
