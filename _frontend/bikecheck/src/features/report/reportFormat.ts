// How a Report writes its own figures. A document is read in the language and currency it
// was frozen in, never the reader's — so nothing here takes the app's locale.
import { formatCost } from "@/utils/money";
import type { ReportBike, ReportComponent, ReportPeriod } from "./report.types";
import type { ReportHeadings } from "./reportHeadings";

// The paper the document is printed on. Fixed values rather than theme tokens: the app is
// dark and the document is not, and a report must read the same wherever it is opened.
export const REPORT_PAPER = {
  sheet: "#ffffff",
  ink: "#1c1c1c",
  inkMuted: "#6b6b6b",
  rule: "#e4e4e4",
  ruleStrong: "#c9c9c9",
  accent: "#827a35",
  accentWash: "#f4f0d7",
} as const;

// A date as the document's own language writes it.
export function reportDate(iso: string | null, language: string): string | null {
  if (iso === null) return null;
  return new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

// A figure in the currency the document was priced in.
export function reportCost(amount: number, snapshot: { currency: string; language: string }): string {
  return formatCost(amount, snapshot.currency, snapshot.language);
}

// A distance the document's language writes with its own grouping.
export function reportNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language).format(value);
}

// Ride time as the document reports it: whole hours, which is the resolution a reader of a
// maintenance record cares about.
export function reportRideTime(minutes: number, language: string): string {
  return `${reportNumber(Math.round(minutes / 60), language)} h`;
}

// The bike as a maintenance record names it: what it is, not the nickname its owner gave
// it. A report of a bike that has since been deleted has nothing left to name it with.
export function reportBikeName(bike: ReportBike): string | null {
  const named = [bike.brand, bike.model, bike.year].filter(Boolean).join(" ").trim();
  return named === "" ? null : named;
}

// The part in full: which kind it was, where it sat, and what the owner called it.
export function reportComponentLabel(component: ReportComponent): string {
  const position = component.position ? ` (${component.position})` : "";
  const described = component.description?.trim();
  const kind = `${component.type}${position}`;
  return described ? `${kind}: ${described}` : kind;
}

// How the Period the document covers reads on it. Both ends open is all time, which is the
// only Period that also counts the Services carrying no Service Date.
export function reportPeriodLabel(period: ReportPeriod, heading: ReportHeadings, language: string): string {
  const from = reportDate(period.from, language);
  const to = reportDate(period.to, language);

  if (from !== null && to !== null) return `${from} – ${to}`;
  if (from !== null) return `${heading.periodFrom} ${from}`;
  if (to !== null) return `${heading.periodTo} ${to}`;
  return heading.allTime;
}

// The year a Service belongs to, which is the division a Period Report reads in. A Service
// carrying no Service Date belongs to no year, and is listed last under its own heading.
export function reportServiceYear(serviceDate: string | null): string | null {
  return serviceDate === null ? null : serviceDate.slice(0, 4);
}
