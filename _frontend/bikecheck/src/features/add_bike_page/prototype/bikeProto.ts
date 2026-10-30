// PROTOTYPE (proto/desktop-wizards): copy with no i18n key yet, and the card surface the desktop steps share.
import type { CSSProperties } from "react";
import type { BikeSearchResult } from "@/features/bikes/bikes.types";

export const COPY = {
  steps: ["Najdi kolo", "Údaje o kole", "Komponenty"],
  searchTitle: "Zkus najít detail svého kola",
  specTitle: "Uprav své kolo",
  partsTitle: "Zkontroluj komponenty",
  yourBike: "Tvoje kolo",
  nothingPicked: "Zatím nic nevybráno",
  nothingPickedBody: "Vyber model ze seznamu. Fotku a specifikaci uvidíš tady.",
  notListed: "Kolo tu není, zadat ručně",
  filledParts: "Vyplněné díly",
  of: "z",
  fillLater: "Co teď nevíš, doplníš kdykoli později v detailu kola.",
  absentPlaceholder: "Na kole není",
  unnamed: "Bez názvu",
  notEntered: "Nezadáno",
  mileage: "Nájezd",
  frame: "Rám",
  wheels: "Kola",
};

export const cardSurface: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "1px solid var(--mantine-color-cards-6)",
  boxShadow: "var(--elev-panel)",
};

// The lookup types its image as an empty object; it arrives as a URL or nothing.
export function imageSrc(bike: BikeSearchResult | null | undefined): string | null {
  return bike?.imageUrl ? String(bike.imageUrl) : null;
}
