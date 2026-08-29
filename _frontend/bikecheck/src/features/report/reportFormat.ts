// How a Report writes its own figures. A document is read in the language and currency it
// was frozen in, never the reader's — so nothing here takes the app's locale.
import { formatCost } from "@/utils/money";
import type { ReportBike, ReportComponent } from "./report.types";

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
