// The desktop garage's order: how the address carries it and how the bikes are put in it.
import type { GarageTrackedAction } from "@/features/service_tracking/tracking.types";
import { bikeTitle } from "./bikeTitle";
import type { ListedBike } from "./bikes.types";

export type BikeSort = "health" | "distance" | "lastRide" | "name";

export const BIKE_SORTS: BikeSort[] = ["health", "distance", "lastRide", "name"];

// Nothing, or anything unknown, is part health, so a broken link still opens a working page.
export function parseBikeSort(raw: string | null): BikeSort {
  return BIKE_SORTS.find((sort) => sort === raw) ?? "health";
}

// Worst-off first, farthest ridden first, most recently ridden first, or A to Z.
export function sortBikes(bikes: ListedBike[], sort: BikeSort, actions: GarageTrackedAction[]): ListedBike[] {
  const worst = worstPercentageByBike(actions);
  const compare: Record<BikeSort, (left: ListedBike, right: ListedBike) => number> = {
    health: (left, right) => (worst.get(right.id) ?? -1) - (worst.get(left.id) ?? -1),
    distance: (left, right) => (right.total_km ?? 0) - (left.total_km ?? 0),
    // ISO strings order as dates; a bike never ridden goes last.
    lastRide: (left, right) => (right.last_ride_at ?? "").localeCompare(left.last_ride_at ?? ""),
    name: (left, right) => bikeTitle(left).localeCompare(bikeTitle(right)),
  };
  return [...bikes].sort(compare[sort]);
}

function worstPercentageByBike(actions: GarageTrackedAction[]): Map<number, number> {
  const worst = new Map<number, number>();
  for (const action of actions) {
    worst.set(action.bike_id, Math.max(worst.get(action.bike_id) ?? -1, action.percentage));
  }
  return worst;
}
