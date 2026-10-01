// What "Uložit a další" writes for one ride of the check-in.
import type { PendingRide } from "@/features/strava/strava.types";
import type { CheckInItem } from "./checkInQueue";
import type { Ride, RideCheckIn } from "./rides.types";

// What the ride was ridden on: one of the rider's bikes, or none of them.
export type BikePick = { kind: "bike"; bikeId: number } | { kind: "notMine" };

export type CheckInSave =
  // A pending ride has no bike until one is picked, so nothing can be written yet.
  | { kind: "needsBike" }
  // The ride leaves with its wear, so a check-in has nothing left to belong to.
  | { kind: "dismissRide"; rideId: number }
  | { kind: "dismissPending"; activityId: string }
  | {
      kind: "save";
      rideId: number;
      // The bike the ride moves to; null leaves it where it is.
      moveTo: number | null;
      checkIn: RideCheckIn | null;
    }
  // The pending ride becomes a ride on the bike, which then takes the check-in.
  | { kind: "resolve"; activityId: string; bikeId: number; checkIn: RideCheckIn | null };

// No pick keeps the item's own bike: the ride's, or none yet for a pending ride.
export function pickedOf(item: CheckInItem, pick: BikePick | null): BikePick | null {
  return item.kind === "ride" ? (pick ?? ownBikeOf(item.ride)) : pick;
}

export function checkInSaveOf(item: CheckInItem, pick: BikePick | null, checkIn: RideCheckIn | null): CheckInSave {
  return item.kind === "ride"
    ? rideSaveOf(item.ride, pick ?? ownBikeOf(item.ride), checkIn)
    : pendingSaveOf(item.ride, pick, checkIn);
}

function ownBikeOf(ride: Ride): BikePick {
  return { kind: "bike", bikeId: ride.bike_id };
}

function rideSaveOf(ride: Ride, picked: BikePick, checkIn: RideCheckIn | null): CheckInSave {
  if (picked.kind === "notMine") return { kind: "dismissRide", rideId: ride.id };
  return { kind: "save", rideId: ride.id, moveTo: picked.bikeId === ride.bike_id ? null : picked.bikeId, checkIn };
}

function pendingSaveOf(ride: PendingRide, picked: BikePick | null, checkIn: RideCheckIn | null): CheckInSave {
  if (picked === null) return { kind: "needsBike" };
  if (picked.kind === "notMine") return { kind: "dismissPending", activityId: ride.activity_id };
  return { kind: "resolve", activityId: ride.activity_id, bikeId: picked.bikeId, checkIn };
}
