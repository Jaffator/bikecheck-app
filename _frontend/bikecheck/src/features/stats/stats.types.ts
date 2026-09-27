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

export interface SpendSegment {
  key: string;
  amount: number;
}

export interface SpendBike {
  bike_id: number;
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
  total: number;
  // Same keys and order as the categories.
  segments: SpendSegment[];
}

export interface Spend {
  year: number;
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
  // Whole km so far, one per entry of `weeks`.
  cumulative_km: number[];
  total_km: number;
}

export interface Distance {
  year: number;
  // Monday of each week (ISO date, UTC), up to the current week.
  weeks: string[];
  bikes: DistanceBike[];
}

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
