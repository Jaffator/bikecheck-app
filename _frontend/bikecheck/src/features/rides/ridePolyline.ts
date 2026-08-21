// Extracts a route polyline from stored Strava data.

interface StravaMap {
  summary_polyline?: unknown;
}

interface StravaActivity {
  map?: StravaMap;
}

// Returns the encoded polyline or null.
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
      // Invalid JSON has no route.
      return null;
    }
  }
  return typeof jsonData === "object" && jsonData !== null ? (jsonData as StravaActivity) : null;
}
