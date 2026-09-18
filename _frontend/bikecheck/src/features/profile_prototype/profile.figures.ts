// PROTOTYPE #129 — throwaway. The numbers a profile shows about a garage, and which of
// them show at all: parts and services only while the owner shares the section (#120).
import { partCount, type MockGarage } from "./profile.mock";

export function formatKm(km: number): string {
  return `${new Intl.NumberFormat("cs").format(km)} km`;
}

export interface GarageFigure {
  label: string;
  value: string;
}

export function garageFigures(garage: MockGarage): GarageFigure[] {
  const bikes = garage.bikes;
  const figures: GarageFigure[] = [
    { label: "Kol", value: String(bikes.length) },
    { label: "Nájezd", value: formatKm(bikes.reduce((sum, bike) => sum + bike.km, 0)) },
  ];
  if (garage.sections.components) figures.push({ label: "Dílů", value: String(bikes.reduce((sum, bike) => sum + partCount(bike), 0)) });
  if (garage.sections.history) figures.push({ label: "Servisů", value: String(bikes.reduce((sum, bike) => sum + bike.services.length, 0)) });
  return figures;
}

// The mono line under a bike: km, then parts and services only while shared.
export function bikeLine(garage: MockGarage, bikeIndex: number): string {
  const bike = garage.bikes[bikeIndex];
  const parts = [formatKm(bike.km)];
  if (garage.sections.components) parts.push(`${partCount(bike)} dílů`);
  if (garage.sections.history) parts.push(`${bike.services.length} servisů`);
  return parts.join(" · ");
}

// Clears the transparent header, which holds no place open for the page.
export const UNDER_TRANSPARENT_HEADER = "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.4rem)";
