// What "Uložit a další" writes for one ride of the check-in.
import type { RideCheckIn } from "./rides.types";

// What the ride was ridden on: one of the rider's bikes, or none of them.
export type BikePick = { kind: "bike"; bikeId: number } | { kind: "notMine" };

export type CheckInSave =
  // The ride leaves with its wear, so a check-in has nothing left to belong to.
  | { kind: "dismiss" }
  | {
      kind: "save";
      // The bike the ride moves to; null leaves it where it is.
      moveTo: number | null;
      checkIn: RideCheckIn | null;
    };

export function checkInSaveOf(rideBikeId: number, pick: BikePick, checkIn: RideCheckIn | null): CheckInSave {
  if (pick.kind === "notMine") return { kind: "dismiss" };
  return { kind: "save", moveTo: pick.bikeId === rideBikeId ? null : pick.bikeId, checkIn };
}
