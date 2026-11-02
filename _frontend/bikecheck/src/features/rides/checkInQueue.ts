// What the check-in walks: rides on a bike and rides still waiting for one, in one queue.
import type { BikeWoreOff, CheckInPendingRide, CheckInPrompt, CheckInRide, WoreOffLine } from "./rides.types";

export type CheckInItem = { kind: "ride"; ride: CheckInRide } | { kind: "pending"; ride: CheckInPendingRide };

// The locked ride drawer's walk through the queue.
export interface QueueWalk {
  // A snapshot: saving refreshes the prompt, and the walk must not shift under the rider.
  queue: CheckInItem[];
  position: number;
  // Kept once the last ride is answered, so the closing sheet stays locked.
  done: boolean;
}

// Newest first by start, whichever list a ride came from.
export function checkInQueueOf(prompt: CheckInPrompt): CheckInItem[] {
  const items: CheckInItem[] = [
    ...prompt.rides.map((ride): CheckInItem => ({ kind: "ride", ride })),
    ...prompt.pending.map((ride): CheckInItem => ({ kind: "pending", ride })),
  ];
  return items.sort((a, b) => startOf(b) - startOf(a));
}

// Starts a walk on new rides, or brings a linked ride up in the one under way; the same walk when neither.
export function walkFor(
  walk: QueueWalk | null,
  prompt: CheckInPrompt | undefined,
  activityId: string | null,
): QueueWalk | null {
  if (walk !== null && !walk.done) return withLinkedAt(walk, activityId);
  return (prompt === undefined ? null : startWalk(prompt, activityId)) ?? walk;
}

// Null with nothing new; a ride a notification opened goes first.
function startWalk(prompt: CheckInPrompt, activityId: string | null): QueueWalk | null {
  const queue = checkInQueueOf(prompt);
  if (queue.length === 0) return null;
  return withLinkedAt({ queue, position: 0, done: false }, activityId);
}

// The linked ride moves to where the walk stands; one already answered or not in it changes nothing.
function withLinkedAt(walk: QueueWalk, activityId: string | null): QueueWalk {
  const index = indexOf(walk.queue, activityId);
  if (index <= walk.position) return walk;
  const queue = [...walk.queue];
  const [linked] = queue.splice(index, 1);
  queue.splice(walk.position, 0, linked);
  return { ...walk, queue };
}

// The walk takes over a link to the ride on screen or one still ahead, so no second drawer opens it.
export function walkHolds(walk: QueueWalk, activityId: string | null): boolean {
  return !walk.done && indexOf(walk.queue, activityId) >= walk.position;
}

export function nextOf(walk: QueueWalk): QueueWalk {
  return walk.position + 1 < walk.queue.length ? { ...walk, position: walk.position + 1 } : { ...walk, done: true };
}

export function currentOf(walk: QueueWalk | null): CheckInItem | null {
  return walk === null || walk.done ? null : (walk.queue[walk.position] ?? null);
}

// Whether a prompt would walk this ride, so its notification leaves it to the walk.
export function promptHolds(prompt: CheckInPrompt | undefined, activityId: string): boolean {
  return prompt !== undefined && indexOf(checkInQueueOf(prompt), activityId) >= 0;
}

// "Odepíše" for the picked bike; with no bike picked, or none of the rider's, there is nothing to wear.
export function woreOffOn(byBike: BikeWoreOff[], bikeId: number | null): WoreOffLine[] {
  if (bikeId === null) return [];
  return byBike.find((bike) => bike.bike_id === bikeId)?.wore_off ?? [];
}

// The Strava activity a notification names: `?ride=` for a ride on a bike, `?pending=` for an Unassigned Ride.
export function rideLinkOf(params: URLSearchParams): string | null {
  return params.get("ride") ?? params.get("pending");
}

// The link the walk took, gone; an Unassigned Ride's keeps the rider on its tab.
export function withoutRideLink(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  if (next.has("pending")) next.set("tab", "pending");
  next.delete("ride");
  next.delete("pending");
  return next;
}

// -1 when the ride is not in the queue.
function indexOf(queue: CheckInItem[], activityId: string | null): number {
  if (activityId === null) return -1;
  return queue.findIndex((item) => activityIdOf(item) === activityId);
}

function activityIdOf(item: CheckInItem): string | null {
  return item.kind === "ride" ? item.ride.activity_strava_id : item.ride.activity_id;
}

// A ride with no start sorts last.
function startOf(item: CheckInItem): number {
  return item.ride.started_at === null ? Number.MIN_SAFE_INTEGER : Date.parse(item.ride.started_at);
}
