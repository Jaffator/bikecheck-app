import { Prisma } from '@prisma/client';
import type { WearMeasure } from './attention-level';

// A ride as far as wear goes: when and on which bike it was ridden, and what it grew.
export const wearRideSelect = {
  id: true,
  bike_id: true,
  started_at: true,
  distance_m: true,
  drivetrain_meters: true,
  duration_min: true,
  suspension_min: true,
  health_index_brake_pad: true,
} satisfies Prisma.ridesSelect;
export type WearRide = Prisma.ridesGetPayload<{ select: typeof wearRideSelect }>;

// The ride columns strava.service.ts grows each accumulator by, so a reading is rebuilt from the same wear.
export const RIDE_WEAR: Record<WearMeasure, (ride: WearRide) => number> = {
  total_km: (ride) => (ride.distance_m ?? 0) / 1000,
  drivetrain_km: (ride) => (ride.drivetrain_meters ?? 0) / 1000,
  total_time_min: (ride) => ride.duration_min ?? 0,
  suspension_min: (ride) => ride.suspension_min ?? 0,
  health_index: (ride) => ride.health_index_brake_pad ?? 0,
};
