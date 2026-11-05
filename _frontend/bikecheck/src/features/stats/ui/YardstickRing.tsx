// How far around the Earth: a ring filled clockwise from the top with the share, or ×N once at least one
// lap is covered, in the middle; "obvodu Země" sits level with the words under the value, the ring centres
// in the section's height over it.
import type { ReactElement } from "react";
import { Box, Center, Stack, Text } from "@mantine/core";
import type { Equivalent } from "@/features/stats/figureReadings";
import { CURRENT_COLOR, SHADOW_COLOR } from "./periodColors";

const SIZE = 44;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const LAP = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;
// The chip row's height, so the name shares a line with the words under the value.
const NAME_LINE = 22;

interface YardstickRingProps {
  equivalent: Equivalent;
  // "17 %" or "11×", and the yardstick's name to go with it.
  figure: string;
  name: string;
  label: string;
}

export function YardstickRing({ equivalent, figure, name, label }: YardstickRingProps): ReactElement {
  return (
    <Stack gap={0} align="center" mx="auto" h="100%" style={{ width: "fit-content" }} role="img" aria-label={label}>
      {/* Takes all the height over the name and centres the ring in it. */}
      <Box pos="relative" w={SIZE} h={SIZE} my="auto">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`} aria-hidden>
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={SHADOW_COLOR} strokeWidth={STROKE} />
          {/* A zero-length dash still draws a dot with round caps, so nothing is drawn at 0. */}
          {equivalent.progress > 0 && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={CURRENT_COLOR}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${(equivalent.progress * LAP).toFixed(2)} ${LAP.toFixed(2)}`}
              transform={`rotate(-90 ${String(CENTER)} ${String(CENTER)})`}
            />
          )}
        </svg>
        <Center pos="absolute" inset={0}>
          <Text className="tabular-nums" fz={10} fw={600} c="text.7">
            {figure}
          </Text>
        </Center>
      </Box>
      <Text fz={12} lh={`${String(NAME_LINE)}px`} c="text.8" ta="center" style={{ whiteSpace: "nowrap" }}>
        {name}
      </Text>
    </Stack>
  );
}
