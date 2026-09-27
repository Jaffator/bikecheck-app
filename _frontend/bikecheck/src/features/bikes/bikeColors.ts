import type { ListedBike } from "./bikes.types";

// One colour per bike on every card and chart. Clear of the money ramp's yellows and the attention
// reds, so a bike never reads as spend or as a warning.
const BIKE_COLORS = ["#5B9BF0", "#B18CF0", "#3EC4C4", "#EC7FC0", "#B7C9D3"];

// The index is the bike's rank among all the owner's bikes; a sixth bike wraps round to the first colour.
export function bikeColor(colorIndex: number): string {
  return BIKE_COLORS[colorIndex % BIKE_COLORS.length];
}

// For a row that knows only the bike's id; null while the list loads or for a bike not in it.
export function colorIndexOf(bikes: ListedBike[] | undefined, bikeId: number): number | null {
  return bikes?.find((bike) => bike.id === bikeId)?.color_index ?? null;
}
