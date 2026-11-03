// How far along one yardstick: a track with a dot at the share, its two ends named underneath.
import type { ReactElement } from "react";
import { Box, Group, Text } from "@mantine/core";
import type { Equivalent } from "@/features/stats/figureReadings";
import { CURRENT_COLOR, SHADOW_COLOR } from "./periodColors";

const TRACK = 4;
const END_DOT = 8;
const DOT = 12;

interface YardstickLineProps {
  equivalent: Equivalent;
  // "0 km" or "×11" at the start, "obvod Země · 40 075 km" at the end.
  start: string;
  end: string;
  label: string;
}

export function YardstickLine({ equivalent, start, end, label }: YardstickLineProps): ReactElement {
  const share = `${String(equivalent.progress * 100)}%`;

  return (
    <Box role="img" aria-label={label}>
      <Box pos="relative" h={DOT} mx={DOT / 2}>
        <Box
          pos="absolute"
          left={0}
          right={0}
          top={(DOT - TRACK) / 2}
          h={TRACK}
          style={{ borderRadius: TRACK / 2, backgroundColor: SHADOW_COLOR }}
        />
        <Box
          pos="absolute"
          left={0}
          w={share}
          top={(DOT - TRACK) / 2}
          h={TRACK}
          style={{ borderRadius: TRACK / 2, backgroundColor: CURRENT_COLOR }}
        />
        <EndDot at="left" />
        <EndDot at="right" />
        <Box
          pos="absolute"
          left={`calc(${share} - ${String(DOT / 2)}px)`}
          top={0}
          w={DOT}
          h={DOT}
          style={{ borderRadius: "50%", backgroundColor: CURRENT_COLOR }}
        />
      </Box>
      <Group justify="space-between" wrap="nowrap" mt={8}>
        <Text className="tabular-nums" fz={10} c="var(--color-text-dim)">
          {start}
        </Text>
        <Text className="tabular-nums" fz={10} c="var(--color-text-dim)" truncate>
          {end}
        </Text>
      </Group>
    </Box>
  );
}

function EndDot({ at }: { at: "left" | "right" }): ReactElement {
  return (
    <Box
      pos="absolute"
      top={(DOT - END_DOT) / 2}
      w={END_DOT}
      h={END_DOT}
      style={{
        [at]: -END_DOT / 2,
        borderRadius: "50%",
        backgroundColor: "var(--mantine-color-cards-4)",
      }}
    />
  );
}
