// What the check-in walks: rides on a bike and rides still waiting for one, in one queue.
import type { PendingRide } from "@/features/strava/strava.types";
import type { CheckInPrompt, Ride } from "./rides.types";

export type CheckInItem = { kind: "ride"; ride: Ride } | { kind: "pending"; ride: PendingRide };

// Newest first by start, whichever list a ride came from.
export function checkInQueueOf(prompt: CheckInPrompt): CheckInItem[] {
  const items: CheckInItem[] = [
    ...prompt.rides.map((ride): CheckInItem => ({ kind: "ride", ride })),
    ...prompt.pending.map((ride): CheckInItem => ({ kind: "pending", ride })),
  ];
  return items.sort((a, b) => startOf(b) - startOf(a));
}

// A ride with no start sorts last.
function startOf(item: CheckInItem): number {
  return item.ride.started_at === null ? Number.MIN_SAFE_INTEGER : Date.parse(item.ride.started_at);
}
