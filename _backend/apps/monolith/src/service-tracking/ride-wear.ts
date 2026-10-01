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

// The part kinds that carry a type-specific accumulator; syncing a ride and moving it split parts alike.
export const SUSPENSION_PARTS = ['Shock', 'Fork'];
export const BRAKE_PAD_PART = 'Brake pad';
export const DRIVETRAIN_PARTS = ['Chain', 'Cassette', 'Chainring'];

// Only what is on the machine now: a part that came off, or one that should never have
// existed, is not part of it any more and owes it nothing.
export const MOUNTED = { is_active: true, is_deleted: { not: true } } satisfies Prisma.components_mountedWhereInput;

// The parts a ride can wear, so a dismounted part stops accumulating.
export function mountedPartsWhere(bikeId: number): Prisma.components_mountedWhereInput {
  return { bike_id: bikeId, ...MOUNTED };
}

// A part carries rides from the day after its mount day (ADR 0001); an undated ride or part is assumed to.
export function carried(part: { mounted_at: Date | null }, ride: Pick<WearRide, 'started_at'>): boolean {
  return ride.started_at === null || part.mounted_at === null || endOfDay(part.mounted_at) < ride.started_at;
}

// A Service Date or mount day is a whole day, so a ride on it counts as ridden before the work.
export function endOfDay(day: Date): Date {
  const end = new Date(day);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

// The ride columns strava.service.ts grows each accumulator by, so a reading is rebuilt from the same wear.
export const RIDE_WEAR: Record<WearMeasure, (ride: WearRide) => number> = {
  total_km: (ride) => (ride.distance_m ?? 0) / 1000,
  drivetrain_km: (ride) => (ride.drivetrain_meters ?? 0) / 1000,
  total_time_min: (ride) => ride.duration_min ?? 0,
  suspension_min: (ride) => ride.suspension_min ?? 0,
  health_index: (ride) => ride.health_index_brake_pad ?? 0,
};
