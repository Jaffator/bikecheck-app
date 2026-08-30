// How one row of the owner's Reports list names what its document covers. Written here
// alone, so two rows can never phrase the same span differently.
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { pattern } from "@/features/service/serviceDates";
import type { ReportCovers, ReportKind } from "./report.types";

// Czech writes the day first, English the month — the same split the history's dates make.
const DAY_BY_LANGUAGE: Record<string, string> = {
  cs: "D. M. YYYY",
  en: "MMM D, YYYY",
};

// What the app calls each of the three documents. The Export sheet titles itself from the
// same map, so a Report is never named one thing while it is made and another once listed.
export const REPORT_KIND_KEY: Record<ReportKind, string> = {
  SERVICE: "report.titleService",
  PERIOD: "report.titlePeriod",
  BIKECHECK: "report.titleBikecheck",
};

// A day as the reader's language writes it. The document itself is read in the language it
// was frozen in; this list is the owner's own screen, so it follows the app.
export function reportDay(day: string | null, language: string): string | null {
  if (day === null) return null;
  return dayjs(day).format(pattern(DAY_BY_LANGUAGE, language));
}

// What the document covers, in as few words as it takes to tell two links apart: the day
// the work happened, the span a Period was exported for, or the bike as it stood.
export function coversLabel(kind: ReportKind, covers: ReportCovers, t: TFunction, language: string): string {
  if (kind === "BIKECHECK") return t("report.coversNow");

  const from = reportDay(covers.from, language);
  const to = reportDay(covers.to, language);

  // A Service opens and closes on the same day, and reads as that one day.
  if (from !== null && to !== null) return from === to ? from : `${from} – ${to}`;
  if (from !== null) return t("report.coversFrom", { date: from });
  if (to !== null) return t("report.coversTo", { date: to });
  return t("report.coversAll");
}
