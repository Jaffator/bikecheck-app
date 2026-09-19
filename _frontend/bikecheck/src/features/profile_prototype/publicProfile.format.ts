// PROTOTYPE #132 — throwaway. Numbers, money and pressures the way the page's language
// writes them; the totals a garage adds up to.
import { formatCost } from "@/utils/money";
import { partCount, type MockGarage } from "./profile.mock";
import type { PublicLang } from "./publicProfile.copy";

export function formatNumber(lang: PublicLang, value: number): string {
  return new Intl.NumberFormat(lang).format(value);
}

// Costs in the owner's currency, written the reader's way (#118).
export function money(lang: PublicLang, amount: number, currency: string): string {
  return formatCost(amount, currency, lang);
}

// The mock keeps psi; tyres read in the owner's unit, suspension stays psi (ADR 0029).
export function pressure(lang: PublicLang, psi: number, unit: MockGarage["tireUnit"]): string {
  const shown = unit === "bar" ? psi / 14.504 : psi;
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: unit === "bar" ? 2 : 1 }).format(shown)} ${unit}`;
}

export function garageTotals(garage: MockGarage): {
  bikes: number;
  km: number;
  parts: number;
  services: number;
} {
  return {
    bikes: garage.bikes.length,
    km: garage.bikes.reduce((sum, bike) => sum + bike.km, 0),
    parts: garage.bikes.reduce((sum, bike) => sum + partCount(bike), 0),
    services: garage.bikes.reduce((sum, bike) => sum + bike.services.length, 0),
  };
}
