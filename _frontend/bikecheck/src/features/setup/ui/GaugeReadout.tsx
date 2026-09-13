// The figure of a gauge with its unit and a second reading under it, centred in the gauge's
// body and lifted by the arc's stroke so it sits in the middle of the arc's opening. Every
// figure on the sheet is drawn through this - the arc gauges, the sag picture, the token
// column - with a blank line kept where a unit or second reading is missing, so the figures
// across a row stand on one line whether or not their gauge has an arc, a unit or a hint.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Stack, Text } from "@mantine/core";
import { HINT_FONT_SIZE, HINT_LINE_HEIGHT, UNIT_LINE_HEIGHT, arcStroke, unitFontSize } from "./gaugeMetrics";

// A line that is missing is still a line, so the figure above it does not move.
const BLANK = " ";

interface GaugeReadoutProps {
  // The body height the readout is centred in.
  size: number;
  align: "flex-start" | "center";
  // The figure itself, typed into or read.
  children: ReactNode;
  unit?: string;
  hint?: string;
  style?: CSSProperties;
}

export function GaugeReadout({ size, align, children, unit, hint, style }: GaugeReadoutProps): ReactElement {
  return (
    <Stack gap={0} align={align} justify="center" h={size} style={{ paddingBottom: arcStroke(size), ...style }}>
      {children}
      <Text fz={unitFontSize(size)} fw={500} c="var(--color-text-dim)" lh={UNIT_LINE_HEIGHT}>
        {unit ?? BLANK}
      </Text>
      <Text className="font-mono" fz={HINT_FONT_SIZE} c="var(--mantine-color-text-9)" lh={HINT_LINE_HEIGHT}>
        {hint ?? BLANK}
      </Text>
    </Stack>
  );
}
