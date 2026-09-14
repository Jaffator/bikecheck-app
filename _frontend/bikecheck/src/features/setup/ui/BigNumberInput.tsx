// A number drawn large as a readout that is also typed into: the figure in a tyre gauge or
// at the head of a stepper row. Empty is "not recorded" and shows a dash.
import type { CSSProperties, ReactElement } from "react";
import { NumberInput } from "@mantine/core";
import { FIGURE_LINE_HEIGHT } from "./gaugeMetrics";

interface BigNumberInputProps {
  // Names the box for assistive tech; nothing is drawn.
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  decimals: number;
  max: number;
  align: "left" | "center";
  width: number;
  fontSize?: number;
  readOnly?: boolean;
}

export function BigNumberInput({
  label,
  value,
  onChange,
  decimals,
  max,
  align,
  width,
  fontSize = 28,
  readOnly = false,
}: BigNumberInputProps): ReactElement {
  const styles = {
    input: {
      textAlign: align,
      fontSize,
      fontWeight: 700,
      lineHeight: FIGURE_LINE_HEIGHT,
      height: "auto",
      minHeight: 0,
      padding: 0,
      color: "var(--mantine-color-text-6)",
      "--input-placeholder-color": "var(--mantine-color-text-9)",
    } as CSSProperties,
  };

  return (
    <NumberInput
      variant="unstyled"
      aria-label={label}
      styles={styles}
      w={width}
      value={value ?? ""}
      placeholder="—"
      min={0}
      max={max}
      decimalScale={decimals}
      allowDecimal={decimals > 0}
      allowNegative={false}
      hideControls
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      readOnly={readOnly}
      onChange={(next) => onChange(next === "" ? null : Number(next))}
    />
  );
}
