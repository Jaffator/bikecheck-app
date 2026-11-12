// A pending Strava activity as the client reads it; shared by the Pending list and the check-in prompt.
import type { strava_pending_activities } from '@prisma/client';
import type { ResponseCheckInPendingDto } from '../ride/dto/response-ride.dto';
import type { RideWear } from '../service-tracking/ride-wear';
import type { WearPreview } from '../service-tracking/service-tracking.service';
import { ResponsePendingStravaDto } from './dto/response-pending-strava.dto';
import type { StravaActivityData } from './strava.service';

// Strava marks a ride only the athlete may see as `only_me`, older payloads as `private`.
export function isPrivateActivity(rawJson: unknown): boolean {
  const activity = rawJson as { visibility?: unknown; private?: unknown } | null | undefined;
  return activity?.visibility === 'only_me' || activity?.private === true;
}

// Analyses stored before the route was lifted out still carry it in the raw blob; null without GPS.
export function routeOfAnalysis(analyzed: StravaActivityData['analyzedData']): string | null {
  return analyzed.summary_polyline ?? (analyzed.rawJson?.map?.summary_polyline as string | undefined) ?? null;
}

// Lifts the ride's own figures out of the stored analysis, so the client gets
// a flat row instead of the whole raw Strava blob.
export function toPendingDto(activity: strava_pending_activities): ResponsePendingStravaDto {
  const analyzed = analysisOf(activity);
  const sportType = analyzed.rawJson?.sport_type as unknown;
  return {
    activity_id: String(activity.activity_id),
    gear_id: activity.gear_id,
    started_at: analyzed.started_at,
    // Rides stored before the name was lifted out still carry it in the raw
    // blob, so read that rather than showing them nameless.
    name: analyzed.name ?? (analyzed.rawJson?.name as string | undefined) ?? '',
    summary_polyline: routeOfAnalysis(analyzed),
    sport_type: typeof sportType === 'string' && sportType.length > 0 ? sportType : null,
    is_private: isPrivateActivity(analyzed.rawJson),
    distance_km: Math.round(analyzed.distance_km),
    duration_min: Math.round(analyzed.duration_min),
    elevation_up_m: Math.round(analyzed.elevation_up_m),
    elevation_down_m: roundedOrNull(analyzed.elevation_down_m),
    speed_avg: roundedOrNull(analyzed.speed_avg),
    max_speed_kmh: roundedOrNull(analyzed.max_speed_kmh),
    created_at: activity.created_at,
  };
}

// With its wear on every bike, so the drawer previews the picked one before the ride is saved.
export function toCheckInPendingDto(row: strava_pending_activities, preview: WearPreview): ResponseCheckInPendingDto {
  return { ...toPendingDto(row), wore_off_by_bike: preview(pendingWear(row)) };
}

// Older stored analyses may lack the figure; null reads as unknown, not zero.
function roundedOrNull(value: number | undefined): number | null {
  return typeof value === 'number' ? Math.round(value) : null;
}

// In the columns saveRide stores it under, so a ride with no bike yet previews like a saved one.
export function pendingWear(activity: strava_pending_activities): RideWear {
  const analyzed = analysisOf(activity);
  return {
    started_at: new Date(analyzed.started_at),
    distance_m: analyzed.distance_km * 1000,
    drivetrain_meters: analyzed.drivetrain_km * 1000,
    duration_min: analyzed.duration_min,
    suspension_min: analyzed.suspension_minutes,
    health_index_brake_pad: analyzed.health_index_brake_pad,
  };
}

// The column is Json; Strava parks it in this shape.
export function analysisOf(activity: strava_pending_activities): StravaActivityData['analyzedData'] {
  return activity.analyzed_data as StravaActivityData['analyzedData'];
}
