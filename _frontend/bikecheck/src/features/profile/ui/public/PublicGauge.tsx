// The app's read-only gauge redrawn in the page's tokens: the same three-quarter arc, gold on
// the inset, the figure with its unit and a second reading inside the opening.
import type { ReactElement } from "react";
import { arcPath, arcStroke } from "@/features/setup/ui/gaugeMetrics";

const SIZE = 112;

interface PublicGaugeProps {
  // What fills the arc, against its ceiling; null leaves the arc empty.
  value: number | null;
  max: number;
  // The figure as the reader should see it - already in their unit, already formatted.
  figure: string;
  unit: string;
  hint?: string;
}

export function PublicGauge({ value, max, figure, unit, hint }: PublicGaugeProps): ReactElement {
  const stroke = arcStroke(SIZE);
  const arc = arcPath(SIZE, stroke);
  const filled = value === null ? 0 : Math.min(1, Math.max(0, value / max));

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <path d={arc} fill="none" stroke="var(--pp-card-inset)" strokeWidth={stroke} strokeLinecap="round" />
        {filled > 0 && (
          <path
            d={arc}
            fill="none"
            stroke="var(--pp-gold-500)"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${filled} 1`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ paddingBottom: stroke }}>
        <span className="pp-mono text-[20px] font-bold leading-none tabular-nums text-[var(--pp-paper)]">{figure}</span>
        <span className="pp-mono mt-1 text-[12px] leading-none text-[var(--pp-paper-dim)]">{unit}</span>
        {/* A blank line where no hint is, so the figures across a row stand on one line. */}
        <span className="pp-mono mt-1 text-[11px] leading-none text-[var(--pp-paper-faint)]">{hint ?? " "}</span>
      </div>
    </div>
  );
}
