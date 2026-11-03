// The Period's buckets as bars: today's bucket in the accent, those still to come as a dot.
import type { ReactElement } from "react";
import type { PeriodBar } from "@/features/stats/distanceDays";

const WIDTH = 64;
const HEIGHT = 24;
// Of each bucket's slot; the rest is the gap.
const BAR_SHARE = 0.7;
// Small enough that a month's days still read as dots, not a line.
const DOT_RADIUS = 0.6;
// A short ride still shows beside a long one.
const MIN_BAR = 2;

const PAST = "var(--mantine-color-cards-4)";
const CURRENT = "var(--mantine-color-primary-6)";
const FUTURE = "var(--color-border-strong)";

export function PeriodBars({ bars, label }: { bars: PeriodBar[]; label: string }): ReactElement {
  const slot = WIDTH / bars.length;
  const width = slot * BAR_SHARE;
  const top = Math.max(0, ...bars.map((bar) => bar.meters));

  return (
    <svg
      role="img"
      aria-label={label}
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      style={{ display: "block", flexShrink: 0 }}
    >
      {bars.map((bar, index) => {
        const center = index * slot + slot / 2;
        // An empty bucket so far is a dot too, but only today's is lit.
        if (bar.meters === 0) {
          if (bar.state === "past") return null;
          const fill = bar.state === "current" ? CURRENT : FUTURE;
          return <circle key={index} cx={center} cy={HEIGHT - DOT_RADIUS} r={DOT_RADIUS} fill={fill} />;
        }
        const height = Math.max(MIN_BAR, (bar.meters / top) * HEIGHT);
        return (
          <rect
            key={index}
            x={center - width / 2}
            y={HEIGHT - height}
            width={width}
            height={height}
            rx={Math.min(1, width / 2)}
            fill={bar.state === "current" ? CURRENT : PAST}
          />
        );
      })}
    </svg>
  );
}
