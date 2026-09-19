// One number read as a gauge and nothing more: the arc filled toward its ceiling, the figure
// in the middle with its unit and a second reading under it. What a follower sees of a Setup.
import type { ReactElement } from "react";
import { Text } from "@mantine/core";
import { GaugeReadout } from "./GaugeReadout";
import { FIGURE_LINE_HEIGHT, arcPath, arcStroke } from "./gaugeMetrics";

// Smaller than the sheet's figure: a read gauge is drawn small and "1,55" has to fit the arc.
const FIGURE_FONT_SIZE = 20;

interface ReadOnlyGaugeProps {
  // What fills the arc, against its ceiling; null leaves the arc empty.
  value: number | null;
  max: number;
  // The figure as the reader should see it - already in their unit, already formatted.
  figure: string;
  unit: string;
  hint?: string;
  size?: number;
}

export function ReadOnlyGauge({ value, max, figure, unit, hint, size = 104 }: ReadOnlyGaugeProps): ReactElement {
  const stroke = arcStroke(size);
  const arc = arcPath(size, stroke);
  const filled = value === null ? 0 : Math.min(1, Math.max(0, value / max));

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <path d={arc} fill="none" stroke="var(--color-decor-sunk)" strokeWidth={stroke} strokeLinecap="round" />
        {filled > 0 && (
          <path
            d={arc}
            fill="none"
            stroke="var(--mantine-color-primary-6)"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${filled} 1`}
          />
        )}
      </svg>
      <GaugeReadout size={size} align="center" unit={unit} hint={hint} style={{ position: "absolute", inset: 0 }}>
        <Text fz={FIGURE_FONT_SIZE} fw={700} lh={FIGURE_LINE_HEIGHT} c="text.6">
          {figure}
        </Text>
      </GaugeReadout>
    </div>
  );
}
