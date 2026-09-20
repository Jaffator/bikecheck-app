// How the numbers on somebody's garage page read: the distance with its unit, and the
// mono line under a bike - distance, then parts and Services only while they are shared.
import type { ProfileBikeCard } from "./profile.types";

export function formatKm(km: number, language: string): string {
  return `${new Intl.NumberFormat(language).format(km)} km`;
}

// "4 187 km · 32 dílů · 26 servisů"; a count that is null is a section the owner keeps in.
export function bikeStatsLine(
  bike: ProfileBikeCard,
  language: string,
  translate: (key: string, options: { count: number }) => string,
): string {
  const parts = [formatKm(bike.distance_km, language)];
  if (bike.components !== null) parts.push(translate("sharing.partsCount", { count: bike.components }));
  if (bike.services !== null) parts.push(translate("sharing.servicesCount", { count: bike.services }));
  return parts.join(" · ");
}
