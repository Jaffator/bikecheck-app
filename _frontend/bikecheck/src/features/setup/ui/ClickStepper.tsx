// One adjuster's readout beside its ring, as one line: the code on the left, the bare count
// in the gap of a minus and a plus on the right, the same pair as under every gauge - never
// shown as "of 30"; the dial says the count runs from fully closed. A tap steps a click; held, the button keeps counting. Plus stops at the
// ring's last click, minus at fully closed. An Archived Bike reads the count with no buttons.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { STEP_PAIR_GAP } from "./gaugeMetrics";
import { StepButton } from "./StepButton";
import { STEP_BUTTON_SIZE } from "./stepButtonProps";

// The count fills the pair's gap, so the row is as wide as a pair and never shifts as it changes.
export const STEP_SIZE = STEP_BUTTON_SIZE;

interface ClickStepperProps {
  // The short code printed on the knob - HSR, LSC.
  code: string;
  // The adjuster's full name, for assistive tech.
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  // The ring's last click; plus goes no further.
  max: number;
  readOnly?: boolean;
}

export function ClickStepper({ code, name, value, onChange, max, readOnly = false }: ClickStepperProps): ReactElement {
  const { t } = useTranslation();
  // Not recorded reads and steps as fully closed - zero, the same as the ring draws it.
  const count = value ?? 0;

  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
      <Text className="font-mono" fz={12} fw={600} tt="uppercase" c="var(--color-text-bright)">
        {code}
      </Text>
      <Group gap={0} wrap="nowrap" align="center">
        {!readOnly && (
          <StepButton
            direction={-1}
            label={t("setup.clickLess", { ring: name })}
            disabled={count === 0}
            onStep={() => onChange(count - 1)}
          />
        )}
        <Text
          w={STEP_PAIR_GAP + 15}
          ta="center"
          fz={22}
          fw={700}
          lh={1}
          c="var(--color-text-bright)"
          aria-live="polite"
          // Never squeezed by a tight row, so the count stays under its heading.
          style={{ flexShrink: 0 }}
        >
          {count}
        </Text>
        {!readOnly && (
          <StepButton
            direction={1}
            label={t("setup.clickMore", { ring: name })}
            disabled={count >= max}
            onStep={() => onChange(Math.min(max, count + 1))}
          />
        )}
      </Group>
    </Group>
  );
}
