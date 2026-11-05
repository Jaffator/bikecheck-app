// How many Everests, "3.5× Mount Everest" underneath: under four, one mountain per Everest started, each
// filled from the foot, the last one part way; from four on, a single full mountain.
import { useId, type ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Equivalent } from "@/features/stats/figureReadings";
import { formatNumber } from "@/utils/number";
import { CURRENT_COLOR, SHADOW_COLOR } from "./periodColors";

// The peak and the foot of the path, in its own 44 × 32 box.
const MOUNTAIN_PATH = "M1 31 L13 7 L19 15 L27 2 L43 31 Z";
const BOX_WIDTH = 44;
const BOX_HEIGHT = 32;
const PEAK_Y = 2;
const FOOT_Y = 31;

// From here on the count no longer fits the slot, so one mountain says the number.
const COUNTED_UP_TO = 4;
const SLOT_WIDTH = 116;
const GAP = 4;
// 36 px tall, so a lone mountain still fits over the name.
const MAX_WIDTH = 50;
// The chip row's height, so the name sits level with the words under the value; the mountains centre in
// what is left over it, the value row and the gap under it.
const NAME_LINE = 22;
const MOUNTAIN_AREA = 38;

export function YardstickMountain({ equivalent, label }: { equivalent: Equivalent; label: string }): ReactElement {
  const { t, i18n } = useTranslation();
  const ratio = equivalent.times + equivalent.progress;
  // One for each Everest started: the full ones, then the one being climbed.
  const count = equivalent.times + 1;
  const width = Math.min(MAX_WIDTH, (SLOT_WIDTH - GAP * (count - 1)) / count);

  return (
    // Centred in the slot, the mountains centred over the name, so the phone's stacked graphics share one axis.
    <Stack gap={0} align="center" mx="auto" style={{ width: "fit-content" }} role="img" aria-label={label}>
      <Group gap={GAP} justify="center" align="center" wrap="nowrap" h={MOUNTAIN_AREA}>
        {ratio >= COUNTED_UP_TO ? (
          <Mountain width={MAX_WIDTH} fill={1} />
        ) : (
          Array.from({ length: count }, (_, index) => (
            <Mountain key={index} width={width} fill={index < equivalent.times ? 1 : equivalent.progress} />
          ))
        )}
      </Group>
      <Text
        className="tabular-nums"
        fz={12}
        lh={`${String(NAME_LINE)}px`}
        c="text.8"
        w="100%"
        ta="center"
        style={{ whiteSpace: "nowrap" }}
      >
        {t("dashboard.yardstickEverestName", { times: formatNumber(ratio, i18n.language, { maximumFractionDigits: 1 }) })}
      </Text>
    </Stack>
  );
}

function Mountain({ width, fill }: { width: number; fill: number }): ReactElement {
  // useId's colons do not survive inside url(#…).
  const clipId = `mountain-${useId().replace(/[^\w-]/g, "")}`;
  const top = FOOT_Y - (FOOT_Y - PEAK_Y) * fill;

  return (
    <svg
      width={width}
      height={(width * BOX_HEIGHT) / BOX_WIDTH}
      viewBox={`0 0 ${String(BOX_WIDTH)} ${String(BOX_HEIGHT)}`}
      style={{ flexShrink: 0, display: "block" }}
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
  );
}
