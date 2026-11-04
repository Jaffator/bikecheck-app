// How far around the Earth: a ring filled clockwise from the top, with a ×N figure in the middle once at
// least one lap is covered.
import type { ReactElement } from "react";
import { Box, Center, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Equivalent } from "@/features/stats/figureReadings";
import { formatNumber } from "@/utils/number";
import { CURRENT_COLOR, SHADOW_COLOR } from "./periodColors";

const SIZE = 56;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const LAP = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;

export function YardstickRing({ equivalent, label }: { equivalent: Equivalent; label: string }): ReactElement {
  const { i18n } = useTranslation();

  return (
    <Box pos="relative" w={SIZE} h={SIZE} ml="auto" role="img" aria-label={label}>
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
      {equivalent.times > 0 && (
        <Center pos="absolute" inset={0}>
          <Text className="tabular-nums" fz={11} fw={600} c="var(--color-text-dim)">
            ×{formatNumber(equivalent.times, i18n.language)}
          </Text>
        </Center>
      )}
    </Box>
  );
}
