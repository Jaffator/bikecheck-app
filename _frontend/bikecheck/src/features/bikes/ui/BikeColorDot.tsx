// A bike's colour beside its name, the same dot on every card and in every legend.
import type { ReactElement } from "react";
import { Box } from "@mantine/core";
import { bikeColor } from "../bikeColors";

interface BikeColorDotProps {
  // Null draws nothing: a bike whose colour is not known yet.
  colorIndex: number | null;
  size?: number;
}

export function BikeColorDot({ colorIndex, size = 8 }: BikeColorDotProps): ReactElement | null {
  if (colorIndex === null) return null;

  return (
    <Box
      w={size}
      h={size}
      style={{ borderRadius: "50%", backgroundColor: bikeColor(colorIndex), flexShrink: 0 }}
    />
  );
}
