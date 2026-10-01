// A pending Strava activity as the client reads it; shared by the Pending list and the check-in prompt.
import type { strava_pending_activities } from '@prisma/client';
import { ResponsePendingStravaDto } from './dto/response-pending-strava.dto';
import type { StravaActivityData } from './strava.service';

// Lifts the ride's own figures out of the stored analysis, so the client gets
// a flat row instead of the whole raw Strava blob.
export function toPendingDto(activity: strava_pending_activities): ResponsePendingStravaDto {
  const analyzed = activity.analyzed_data as StravaActivityData['analyzedData'];
  const sportType = analyzed.rawJson?.sport_type as unknown;
  return {
    activity_id: String(activity.activity_id),
    gear_id: activity.gear_id,
    started_at: analyzed.started_at,
    // Rides stored before the name was lifted out still carry it in the raw
    // blob, so read that rather than showing them nameless.
    name: analyzed.name ?? (analyzed.rawJson?.name as string | undefined) ?? '',
    // Same fallback as the name: rides stored before the route was lifted out
    // still carry it in the raw blob. Null for rides recorded without GPS.
    summary_polyline:
      analyzed.summary_polyline ?? (analyzed.rawJson?.map?.summary_polyline as string | undefined) ?? null,
    sport_type: typeof sportType === 'string' && sportType.length > 0 ? sportType : null,
    distance_km: Math.round(analyzed.distance_km),
    duration_min: Math.round(analyzed.duration_min),
    elevation_up_m: Math.round(analyzed.elevation_up_m),
    created_at: activity.created_at,
  };
}
