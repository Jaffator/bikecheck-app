// Which knob a suspension section draws, read off the mounted fork's or shock's description and
// nothing else (ADR 0029): a Fox, a RockShox or a generic one. No value depends on the answer.
import { isDismounted } from "@/features/components/componentLabels";
import type { BikeComponent } from "@/features/components/components.types";

export type DialBrand = "fox" | "rockshox" | "generic";

// The seeded part types the two suspension sections stand for.
export type SuspensionPart = "Fork" | "Shock";

// The most clicks any ring takes, from fully closed: a cap on every ring, the same on every
// brand, and never shown - the owner reads "7 clicks", not "7 of 30".
export const DIAL_RANGE = 30;

// The brand a description names; anything unrecognised, or nothing at all, is generic.
export function dialBrandFor(description: string | null | undefined): DialBrand {
  const text = (description ?? "").toLowerCase();
  if (text.includes("fox")) return "fox";
  if (text.includes("rockshox") || text.includes("rock shox")) return "rockshox";
  return "generic";
}

// The fork or shock on the bike now: which knob to draw, how many adjusters it carries and
// the row a switch writes to. Null when no such part is mounted; a dismounted one has no say.
export interface MountedSuspension {
  id: number;
  brand: DialBrand;
  dualRebound: boolean;
  dualCompression: boolean;
}

export function mountedSuspension(components: BikeComponent[] | undefined, part: SuspensionPart): MountedSuspension | null {
  const mounted = components?.find((component) => component.component_type === part && !isDismounted(component));
  if (!mounted) return null;
  return {
    id: mounted.id,
    brand: dialBrandFor(mounted.component_desc),
    dualRebound: mounted.dual_rebound,
    dualCompression: mounted.dual_compression,
  };
}
