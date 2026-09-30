// Home's charts, as the API serves them. An Archived Bike is in none of them (ADR 0024).
import type { GarageTrackedAction } from "@/features/service_tracking/tracking.types";

export interface SpendCategory {
  // "group:<id>", "other" (outside the top three) or "unassigned" (no category).
  key: string;
  component_group_id: number | null;
  group_name: string | null;
  i18n_key: string | null;
  amount: number;
}

export interface SpendBike {
  bike_id: number;
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
  total: number;
  // Every Service in the window, the free ones too.
  service_count: number;
}

export interface Spend {
  // The Service Dates counted, inclusive YYYY-MM-DD; null is an open end, both null is all time.
  from: string | null;
  to: string | null;
  currency: string | null;
  total: number;
  categories: SpendCategory[];
  bikes: SpendBike[];
}

export interface DistanceBike {
  bike_id: number;
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
  // Rank by id among all the owner's bikes, archived included, so a colour never shifts.
  color_index: number;
  // Metres per UTC day, index 0 = the served `from`, one entry per day through `to`.
  daily_m: number[];
  // Whole km of the sum of daily_m.
  total_km: number;
  // The rides started in the window and the sum of their minutes.
  ride_count: number;
  time_min: number;
}

export interface Distance {
  // UTC days daily_m covers, inclusive YYYY-MM-DD.
  from: string;
  to: string;
  // Every bike ridden in the window, highest total first.
  bikes: DistanceBike[];
}

// The span desktop Home reads its figures and charts over; no Period is the phone's year.
export type HomePeriod = "month" | "year" | "all";

export interface WearPoint {
  // ISO date, UTC.
  date: string;
  percentage: number;
}

export interface WearForecastItem extends GarageTrackedAction {
  // In the reading's unit; null when the bike was not ridden in the last 4 weeks.
  pace_per_week: number | null;
  // Null when overdue or without pace.
  projected_date: string | null;
  // From the Wear Baseline moment, each week end, then today at the current percentage.
  points: WearPoint[];
}

export interface WearForecast {
  // Up to 5, soonest to run out first, overdue first.
  items: WearForecastItem[];
}
