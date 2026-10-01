// A reading as a three-quarter arc in its attention colour; overdue fills it and no more.
import type { ReactElement } from "react";
import { attentionColor } from "../attentionLevel";

const SIZE = 30;
const RADIUS = 18;
// Three quarters of the circumference, opening at the bottom.
const SWEEP = 2 * Math.PI * RADIUS * 0.75;

export function WearArc({ percentage }: { percentage: number }): ReactElement {
  const fill = (SWEEP * Math.min(Math.max(percentage, 0), 100)) / 100;

  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 44 44" aria-hidden style={{ flexShrink: 0 }}>
      <ArcStroke color="var(--color-border-strong)" length={SWEEP} />
      {fill > 0 && <ArcStroke color={attentionColor(percentage)} length={fill} />}
    </svg>
  );
}

function ArcStroke({ color, length }: { color: string; length: number }): ReactElement {
  return (
    <circle
      cx={22}
      cy={22}
      r={RADIUS}
      fill="none"
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
      strokeDasharray={`${String(length)} 200`}
      transform="rotate(135 22 22)"
    />
  );
}
