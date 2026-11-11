// What the ride drawer opens and derives: a ride on a bike or an Unassigned Ride, read alike.
import type { PendingRide } from "@/features/strava/strava.types";
import { checkInOf, isHalfFilled, sameCheckIn, type CheckInDraft } from "./checkIn";
import { woreOffOn } from "./checkInQueue";
import type { BikeWoreOff, Ride, WoreOffLine } from "./rides.types";

// Same kinds as CheckInItem, so a check-in queue item opens the drawer as it is.
export type RideItem = { kind: "ride"; ride: Ride } | { kind: "pending"; ride: PendingRide };

// What the ride was ridden on: one of the rider's bikes, or none of them.
export type BikePick = { kind: "bike"; bikeId: number } | { kind: "notMine" };

// The drawer locked on the walk through new rides: Save and Skip move on instead of closing it.
export interface RideWalk {
  position: number;
  total: number;
  // A queue ride carries its wear on every bike, so the picked one's shows before it is saved.
  woreOffByBike: BikeWoreOff[];
  onNext: () => void;
}

// Null where the ride arrived without the figure.
export interface RideDetailFigures {
  distance_km: number | null;
  duration_min: number | null;
  elevation_up_m: number | null;
  elevation_down_m: number | null;
  speed_avg: number | null;
  max_speed_kmh: number | null;
}

// Save waits for a change on a ride; an Unassigned Ride always shows it, held until it has a bike.
export type SaveState = "hidden" | "disabled" | "ready";

// Null stays null, so a list with nothing opened keeps the drawer shut.
export function rideItemOf(ride: Ride | null): RideItem | null {
  return ride === null ? null : { kind: "ride", ride };
}

export function pendingItemOf(ride: PendingRide | null): RideItem | null {
  return ride === null ? null : { kind: "pending", ride };
}

export function rideItemKey(item: RideItem): string {
  return item.kind === "ride" ? `ride-${String(item.ride.id)}` : `pending-${item.ride.activity_id}`;
}

// A ride keeps its own bike until another is picked; an Unassigned Ride has none yet.
export function initialPickOf(item: RideItem): BikePick | null {
  return item.kind === "ride" ? { kind: "bike", bikeId: item.ride.bike_id } : null;
}

// Whole km, the way an Unassigned Ride already arrives.
export function rideFiguresOf(item: RideItem): RideDetailFigures {
  const { ride } = item;
  const distanceKm = item.kind === "ride" ? kmOf(item.ride.distance_m) : item.ride.distance_km;
  return {
    distance_km: distanceKm,
    duration_min: ride.duration_min,
    elevation_up_m: ride.elevation_up_m,
    elevation_down_m: ride.elevation_down_m,
    speed_avg: ride.speed_avg,
    max_speed_kmh: ride.max_speed_kmh,
  };
}

// A note without an answer cannot be saved, so it holds Save rather than being dropped unseen.
export function saveStateOf(item: RideItem, pick: BikePick | null, draft: CheckInDraft): SaveState {
  // The check-in is hidden then, so nothing in it can hold the ride back.
  if (pick?.kind === "notMine") return "ready";
  if (item.kind === "pending") return pick === null || isHalfFilled(draft) ? "disabled" : "ready";
  if (isHalfFilled(draft)) return "disabled";
  const changed = movedTo(item.ride, pick) !== null || !sameCheckIn(checkInOf(draft), item.ride.check_in);
  return changed ? "ready" : "hidden";
}

// The walk and an Unassigned Ride preview the picked bike's wear; a listed ride shows what it wore where it is.
export function woreOffShown(item: RideItem, pick: BikePick | null, walk: RideWalk | undefined): WoreOffLine[] {
  const pickedId = pick?.kind === "bike" ? pick.bikeId : null;
  if (walk !== undefined) return woreOffOn(walk.woreOffByBike, pickedId);
  return item.kind === "ride" ? item.ride.wore_off : woreOffOn(item.ride.wore_off_by_bike, pickedId);
}

// A ride keeps no Strava route (#375, on demand in #376); an Unassigned Ride still has its 7-day copy.
export function routeOf(item: RideItem): string | null {
  return item.kind === "pending" ? item.ride.summary_polyline : null;
}

// The bike a ride moves to on save; null leaves it where it is.
export function movedTo(ride: Ride, pick: BikePick | null): number | null {
  return pick?.kind === "bike" && pick.bikeId !== ride.bike_id ? pick.bikeId : null;
}

function kmOf(metres: number | null): number | null {
  return metres === null ? null : Math.round(metres / 1000);
}
