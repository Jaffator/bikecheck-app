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
