// Mirrors the backend gear-linking DTOs (monolith strava/dto/*).

// A bike as Strava knows it. The id is the gear id ("b1234567").
export interface StravaBike {
  id: string;
  name: string;
}

// A BikeCheck bike, trimmed to what the linking screen needs. strava_gear_id is
// null until the bike is paired.
export interface GearLinkingBike {
  id: number;
  strava_gear_id: string | null;
  bikename: string | null;
  bike_brand: string;
  bike_model: string | null;
}

// Mirrors ResponseUnmatchedStravaGearDto.
export interface GearLinkingData {
  user_id: number;
  athlete_id: number;
  strava_bikes: StravaBike[];
  bikecheck_bikes: GearLinkingBike[];
}

// Mirrors GearLinkDto. One row of the sheet. A null gear id unpairs the bike:
// new rides stop arriving, the ones it already has stay.
export interface GearLink {
  stravaBikeId: string | null;
  bikecheckBikeId: number;
}

// Mirrors ResponsePendingStravaDto. A ride that arrived from Strava without a
// bike the app could resolve, waiting for the user to say which one it was.
// activity_id is a string because it is a BigInt on the backend — a JSON number
// would lose precision.
export interface PendingRide {
  activity_id: string;
  gear_id: string | null;
  started_at: string;
  // Strava's own title for the ride. Empty for rides stored before it was kept,
  // so the row falls back to the date.
  name: string;
  // Strava's simplified route, encoded. Null for rides recorded without GPS.
  summary_polyline: string | null;
  distance_km: number;
  duration_min: number;
  elevation_up_m: number;
  created_at: string;
}
