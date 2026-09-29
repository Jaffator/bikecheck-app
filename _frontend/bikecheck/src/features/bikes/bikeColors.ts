import type { ListedBike } from "./bikes.types";

// One colour per bike on the charts. Lightness varies as much as hue so neighbours never blur; no
// yellow, orange or red, so a bike never reads as spend, Strava or a warning.
const BIKE_COLORS = ["#0F92F7", "#52EB63", "#C52BBF", "#FF7A5C", "#E4E9F0", "#428731"];

// The index is the bike's rank among all the owner's bikes; a seventh bike wraps round to the first colour.
export function bikeColor(colorIndex: number): string {
  return BIKE_COLORS[colorIndex % BIKE_COLORS.length];
}

// For a row that knows only the bike's id; null while the list loads or for a bike not in it.
export function colorIndexOf(bikes: ListedBike[] | undefined, bikeId: number): number | null {
  return bikes?.find((bike) => bike.id === bikeId)?.color_index ?? null;
}
