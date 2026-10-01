// Mirrors backend ride DTOs.
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import type { PendingRide } from "@/features/strava/strava.types";

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
  // Strava's sport type, e.g. "MountainBikeRide"; null where Strava sent none.
  sport_type: string | null;
  // When the ride reached BikeCheck, not when it was ridden.
  created_at: string | null;
  // The Tracked Actions the ride pushed closest to due, at most three; empty where it wore off nothing.
  wore_off: WoreOffLine[];
  // Null until the rider says how the bike rode.
  check_in: RideCheckIn | null;
}

// What a ride wears off one bike: its own wore_off on the bike it is saved on, a preview on any other.
export interface BikeWoreOff {
  bike_id: number;
  wore_off: WoreOffLine[];
}

// A ride in the check-in carries what it wears off each of the rider's active bikes.
export type CheckInRide = Ride & { wore_off_by_bike: BikeWoreOff[] };
export type CheckInPendingRide = PendingRide & { wore_off_by_bike: BikeWoreOff[] };

// What the check-in walks: rides on a bike without a check-in, and rides still waiting for a bike.
export interface CheckInPrompt {
  rides: CheckInRide[];
  pending: CheckInPendingRide[];
}

// A week holding rides on the page, totalled over all its rides inside the filter.
export interface RideWeek {
  // The week's Monday in the rider's time zone, YYYY-MM-DD.
  start: string;
  count: number;
  km: number;
  time_min: number;
}

// Every ride inside the filter added up, not just the page.
export interface RideFigures {
  count: number;
  distance_m: number;
  time_min: number;
  elevation_up_m: number;
  elevation_down_m: number;
  // The same span just before the filter; null when the filter is every ride.
  previous_distance_m: number | null;
}

export interface RidePage {
  items: Ride[];
  total: number;
  weeks: RideWeek[];
  figures: RideFigures;
}
