// Digs the route out of a ride's stored Strava payload.
//
// json_data holds the raw Strava activity, and saveRide writes it with
// JSON.stringify into a json column — so what comes back is usually a string
// holding JSON, not an object. Rides written by other paths, or before that,
// can be either. Both shapes are read here so the card does not have to care.

interface StravaMap {
  summary_polyline?: unknown;
}

interface StravaActivity {
  map?: StravaMap;
}

// Returns the encoded polyline, or null when the ride has no route — a turbo
// session has no shape, and older rides may have no payload at all.
export function ridePolyline(jsonData: unknown): string | null {
  const activity = asActivity(jsonData);
  const polyline = activity?.map?.summary_polyline;
  return typeof polyline === "string" && polyline.length > 0 ? polyline : null;
}

function asActivity(jsonData: unknown): StravaActivity | null {
  if (typeof jsonData === "string") {
    try {
      return asActivity(JSON.parse(jsonData) as unknown);
    } catch {
      // Not JSON after all — the ride simply draws no route.
      return null;
    }
  }
  return typeof jsonData === "object" && jsonData !== null ? (jsonData as StravaActivity) : null;
}
