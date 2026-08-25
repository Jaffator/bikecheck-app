// SVGR inlines group icons as currentColor React components.
import { createElement, type FunctionComponent, type ReactElement, type SVGProps } from "react";
import type { IconType } from "react-icons";
import Bikecheck_wrench from "./bikecheck_wrench.svg?react";
import Bikecheck from "./bikecheck.svg?react";
import Bikecheck_outline from "./bikecheck_outline.svg?react";

export { Bikecheck_wrench, Bikecheck, Bikecheck_outline };

export type GroupIcon = FunctionComponent<SVGProps<SVGSVGElement>>;

// Maps seeded group names because reseeded ids are unstable.
const BY_NAME: Record<string, GroupIcon> = {
  Bikecheck_wrench,
  Bikecheck,
  Bikecheck_outline,
};

// Unknown groups use the caller's fallback icon.
export function bikecheckIcon(iconName: string): GroupIcon | null {
  return BY_NAME[iconName] ?? null;
}

// Adapts currentColor SVG components to the react-icons interface.
export function bikecheckIconType(iconName: string): IconType | null {
  const Icon = BY_NAME[iconName];
  if (!Icon) return null;

  return ({ size, color, style, ...props }): ReactElement =>
    createElement(Icon, { width: size, height: size, style: { color, ...style }, ...props });
}
