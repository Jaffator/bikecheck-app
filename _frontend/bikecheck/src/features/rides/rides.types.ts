// Mirrors backend ride DTOs.
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

// What a ride wore off one Tracked Action, named by the same pieces the Tracked Action carries.
export type WoreOffLine = Pick<
  TrackedAction,
  | "component_mounted_id"
  | "event_action_id"
  | "component_type"
  | "component_type_i18n_key"
  | "position"
  | "action_name"
  | "action_i18n_key"
  | "replace_action"
  | "measure"
> & {
  // The ride's own wear on the reading's measure: km, minutes or the wear index.
  amount: number;
  // Whole percent of the way to due before the ride and once it ended.
  before: number;
  after: number;
};

export type CheckInStatus = "OK" | "ISSUE";

export type CheckInSymptom =
  | "CREAK"
  | "SHIFTING_SKIPS"
  | "SOFT_BRAKE"
  | "FORK_SETUP"
  | "SHOCK_SETUP"
  | "TIRE_LOSES_AIR"
  | "HEADSET_PLAY"
  | "OTHER";

// How the bike rode on a ride, as its rider said; symptoms only under ISSUE.
export interface RideCheckIn {
  status: CheckInStatus;
  symptoms: CheckInSymptom[];
  note: string | null;
}

// A ride confirmed on a bike.
export interface Ride {
  id: number;
  // String preserves the backend BigInt value.
  activity_strava_id: string | null;
  bike_id: number;
  // Preserved when the bike is unavailable.
  bike_name: string | null;
  // Strava's own title for the ride. Strava always sends one, so this is never
  // null — the empty string is only the type-level floor.
  name: string;
  started_at: string | null;
  distance_m: number | null;
  duration_min: number | null;
  elevation_up_m: number | null;
  elevation_down_m: number | null;
  speed_avg: number | null;
  max_speed_kmh: number | null;
  // Strava's own simplified route, lifted out of the stored activity by the API so the
  // list never carries the raw payload. Null for a ride recorded without GPS.
  summary_polyline: string | null;
  // The Tracked Actions the ride pushed closest to due, at most three; empty where it wore off nothing.
  wore_off: WoreOffLine[];
  // Null until the rider says how the bike rode.
  check_in: RideCheckIn | null;
}

export interface RidePage {
  items: Ride[];
  total: number;
}
