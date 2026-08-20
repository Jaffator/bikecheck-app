// Mirrors the backend ride DTOs (monolith ride/dto/*).

// A ride the user has confirmed onto a bike. Distances are metres and the
// backend's own units — the card converts for display.
export interface Ride {
  id: number;
  // Strava's activity id, as a string: it is a BigInt on the backend and a
  // JSON number would lose precision. Null for a ride not from Strava.
  activity_strava_id: string | null;
  bike_id: number;
  // Carried on the ride: a ride outlives the bike it was ridden on, so the
  // client's bike list cannot always name it.
  bike_name: string | null;
  started_at: string | null;
  distance_m: number | null;
  duration_min: number | null;
  elevation_up_m: number | null;
  elevation_down_m: number | null;
  speed_avg: number | null;
  max_speed_kmh: number | null;
  // The raw Strava activity as it was stored. Only the route polyline is read
  // out of it — see ridePolyline.
  json_data: unknown;
}

export interface RidePage {
  items: Ride[];
  total: number;
}
