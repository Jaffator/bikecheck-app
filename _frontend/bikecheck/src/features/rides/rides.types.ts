// Mirrors backend ride DTOs.

// A ride confirmed on a bike.
export interface Ride {
  id: number;
  // String preserves the backend BigInt value.
  activity_strava_id: string | null;
  bike_id: number;
  // Preserved when the bike is unavailable.
  bike_name: string | null;
  started_at: string | null;
  distance_m: number | null;
  duration_min: number | null;
  elevation_up_m: number | null;
  elevation_down_m: number | null;
  speed_avg: number | null;
  max_speed_kmh: number | null;
  // Stored raw Strava activity.
  json_data: unknown;
}

export interface RidePage {
  items: Ride[];
  total: number;
}
