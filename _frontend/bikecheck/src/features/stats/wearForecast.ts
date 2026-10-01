// What the forecast card shows: which bikes get a chip, which bike and part it opens on.
import type { ListedBike } from "@/features/bikes/bikes.types";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { weeksUntil } from "./nextReplacement";
import type { WearForecastItem } from "./stats.types";

// The chosen bike's parts soonest first, and the one drawn.
export interface ForecastSelection {
  options: WearForecastItem[];
  selected: WearForecastItem;
}

// The soonest real projection, so the first chart shown is not an overdue part.
function preselected(items: WearForecastItem[]): WearForecastItem | undefined {
  return items.find((item) => item.level !== "overdue" && item.projected_date !== null) ?? items[0];
}

// A curve that never moved and has no pace was never ridden.
export function hasRides(item: WearForecastItem): boolean {
  return item.pace_per_week !== null || item.points.some((point) => point.percentage !== item.percentage);
}

// The date it runs out, or its percentage where there is none.
export function forecastFigure(
  item: WearForecastItem,
  translate: (key: string, options: { value: number }) => string,
  formatDate: (date: string) => string,
): string {
  return item.projected_date === null
    ? translate("tracking.percentage", { value: item.percentage })
    : formatDate(item.projected_date);
}

// How far off the date is, or why there is none; a list row takes the short reason.
export function forecastNote(
  item: WearForecastItem,
  translate: (key: string, options?: { count: number }) => string,
  { brief }: { brief: boolean },
): string {
  if (item.level === "overdue") return translate("bikes.health.overdue");
  if (item.projected_date === null) return translate(brief ? "stats.forecastNoRidesShort" : "stats.forecastNoRides");
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

// Nothing chosen opens on the garage's pick; a choice that left the forecast falls back to it.
export function forecastSelection(
  items: WearForecastItem[],
  chosenBikeId: number | null,
  chosenKey: string | null,
): ForecastSelection | null {
  const openingItem = preselected(items);
  if (openingItem === undefined) return null;

  const chosenBikeOptions = chosenBikeId === null ? [] : bikeOptions(items, chosenBikeId);
  const options = chosenBikeOptions.length > 0 ? chosenBikeOptions : bikeOptions(items, openingItem.bike_id);
  // On the opening bike this is the opening item itself: it is that bike's first projection.
  const selected = options.find((item) => trackedActionKey(item) === chosenKey) ?? preselected(options) ?? openingItem;

  return { options, selected };
}
