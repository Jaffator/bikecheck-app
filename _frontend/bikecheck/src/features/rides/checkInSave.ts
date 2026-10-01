// What "Uložit a další" writes for one ride of the check-in.
import type { RideCheckIn } from "./rides.types";

export interface CheckInSave {
  // The bike the ride moves to; null leaves it where it is.
  moveTo: number | null;
  checkIn: RideCheckIn | null;
}

export function checkInSaveOf(rideBikeId: number, pickedBikeId: number, checkIn: RideCheckIn | null): CheckInSave {
  return { moveTo: pickedBikeId === rideBikeId ? null : pickedBikeId, checkIn };
}
