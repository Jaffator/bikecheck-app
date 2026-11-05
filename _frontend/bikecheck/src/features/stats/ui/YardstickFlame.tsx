// How many marathons' worth of kcal: a flame filled from the foot with the share, whole once at least one
// is burnt, "17 % maratonu" or "3× maraton" under it, level with the words under the value.
import { useId, type ReactElement } from "react";
import { Box, Stack, Text } from "@mantine/core";
import type { Equivalent } from "@/features/stats/figureReadings";
import { CURRENT_COLOR, SHADOW_COLOR } from "./periodColors";

// Lucide's flame outline, filled, in its own 24 × 24 box; the tip and the foot of the shape.
const FLAME_PATH =
  "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";
const BOX = 24;
const TIP_Y = 3;
const FOOT_Y = 22;

// The chip row's height, so the name sits level with the words under the value; the flame centres in what
// is left over it, the value row and the gap under it.
const NAME_LINE = 22;
const FLAME_AREA = 38;
const SIZE = 36;

export function YardstickFlame({ equivalent, label }: { equivalent: Equivalent; label: string }): ReactElement {
  // useId's colons do not survive inside url(#…).
  const clipId = `flame-${useId().replace(/[^\w-]/g, "")}`;
  const fill = equivalent.times > 0 ? 1 : equivalent.progress;
  const top = FOOT_Y - (FOOT_Y - TIP_Y) * fill;

  return (
    // Centred in the slot, the flame centred over the name, so the phone's stacked graphics share one axis.
    <Stack gap={0} align="center" mx="auto" style={{ width: "fit-content" }} role="img" aria-label={label}>
      <Box h={FLAME_AREA} style={{ display: "flex", alignItems: "center" }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${String(BOX)} ${String(BOX)}`} style={{ display: "block" }} aria-hidden>
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={top} width={BOX} height={BOX - top} />
            </clipPath>
          </defs>
          <path d={FLAME_PATH} fill={SHADOW_COLOR} />
          <path d={FLAME_PATH} fill={CURRENT_COLOR} clipPath={`url(#${clipId})`} />
        </svg>
      </Box>
      <Text className="tabular-nums" fz={12} lh={`${String(NAME_LINE)}px`} c="text.8" ta="center" style={{ whiteSpace: "nowrap" }}>
        {label}
      </Text>
    </Stack>
  );
}
