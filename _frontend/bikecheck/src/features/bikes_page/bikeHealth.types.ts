// The health readings a bike card shows under its specs. The API does not serve
// these yet — there is no aggregated wear per bike, only health_index on each
// mounted component — so the card renders whatever it is given and nothing when
// given none. Assembling them is the job of whoever adds the endpoint.

// How urgent a reading is. Drives both the bar colour and the card's own badge,
// so the worst reading on a bike is what the badge reports.
export type HealthLevel = "good" | "warning" | "critical";

export interface HealthReading {
  // Translation key for the part or service ("Chain life", "Fork service").
  labelKey: string;
  // Right-hand text, already formatted: "780 km / 3000 km", "82% health",
  // "overdue (55h)". Reads too differently per metric to build from parts here.
  value: string;
  // How full the bar is, 0-1. A critical reading can still be full (an overdue
  // service is past its limit, not empty).
  fill: number;
  level: HealthLevel;
}

// The colour each level draws in. Bars and badges share the ramp so a red bar
// and a red badge mean the same thing.
export const HEALTH_COLORS: Record<HealthLevel, string> = {
  good: "#4ADE80",
  warning: "#EAB308",
  critical: "#EF4444",
};

// The badge in the photo's corner reports the bike as a whole, which is its worst
// reading — one overdue service makes the bike critical however healthy the rest
// is. A bike with no readings at all is reported as good rather than unknown.
export function overallLevel(readings: HealthReading[]): HealthLevel {
  if (readings.some((reading) => reading.level === "critical")) return "critical";
  if (readings.some((reading) => reading.level === "warning")) return "warning";
  return "good";
}
