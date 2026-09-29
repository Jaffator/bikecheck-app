// How the numbers on somebody's pages read: the distance with its unit, the mono line
// under a bike - distance, then parts and Services only while they are shared - and what a
// month of Services adds up to.
import type { ProfileBikeCard, ProfileMoney, ProfileService } from "./profile.types";

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

// What the month's priced Services add up to; null when no price went out, so a month
// where nothing was written down never reads as free work.
export function monthSum(services: ProfileService[]): ProfileMoney | null {
  const priced = services.flatMap((service) => (service.cost === undefined ? [] : [service.cost]));
  if (priced.length === 0) return null;
  return { amount: priced.reduce((sum, cost) => sum + cost.amount, 0), currency: priced[0].currency };
}
