// How far up the next mountain: its silhouette filled from the foot, named underneath, with a ×N badge
// once at least one is covered.
import { useId, type ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Pill } from "@/components/Pill";
import type { Equivalent } from "@/features/stats/figureReadings";
import { formatNumber } from "@/utils/number";
import { CURRENT_COLOR, SHADOW_COLOR } from "./periodColors";

// The peak and the foot of the path, in its own 44 × 32 box.
const MOUNTAIN_PATH = "M1 31 L13 7 L19 15 L27 2 L43 31 Z";
const BOX_WIDTH = 44;
const BOX_HEIGHT = 32;
const PEAK_Y = 2;
const FOOT_Y = 31;

interface YardstickMountainProps {
  equivalent: Equivalent;
  // "Everest · 8 849 m".
  name: string;
  label: string;
}

export function YardstickMountain({ equivalent, name, label }: YardstickMountainProps): ReactElement {
  const { i18n } = useTranslation();
  // useId's colons do not survive inside url(#…).
  const clipId = `mountain-${useId().replace(/[^\w-]/g, "")}`;
  const top = FOOT_Y - (FOOT_Y - PEAK_Y) * equivalent.progress;

  return (
    <Stack gap={4} role="img" aria-label={label}>
      <Group gap={8} align="flex-end" wrap="nowrap">
        <svg width={BOX_WIDTH} height={BOX_HEIGHT} viewBox={`0 0 ${String(BOX_WIDTH)} ${String(BOX_HEIGHT)}`} aria-hidden>
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={top} width={BOX_WIDTH} height={BOX_HEIGHT - top} />
            </clipPath>
          </defs>
          <path d={MOUNTAIN_PATH} fill={SHADOW_COLOR} />
          <path d={MOUNTAIN_PATH} fill={CURRENT_COLOR} clipPath={`url(#${clipId})`} />
        </svg>
        {equivalent.times > 0 && <Pill small>×{formatNumber(equivalent.times, i18n.language)}</Pill>}
      </Group>
      <Text className="tabular-nums" fz={10} c="var(--color-text-dim)" truncate>
        {name}
      </Text>
    </Stack>
  );
}
