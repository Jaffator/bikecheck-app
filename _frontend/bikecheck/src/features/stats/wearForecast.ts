// What the forecast card shows: which bikes get a chip, which bike it opens on and its slides.
import type { ListedBike } from "@/features/bikes/bikes.types";
import { weeksUntil } from "./nextReplacement";
import type { WearForecastItem } from "./stats.types";

// The card opens on the bike of the soonest real projection, not on the bike of an overdue part.
function preselected(items: WearForecastItem[]): WearForecastItem | undefined {
  return items.find((item) => item.level !== "overdue" && item.projected_date !== null) ?? items[0];
}

// A curve that never moved and has no pace was never ridden.
export function hasRides(item: WearForecastItem): boolean {
  return item.pace_per_week !== null || item.points.some((point) => point.percentage !== item.percentage);
}

// How far off the date is, or why there is none.
export function forecastNote(
  item: WearForecastItem,
  translate: (key: string, options?: { count: number }) => string,
): string {
  if (item.level === "overdue") return translate("bikes.health.overdue");
  if (item.projected_date === null) return translate("stats.forecastNoRidesShort");
  return translate("stats.forecastInWeeks", { count: weeksUntil(item.projected_date) });
}

// In garage order; a bike with nothing tracked is no choice.
export function forecastBikes(bikes: ListedBike[], items: WearForecastItem[]): ListedBike[] {
  return bikes.filter((bike) => items.some((item) => item.bike_id === bike.id));
}

// The server sends them soonest first, so filtering keeps that order.
function bikeOptions(items: WearForecastItem[], bikeId: number): WearForecastItem[] {
  return items.filter((item) => item.bike_id === bikeId);
}

// One slide per Tracked Action of the chosen bike; no choice, or one that left the forecast, opens on the garage's pick.
export function forecastSlides(items: WearForecastItem[], chosenBikeId: number | null): WearForecastItem[] {
  const chosen = chosenBikeId === null ? [] : bikeOptions(items, chosenBikeId);
  if (chosen.length > 0) return chosen;

  const opening = preselected(items);
  return opening === undefined ? [] : bikeOptions(items, opening.bike_id);
}
