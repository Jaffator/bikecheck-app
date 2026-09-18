// PROTOTYPE #121 — throwaway. Bits every surface needs verbatim: the drawer motion from
// docs/conventions/drawers.md, the card surface, the bike list.
import type { CSSProperties } from "react";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { Bike } from "@/features/bikes/bikes.types";
import { usePrototypeStore, type Visibility } from "./prototype.store";

export const DRAWER_Z_INDEX = 320;

export const DRAWER_PROPS = {
  position: "bottom" as const,
  radius: "lg" as const,
  zIndex: DRAWER_Z_INDEX,
  transitionProps: {
    duration: 400,
    exitDuration: 400,
    transition: "slide-up" as const,
    timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
  },
  overlayProps: { backgroundOpacity: 0.7, blur: 4 },
  styles: {
    content: { backgroundColor: "var(--mantine-color-cards-6)", height: "auto", maxHeight: "92dvh" },
    header: { backgroundColor: "var(--mantine-color-cards-6)" },
    body: { paddingBottom: "calc(3rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" },
    title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
  },
};

// docs/ui/card-surface.md — a panel, drawn as the bike detail draws its cards: glow and
// shadow carry the edge, no hairline.
export const PANEL: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "none",
  boxShadow: "var(--elev-panel)",
  borderRadius: "1rem",
};

export const EYEBROW = {
  fz: 11,
  fw: 400,
  tt: "uppercase" as const,
  lts: "0.08em",
  c: "var(--color-text-dim)",
  className: "font-mono",
};

export const STATE_COLOR: Record<Visibility, string> = {
  OFF: "var(--color-text-dim)",
  FOLLOWERS: "var(--mantine-color-blue-4)",
  PUBLIC: "var(--mantine-color-green-8)",
};

export interface ProfileBike {
  bike: Bike;
  shared: boolean;
}

// Every bike in use, with whether it goes out. Archived bikes never appear (#115).
export function useProfileBikes(): ProfileBike[] {
  const { data: bikes } = useBikes();
  const unshared = usePrototypeStore((state) => state.unsharedBikeIds);
  return (bikes ?? []).map((bike) => ({ bike, shared: !unshared.includes(bike.id) }));
}
