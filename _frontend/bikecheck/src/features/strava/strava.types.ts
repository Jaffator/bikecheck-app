// Mirrors the backend gear-linking DTOs (monolith strava/dto/*).

// A bike as Strava knows it. The id is the gear id ("b1234567").
export interface StravaBike {
  id: string;
  name: string;
}

// BikeCheck bike fields required by the linking screen.
export interface GearLinkingBike {
  id: number;
  strava_gear_id: string | null;
  bikename: string | null;
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
}

// Mirrors ResponseUnmatchedStravaGearDto.
export interface GearLinkingData {
  user_id: number;
  athlete_id: number;
  strava_bikes: StravaBike[];
  bikecheck_bikes: GearLinkingBike[];
}

// GearLinkDto row; null gear id unpairs the bike while retaining existing rides.
export interface GearLink {
  stravaBikeId: string | null;
  bikecheckBikeId: number;
}

// Pending Strava ride whose BigInt activity id remains a precision-safe string.
export interface PendingRide {
  activity_id: string;
  gear_id: string | null;
  started_at: string;
  // Strava ride title; older empty values fall back to the date.
  name: string;
  // Strava's simplified route, encoded. Null for rides recorded without GPS.
  summary_polyline: string | null;
  distance_km: number;
  duration_min: number;
  elevation_up_m: number;
  created_at: string;
}

// Joins available athlete name parts or returns null for a username fallback.
export function stravaDisplayName(user: { strava_firstname: string | null; strava_lastname: string | null }): string | null {
  const name = [user.strava_firstname, user.strava_lastname].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}
