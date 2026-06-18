// Shared contract for the gear data exchanged between strava-service and monolith.
// Single source of truth — both apps import these types via the "@contracts/*" path alias.
// Declaration file (.d.ts) on purpose: type-only, never emitted, excluded from rootDir checks.

export interface StravaBike {
  id: string;
  name: string;
}

export interface StravaGearResponse {
  athlete_id: number;
  bikes: StravaBike[];
}
