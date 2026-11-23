// A bike's colour beside its name, the same filled bike on every card and in every legend.
import type { ReactElement } from "react";
import { BikeIcon_fill } from "@/assets/icons/bikecheck";
import { bikeColor } from "../bikeColors";

// Explicit height from the 209x131 viewBox; height auto on inline SVG falls back to 150px.
const ICON_WIDTH = 14;
const ICON_HEIGHT = (ICON_WIDTH * 131) / 209;

interface BikeColorIconProps {
  // Null draws nothing: a bike whose colour is not known yet.
  colorIndex: number | null;
}

export function BikeColorIcon({ colorIndex }: BikeColorIconProps): ReactElement | null {
  if (colorIndex === null) return null;

  return (
    <BikeIcon_fill
      width={ICON_WIDTH}
      height={ICON_HEIGHT}
      style={{ color: bikeColor(colorIndex), flexShrink: 0 }}
      aria-hidden
    />
  );
}
