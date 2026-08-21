// Define optional health readings for bike cards until API aggregation exists.
// Classify health urgency for bars and overall badges.
export type HealthLevel = "good" | "warning" | "critical";

export interface HealthReading {
  // Translation key for the part or service ("Chain life", "Fork service").
  labelKey: string;
  // Preformatted reading value.
  value: string;
  // Bar fill fraction between zero and one.
  fill: number;
  level: HealthLevel;
}

// Share health-level colors across bars and badges.
export const HEALTH_COLORS: Record<HealthLevel, string> = {
  good: "#4ADE80",
  warning: "#EAB308",
  critical: "#EF4444",
};

// Report the bike's worst health level, defaulting to good.
export function overallLevel(readings: HealthReading[]): HealthLevel {
  if (readings.some((reading) => reading.level === "critical")) return "critical";
  if (readings.some((reading) => reading.level === "warning")) return "warning";
  return "good";
}
