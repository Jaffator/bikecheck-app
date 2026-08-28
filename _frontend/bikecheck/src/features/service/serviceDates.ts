// How a Service's date reads on the history, and how the full history divides into Month
// Groups. The card, the grouped row and the group header all format here, so the three
// can never disagree about what month a Service belongs to.
import dayjs, { type Dayjs } from "dayjs";
import type { ServiceHistoryItem } from "./service.types";

// Czech writes the day first, English the month. Both are month names rather than the
// numeric dates the rest of the app uses - see docs/ui/card-surface.md.
const LONG_DATE_BY_LANGUAGE: Record<string, string> = {
  cs: "D. MMM YYYY",
  en: "MMM D, YYYY",
};

const SHORT_DATE_BY_LANGUAGE: Record<string, string> = {
  cs: "D. MMM",
  en: "MMM D",
};

// The language dayjs is holding, which i18n keeps aligned with i18next. Exported because
// the Period's dates pick their pattern the same way - see servicePeriod.ts.
export function pattern(table: Record<string, string>, language: string): string {
  return table[language.split("-")[0]] ?? table.en;
}

// The date on a standalone card: the year is there because nothing above the card says it.
export function formatServiceDate(date: string, language: string): string {
  return dayjs(date).format(pattern(LONG_DATE_BY_LANGUAGE, language)).toUpperCase();
}

// The date on a row inside a Month Group, where the header already carries the year.
export function formatServiceDateShort(date: string, language: string): string {
  return dayjs(date).format(pattern(SHORT_DATE_BY_LANGUAGE, language)).toUpperCase();
}

// The heading over one Month Group.
export function formatMonthHeading(month: Dayjs): string {
  return month.format("MMMM YYYY").toUpperCase();
}

// One month of the history. A dated group knows its month; the group holding Services the
// user never dated has none, and the header names it instead.
export interface ServiceMonthGroup {
  // Stable across renders and unique per group, so it keys the list.
  key: string;
  month: Dayjs | null;
  services: ServiceHistoryItem[];
}

// The key the undated group carries; no month can produce it.
const UNDATED_KEY = "undated";

// Divides an already-sorted history into Month Groups, keeping the order it arrived in.
// Services with no Service Date fall into one group of their own, which lands last because
// the API sorts them there - they are not assigned the month they were recorded in.
export function groupServicesByMonth(services: ServiceHistoryItem[]): ServiceMonthGroup[] {
  const groups: ServiceMonthGroup[] = [];

  for (const service of services) {
    const month = service.service_date === null ? null : dayjs(service.service_date).startOf("month");
    const key = month === null ? UNDATED_KEY : month.format("YYYY-MM");
    const current = groups[groups.length - 1];

    // Consecutive services of the same month join the group already open; the list is
    // sorted, so a month never reappears once left behind.
    if (current !== undefined && current.key === key) {
      current.services.push(service);
      continue;
    }

    groups.push({ key, month, services: [service] });
  }

  return groups;
}
