// Volume spacers as a row of blocks, one per token, filled from the left as far as the count:
// a progress bar in segments, because a token is a thing you add, not an amount. Tapping a
// block sets the count to it; tapping the last filled one takes it away, so zero is reachable.
// A minus at the left end and a plus at the right end step it too, the same squares as under
// every gauge, stood under the outer ones of the two gauges above so the three rows read as
// one grid - held, they keep stepping. The blocks are the count. Empty is "not recorded": no
// block filled.
import type { CSSProperties, ReactElement } from "react";
import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { fieldLabel } from "@/features/add_bike_page/formStyles";
import { tapFeedback } from "@/utils/haptics";
import { GAUGE_GRID_SPACING, STEP_PAIR_WIDTH } from "./gaugeMetrics";
import { StepButton } from "./StepButton";

// The row reads as one bar: rounded at its two ends, square where block meets block.
const BLOCK_HEIGHT = 32;
const END_RADIUS = 8;
const BLOCK_GAP = 2;
// Between a stepper and the bar; tight, so the blocks get the width the steppers give up.
const BAR_GAP = 10;
// The minus stands under the left gauge's minus, the plus under the right gauge's plus: a
// column is half the card less half the grid gap, and a pair sits half its width in from the
// column's middle.
const COLUMN_WIDTH = `(100% - var(--mantine-spacing-${GAUGE_GRID_SPACING})) / 2`;
const PAIR_INSET = `calc(${COLUMN_WIDTH} / 2 - ${STEP_PAIR_WIDTH / 2}px)`;

// A filled block carries its own count, small, black and mono as metadata is set; an empty
// one stays blank, so the numbers grow with the fill.
const NUMBER_FONT_SIZE = 10;

const emptyBlock: CSSProperties = {
  flex: 1,
  height: BLOCK_HEIGHT,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: NUMBER_FONT_SIZE,
  fontWeight: 600,
  lineHeight: 1,
  color: "transparent",
  backgroundColor: "var(--color-decor-sunk)",
  // Longhands, not the shorthand: a block going back to empty drops only the colour it was
  // given, and a shorthand left in place would fall back to the text colour.
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--color-border-strong)",
  transition: "background-color 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out",
};

const filledBlock: CSSProperties = {
  ...emptyBlock,
  color: "#000",
  backgroundColor: "var(--mantine-color-primary-6)",
  borderColor: "var(--mantine-color-primary-6)",
};

interface TokenBarProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max: number;
  // An Archived Bike reads its row without being able to move anything.
  readOnly?: boolean;
}

export function TokenBar({ label, value, onChange, max, readOnly = false }: TokenBarProps): ReactElement {
  const { t } = useTranslation();
  const count = value ?? 0;

  const set = (next: number): void => {
    if (next === value) return;
    tapFeedback();
    onChange(next);
  };

  // The block's own count; the last filled block gives its token back.
  const tap = (index: number): void => {
    const target = index + 1;
    set(target === count ? count - 1 : target);
  };

  return (
    <Stack gap={4} align="center">
      <Text style={fieldLabel}>{label}</Text>
      <Group gap={BAR_GAP} wrap="nowrap" align="center" w="100%" px={readOnly ? 0 : PAIR_INSET}>
        {!readOnly && (
          <StepButton
            direction={-1}
            label={t("setup.stepLess", { field: label })}
            disabled={count <= 0}
            onStep={() => set(Math.max(0, count - 1))}
          />
        )}
        <Group gap={BLOCK_GAP} wrap="nowrap" role="group" aria-label={label} style={{ flex: 1 }}>
          {Array.from({ length: max }, (_, index) => {
            const filled = index < count;
            const style: CSSProperties = {
              ...(filled ? filledBlock : emptyBlock),
              borderTopLeftRadius: index === 0 ? END_RADIUS : 0,
              borderBottomLeftRadius: index === 0 ? END_RADIUS : 0,
              borderTopRightRadius: index === max - 1 ? END_RADIUS : 0,
              borderBottomRightRadius: index === max - 1 ? END_RADIUS : 0,
            };
            return readOnly ? (
              <div key={index} className="font-mono" style={style} aria-hidden="true">
                {index + 1}
              </div>
            ) : (
              <UnstyledButton
                key={index}
                className="font-mono"
                style={style}
                aria-label={`${label}: ${index + 1}`}
                aria-pressed={filled}
                onClick={() => tap(index)}
              >
                {index + 1}
              </UnstyledButton>
            );
          })}
        </Group>
        {!readOnly && (
          <StepButton
            direction={1}
            label={t("setup.stepMore", { field: label })}
            disabled={count >= max}
            onStep={() => set(Math.min(max, count + 1))}
          />
        )}
      </Group>
    </Stack>
  );
}
