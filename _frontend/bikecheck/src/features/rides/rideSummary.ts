// What the ride card draws, from a confirmed ride or a pending one alike.
import type { Ride } from "./rides.types";

export interface RideSummary {
  name: string;
  started_at: string | null;
  distance_km: number;
  duration_min: number;
  elevation_up_m: number;
  summary_polyline: string | null;
  // Only a confirmed ride carries it so far.
  sport_type?: string | null;
}

// Whole km, the way a pending ride already arrives.
export function rideSummaryOf(ride: Ride): RideSummary {
  return {
    name: ride.name,
    started_at: ride.started_at,
    distance_km: Math.round((ride.distance_m ?? 0) / 1000),
    duration_min: ride.duration_min ?? 0,
    elevation_up_m: ride.elevation_up_m ?? 0,
    summary_polyline: ride.summary_polyline,
    sport_type: ride.sport_type,
  };
}
