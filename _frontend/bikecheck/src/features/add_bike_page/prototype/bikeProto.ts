// PROTOTYPE (proto/desktop-wizards): the card surface the desktop steps share.
import type { CSSProperties } from "react";
import type { BikeSearchResult } from "@/features/bikes/bikes.types";

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
