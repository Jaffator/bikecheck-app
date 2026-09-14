// Volume spacers as a bare count between the pressure and the sag: the name on top, then a
// small plus, the figure set at the gauges' size and level with their figures, and a small
// minus under it - held, they keep stepping. A token is a thing you add, so there is no arc to
// fill. Not recorded reads and steps as zero. An Archived Bike reads the count with no buttons.
import type { CSSProperties, ReactElement } from "react";
import { Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { fieldLabel } from "@/features/add_bike_page/formStyles";
import { tapFeedback } from "@/utils/haptics";
import { FIGURE_LINE_HEIGHT, GAUGE_LABEL_GAP, figureFontSize, figureLine } from "./gaugeMetrics";
import { StepButton } from "./StepButton";

// Smaller than the pairs under the gauges: these stand over and under a figure, not in a row.
const BUTTON_SIZE = 28;
const FIGURE_WIDTH = 36;
const FIGURE_GAP = 4;
// Between the name and the plus under it; the gauges' arcs start closer to their names.
const LABEL_GAP = 14;

const smallButton: CSSProperties = {
  flex: `0 0 ${BUTTON_SIZE}px`,
  width: BUTTON_SIZE,
};

interface TokenStepperProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max: number;
  // The gauges' size beside it, so the figure sits level with theirs.
  size?: number;
  readOnly?: boolean;
  style?: CSSProperties;
}

export function TokenStepper({
  label,
  value,
  onChange,
  max,
  size = 120,
  readOnly = false,
  style,
}: TokenStepperProps): ReactElement {
  const { t } = useTranslation();
  const count = value ?? 0;
  const fontSize = figureFontSize(size);
  // The figure's top, so its middle falls as far down the body as a gauge's; the plus stands
  // above it, and pushes the column down a little when the body has no room for it.
  const figureTop = figureLine(size) - (fontSize * FIGURE_LINE_HEIGHT) / 2;
  const paddingTop = readOnly ? figureTop : Math.max(LABEL_GAP, figureTop - BUTTON_SIZE - FIGURE_GAP);

  const set = (next: number): void => {
    if (next === value) return;
    tapFeedback();
    onChange(next);
  };

  return (
    <Stack gap={GAUGE_LABEL_GAP} align="center" style={style}>
      <Text style={fieldLabel}>{label}</Text>
      <Stack gap={FIGURE_GAP} align="center" h={size} style={{ paddingTop }}>
        {!readOnly && (
          <StepButton
            direction={1}
            label={t("setup.stepMore", { field: label })}
            disabled={count >= max}
            onStep={() => set(count + 1)}
            h={BUTTON_SIZE}
            style={smallButton}
          />
        )}
        <Text
          w={FIGURE_WIDTH}
          ta="center"
          fz={fontSize}
          fw={700}
          lh={FIGURE_LINE_HEIGHT}
          c="var(--color-text-bright)"
          aria-live="polite"
          style={{ flexShrink: 0 }}
        >
          {count}
        </Text>
        {!readOnly && (
          <StepButton
            direction={-1}
            label={t("setup.stepLess", { field: label })}
            disabled={count <= 0}
            onStep={() => set(count - 1)}
            h={BUTTON_SIZE}
            style={smallButton}
          />
        )}
      </Stack>
    </Stack>
  );
}
