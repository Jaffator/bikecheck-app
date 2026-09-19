// One number as a gauge: its name on top, an arc that fills toward the ceiling, the figure
// large in the middle with its unit and a second reading under it, and a minus and a plus
// centred at the foot that move it a notch at a time - held, they keep moving. The figure is typed into
// as well as read. A cleared figure is a blank centre and an empty arc; the next press lands
// it back on the start the screen names rather than on zero.
import type { ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { fieldLabel } from "@/features/add_bike_page/formStyles";
import { tapFeedback } from "@/utils/haptics";
import { BigNumberInput } from "./BigNumberInput";
import { GaugeReadout } from "./GaugeReadout";
import { GAUGE_LABEL_GAP, GAUGE_PAIR_GAP, arcPath, arcStroke, figureFontSize } from "./gaugeMetrics";
import { StepButton } from "./StepButton";

// Kept to the notch, so a step never hands back 1.7000000002.
function snap(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

interface SetupGaugeProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  // Written under the figure - "bar", "psi", "%".
  unit: string;
  // How many decimals the typed figure accepts; zero makes it a whole number.
  decimals: number;
  max: number;
  // One notch of the minus and plus.
  step: number;
  // Where a cleared figure lands on the next press. Zero when left out.
  start?: number;
  // A second reading under the unit - the same pressure in the other unit.
  hint?: (value: number) => string;
  // The arc's diameter; the figure scales with it.
  size?: number;
  // An Archived Bike reads its sheet without being able to move anything.
  readOnly?: boolean;
}

export function SetupGauge({
  label,
  value,
  onChange,
  unit,
  decimals,
  max,
  step,
  start = 0,
  hint,
  size = 120,
  readOnly = false,
}: SetupGaugeProps): ReactElement {
  const { t } = useTranslation();
  const stroke = arcStroke(size);
  const arc = arcPath(size, stroke);
  const filled = value === null ? 0 : Math.min(1, Math.max(0, value / max));

  const stepBy = (direction: -1 | 1): void => {
    // The first press records the start; only a recorded value is stepped.
    const next =
      value === null ? snap(start, decimals) : snap(Math.min(max, Math.max(0, value + direction * step)), decimals);
    if (next === value) return;
    tapFeedback();
    onChange(next);
  };

  return (
    <Stack gap={GAUGE_LABEL_GAP} align="center">
      <Text style={fieldLabel}>{label}</Text>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <path d={arc} fill="none" stroke="var(--color-decor-sunk)" strokeWidth={stroke} strokeLinecap="round" />
          <path
            d={arc}
            fill="none"
            stroke="var(--mantine-color-primary-6)"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${filled} 1`}
            style={{ transition: "stroke-dasharray 120ms ease-out", opacity: filled === 0 ? 0 : 1 }}
          />
        </svg>
        <GaugeReadout
          size={size}
          align="center"
          unit={unit}
          hint={hint === undefined || value === null ? undefined : hint(value)}
          style={{ position: "absolute", inset: 0 }}
        >
          <BigNumberInput
            label={label}
            value={value}
            onChange={onChange}
            decimals={decimals}
            max={max}
            align="center"
            width={size - stroke * 4}
            fontSize={figureFontSize(size)}
            readOnly={readOnly}
          />
        </GaugeReadout>
      </div>
      {!readOnly && (
        <Group gap={GAUGE_PAIR_GAP} wrap="nowrap" justify="center">
          <StepButton
            direction={-1}
            label={t("setup.stepLess", { field: label })}
            disabled={value !== null && value <= 0}
            onStep={() => stepBy(-1)}
          />
          <StepButton
            direction={1}
            label={t("setup.stepMore", { field: label })}
            disabled={value !== null && value >= max}
            onStep={() => stepBy(1)}
          />
        </Group>
      )}
    </Stack>
  );
}
