// What the check-in walks: rides on a bike and rides still waiting for one, in one queue.
import type { CheckInPendingRide, CheckInPrompt, CheckInRide, WoreOffLine } from "./rides.types";

export type CheckInItem = { kind: "ride"; ride: CheckInRide } | { kind: "pending"; ride: CheckInPendingRide };

// Newest first by start, whichever list a ride came from.
export function checkInQueueOf(prompt: CheckInPrompt): CheckInItem[] {
  const items: CheckInItem[] = [
    ...prompt.rides.map((ride): CheckInItem => ({ kind: "ride", ride })),
    ...prompt.pending.map((ride): CheckInItem => ({ kind: "pending", ride })),
  ];
  return items.sort((a, b) => startOf(b) - startOf(a));
}

// "Odepíše" for the picked bike; with no bike picked, or none of the rider's, there is nothing to wear.
export function woreOffOn(item: CheckInItem, bikeId: number | null): WoreOffLine[] {
  if (bikeId === null) return [];
  return item.ride.wore_off_by_bike.find((bike) => bike.bike_id === bikeId)?.wore_off ?? [];
}

// A ride with no start sorts last.
function startOf(item: CheckInItem): number {
  return item.ride.started_at === null ? Number.MIN_SAFE_INTEGER : Date.parse(item.ride.started_at);
}
