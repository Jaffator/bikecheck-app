// The Period's buckets as a filled line that stops at today, over the whole Period before as a grey shadow.
import type { ReactElement } from "react";
import { GRAPHIC_HEIGHT } from "@/components/FigureSection";
import type { PeriodSeries } from "@/features/stats/distanceDays";
import { CURRENT_COLOR, SHADOW_COLOR } from "./periodColors";

const WIDTH = 100;
// Room above the tallest point, so the line never touches the chip row.
const HEADROOM = 4;

interface Point {
  x: number;
  y: number;
}

export function PeriodArea({ series, label }: { series: PeriodSeries; label: string }): ReactElement {
  const top = Math.max(1, ...series.current, ...series.previous);
  const count = series.current.length;
  const point = (value: number, index: number): Point => ({
    x: count === 1 ? 0 : (index / (count - 1)) * WIDTH,
    y: GRAPHIC_HEIGHT - (value / top) * (GRAPHIC_HEIGHT - HEADROOM),
  });

  const previous = series.previous.map(point);
  const current = series.current.slice(0, series.today + 1).map(point);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(WIDTH)} ${String(GRAPHIC_HEIGHT)}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: GRAPHIC_HEIGHT, display: "block" }}
    >
      <path d={area(previous)} fill={SHADOW_COLOR} />
      <path d={area(current)} fill={CURRENT_COLOR} fillOpacity={0.28} />
      {/* A Period one bucket old is a zero-length line, which round caps draw as a dot. */}
      <polyline
        points={(current.length === 1 ? [current[0], current[0]] : current).map(pair).join(" ")}
        fill="none"
        stroke={CURRENT_COLOR}
        strokeWidth={current.length === 1 ? 5 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function pair({ x, y }: Point): string {
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

// The line, closed down to the baseline under its two ends.
function area(points: Point[]): string {
  const first = points[0];
  const last = points[points.length - 1];
  const floor = String(GRAPHIC_HEIGHT);
  return `M${first.x.toFixed(1)},${floor} L${points.map(pair).join(" L")} L${last.x.toFixed(1)},${floor} Z`;
}
