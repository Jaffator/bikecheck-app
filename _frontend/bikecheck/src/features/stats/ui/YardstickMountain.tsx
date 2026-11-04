// How far up the next mountain: its silhouette filled from the foot, with a ×N badge once at least one is
// covered.
import { useId, type ReactElement } from "react";
import { Group } from "@mantine/core";
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

export function YardstickMountain({ equivalent, label }: { equivalent: Equivalent; label: string }): ReactElement {
  const { i18n } = useTranslation();
  // useId's colons do not survive inside url(#…).
  const clipId = `mountain-${useId().replace(/[^\w-]/g, "")}`;
  const top = FOOT_Y - (FOOT_Y - PEAK_Y) * equivalent.progress;

  return (
    // Wraps, so a slot too narrow for both puts the badge over the mountain instead of squeezing it.
    <Group gap={8} justify="flex-end" align="flex-end" role="img" aria-label={label}>
      {equivalent.times > 0 && <Pill small>×{formatNumber(equivalent.times, i18n.language)}</Pill>}
      <svg
        width={BOX_WIDTH}
        height={BOX_HEIGHT}
        viewBox={`0 0 ${String(BOX_WIDTH)} ${String(BOX_HEIGHT)}`}
        style={{ flexShrink: 0 }}
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={top} width={BOX_WIDTH} height={BOX_HEIGHT - top} />
          </clipPath>
        </defs>
        <path d={MOUNTAIN_PATH} fill={SHADOW_COLOR} />
        <path d={MOUNTAIN_PATH} fill={CURRENT_COLOR} clipPath={`url(#${clipId})`} />
      </svg>
    </Group>
  );
}
