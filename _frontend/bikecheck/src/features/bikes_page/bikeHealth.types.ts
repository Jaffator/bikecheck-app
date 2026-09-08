import type { AttentionLevel } from "@/features/service_tracking/serviceTracking.types";

// What the badge and the bars call an Attention Level. The domain names the bands, so this
// is that name read in the badge's own voice rather than a second list of values.
export type HealthLevel = AttentionLevel;

export interface HealthReading {
  // Already in the reader's language: a part and an action are catalogue names, which
  // resolve through their own keys or fall back to what the owner typed.
  label: string;
  // Preformatted reading value ("3 200 / 4 000 km").
  value: string;
  // How much of the interval is left, between zero and one. A part past due has none left,
  // which is where the bar stops even though the percentage does not.
  fill: number;
  level: HealthLevel;
}

// Share health-level colors across bars and badges.
export const HEALTH_COLORS: Record<HealthLevel, string> = {
  good: "#4ADE80",
  warning: "#EAB308",
  critical: "#EF4444",
  // Past red rather than a deeper red: another red at badge size is the same colour, and
  // going purple above red is the escalation an air-quality index already taught people.
  overdue: "#C084FC",
};

// The one reading a card leads with: the worst level, and among equals the emptiest bar.
// The rest of the readings belong on the bike's own page, not in the garage.
export function worstReading(readings: HealthReading[]): HealthReading | null {
  const level = overallLevel(readings);
  const worst = readings.filter((reading) => reading.level === level);
  if (worst.length === 0) return null;
  return worst.reduce((lowest, reading) => (reading.fill < lowest.fill ? reading : lowest));
}

// Report the bike's worst health level, defaulting to good.
export function overallLevel(readings: HealthReading[]): HealthLevel {
  if (readings.some((reading) => reading.level === "overdue")) return "overdue";
  if (readings.some((reading) => reading.level === "critical")) return "critical";
  if (readings.some((reading) => reading.level === "warning")) return "warning";
  return "good";
}
