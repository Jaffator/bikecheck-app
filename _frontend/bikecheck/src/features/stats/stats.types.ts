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
  // Metres climbed, minutes ridden and kcal burnt per UTC day, indexed like daily_m.
  daily_elevation_m: number[];
  daily_time_min: number[];
  daily_calories: number[];
  // Whole km of the sum of daily_m.
  total_km: number;
  // The rides started in the window, the sum of their minutes and of their kcal.
  ride_count: number;
  time_min: number;
  calories: number;
}

// The garage's previous Period of the same kind: totals up to the same day, days over the whole of it.
export interface DistancePrevious {
  // Its first UTC day, index 0 of the days.
  from: string;
  meters: number;
  elevation_m: number;
  time_min: number;
  calories: number;
  daily_m: number[];
  daily_elevation_m: number[];
  daily_time_min: number[];
  daily_calories: number[];
}

export interface Distance {
  // UTC days daily_m covers, inclusive YYYY-MM-DD.
  from: string;
  to: string;
  // Every bike ridden in the window, highest total first.
  bikes: DistanceBike[];
  // Null for all time, which has no Period before it.
  previous: DistancePrevious | null;
}

// The span desktop Home reads its figures and charts over; no Period is the phone's year.
export type HomePeriod = "month" | "year" | "all";

// A Period with one before it to compare with.
export type ComparedPeriod = Exclude<HomePeriod, "all">;

export type ComparedDistance = Distance & { previous: DistancePrevious };

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
  // Every tracked action, soonest to run out first, overdue first.
  items: WearForecastItem[];
}
