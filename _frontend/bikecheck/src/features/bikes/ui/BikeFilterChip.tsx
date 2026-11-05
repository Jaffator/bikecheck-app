// A filter chip: every bike or one in its colour, or a forecast's Tracked Action with its warning dot.
import type { ReactElement } from "react";
import { Box, Chip } from "@mantine/core";
import { chipStyles } from "@/features/add_bike_page/formStyles";
import { BikeColorDot } from "./BikeColorDot";

interface BikeFilterChipProps {
  label: string;
  colorIndex?: number;
  // A dot in any colour, for a chip that names something other than a bike.
  dotColor?: string;
  active: boolean;
  onClick: () => void;
}

// Drawn like every other chip in the app; only the dot is its own.
export function BikeFilterChip({ label, colorIndex, dotColor, active, onClick }: BikeFilterChipProps): ReactElement {
  return (
    <Chip
      checked={active}
      onChange={onClick}
      radius="xl"
      size="sm"
      color="primary.6"
      icon={false}
      styles={chipStyles(active, { wrap: false })}
    >
      {/* Chip wraps children in a plain span: the dot would stack above the name, and a
          baseline-aligned row would make the chip taller than its dotless neighbours. */}
      <Box component="span" style={{ display: "inline-flex", alignItems: "center", gap: 6, verticalAlign: "top" }}>
        {colorIndex !== undefined && <BikeColorDot colorIndex={colorIndex} size={7} />}
        {dotColor !== undefined && (
          <Box
            w={7}
            h={7}
            // A dark ring on the chosen chip, so a yellow warning dot does not melt into the yellow accent.
            style={{
              borderRadius: "50%",
              backgroundColor: dotColor,
              flexShrink: 0,
              boxShadow: active ? "0 0 0 2px var(--mantine-color-cards-6)" : undefined,
            }}
          />
        )}
        {label}
      </Box>
    </Chip>
  );
}
