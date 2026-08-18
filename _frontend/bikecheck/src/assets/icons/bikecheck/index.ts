// Component group icons. The "?react" suffix has svgr inline each file as a
// component, so it draws in currentColor and takes the usual SVG props.
import { createElement, type FunctionComponent, type ReactElement, type SVGProps } from "react";
import type { IconType } from "react-icons";
import Bikecheck_wrench from "./bikecheck_wrench.svg?react";

export { Bikecheck_wrench };

export type GroupIcon = FunctionComponent<SVGProps<SVGSVGElement>>;

// Keyed by the seeded group_name — ids are reassigned on every reseed, so they
// cannot address an icon. Renaming a group in the seed means renaming its key
// here too. Three files differ from their group: saddle, motor and misc.
const BY_NAME: Record<string, GroupIcon> = {
  Bikecheck_wrench,
  // Frame,
};

// A group the user created himself has a name of his own, and a seeded one can
// outlive this map — both leave the caller to draw its own fallback.
export function bikecheckIcon(iconName: string): GroupIcon | null {
  return BY_NAME[iconName] ?? null;
}

// Adapts one of these icons to the react-icons interface, so it can sit beside
// them wherever an IconType is expected. react-icons passes size and color;
// these draw in currentColor and take their size from width/height.
export function bikecheckIconType(iconName: string): IconType | null {
  const Icon = BY_NAME[iconName];
  if (!Icon) return null;

  return ({ size, color, style, ...props }): ReactElement =>
    createElement(Icon, { width: size, height: size, style: { color, ...style }, ...props });
}
