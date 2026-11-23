// A bike's colour beside its name, the same filled bike on every card and in every legend.
import type { ReactElement } from "react";
import { BikeIcon_fill } from "@/assets/icons/bikecheck";
import { bikeColor } from "../bikeColors";

const ICON_WIDTH = 14;

interface BikeColorIconProps {
  // Null draws nothing: a bike whose colour is not known yet.
  colorIndex: number | null;
}

export function BikeColorIcon({ colorIndex }: BikeColorIconProps): ReactElement | null {
  if (colorIndex === null) return null;

  return <BikeIcon_fill width={ICON_WIDTH} style={{ color: bikeColor(colorIndex), flexShrink: 0 }} aria-hidden />;
}
