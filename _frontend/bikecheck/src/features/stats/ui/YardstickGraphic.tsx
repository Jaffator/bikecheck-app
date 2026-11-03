// How far into the next yardstick: a ring for the Earth, a mountain filled from its foot for Everest,
// with a ×N badge once one is covered.
import { useId, type ReactElement } from "react";
import { Box, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Equivalent, Yardstick } from "@/features/stats/figureReadings";
import { formatNumber } from "@/utils/number";

const RING_SIZE = 24;
const RING_STROKE = 3;

// The peak and the foot of the mountain path, in its own 44 × 32 box.
const MOUNTAIN_PATH = "M1 31 L13 7 L19 15 L27 2 L43 31 Z";
const PEAK_Y = 2;
const FOOT_Y = 31;

const TRACK = "var(--mantine-color-cards-5)";
const FILL = "var(--mantine-color-primary-6)";

interface YardstickGraphicProps {
  equivalent: Equivalent;
  yardstick: Yardstick;
  label: string;
}

export function YardstickGraphic({ equivalent, yardstick, label }: YardstickGraphicProps): ReactElement {
  const { i18n } = useTranslation();

  return (
    <Group gap={6} wrap="nowrap" role="img" aria-label={label} style={{ flexShrink: 0 }}>
      {equivalent.times > 0 && (
        <Box
          component="span"
          className="tabular-nums"
          px={5}
          fz={10}
          fw={600}
          c="text.6"
          style={{ borderRadius: 999, backgroundColor: "var(--color-surface-raised)" }}
        >
          ×{formatNumber(equivalent.times, i18n.language)}
        </Box>
      )}
      {yardstick.graphic === "ring" ? (
        <Ring progress={equivalent.progress} />
      ) : (
        <MountainFill progress={equivalent.progress} />
      )}
    </Group>
  );
}

function Ring({ progress }: { progress: number }): ReactElement {
  const center = RING_SIZE / 2;
  const radius = center - RING_STROKE / 2;
  const length = 2 * Math.PI * radius;

  return (
    <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${String(RING_SIZE)} ${String(RING_SIZE)}`} aria-hidden>
      <circle cx={center} cy={center} r={radius} fill="none" stroke={TRACK} strokeWidth={RING_STROKE} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={FILL}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${String(length * progress)} ${String(length)}`}
        // From twelve o'clock, clockwise.
        transform={`rotate(-90 ${String(center)} ${String(center)})`}
      />
    </svg>
  );
}

function MountainFill({ progress }: { progress: number }): ReactElement {
  // useId's colons and guillemets do not survive inside url(#…).
  const clipId = `mountain-${useId().replace(/[^\w-]/g, "")}`;
  const top = FOOT_Y - (FOOT_Y - PEAK_Y) * progress;

  return (
    <svg width={33} height={24} viewBox="0 0 44 32" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={top} width={44} height={32 - top} />
        </clipPath>
      </defs>
      <path d={MOUNTAIN_PATH} fill={TRACK} />
      <path d={MOUNTAIN_PATH} fill={FILL} clipPath={`url(#${clipId})`} />
    </svg>
  );
}
