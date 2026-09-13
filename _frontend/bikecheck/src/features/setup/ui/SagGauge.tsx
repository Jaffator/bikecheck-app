// Sag as the part it is measured on: how far the suspension sinks under the rider just sitting
// on the bike, as a share of its travel. Drawn as the fork leg or the shock with the rubber
// o-ring on its shaft, pushed from the seal by the sag, as it is on the bike. The name stands
// over the picture and the figure beside it with its per cent sign, typed into as well as read;
// a minus and a plus at the foot, centred in the column as under the gauges beside and above,
// move it a point at a time - held, they keep moving.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { fieldLabel } from "@/features/add_bike_page/formStyles";
import { tapFeedback } from "@/utils/haptics";
import type { SuspensionPart } from "../dialBrand";
import { BigNumberInput } from "./BigNumberInput";
import { GaugeReadout } from "./GaugeReadout";
import { FIGURE_UNIT_GAP, STEP_PAIR_GAP, UNIT_LINE_HEIGHT, figureFontSize, unitFontSize } from "./gaugeMetrics";
import { ForkLeg, ShockBody } from "./sagDrawings";
import { PICTURE_INK_RIGHT, PICTURE_WIDTH } from "./sagPictureMetrics";
import { StepButton } from "./StepButton";

// The figure sits close by the shaft it reads off; two digits at most.
const FIGURE_GAP = 4;
const FIGURE_WIDTH = 36;

interface SagGaugeProps {
  // Which picture the sag is read off.
  part: SuspensionPart;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max: number;
  // Where a cleared figure lands on the next press.
  start: number;
  // The picture's height; the figure scales with it.
  size?: number;
  // An Archived Bike reads its sheet without being able to move anything.
  readOnly?: boolean;
}

export function SagGauge({
  part,
  label,
  value,
  onChange,
  max,
  start,
  size = 120,
  readOnly = false,
}: SagGaugeProps): ReactElement {
  const { t } = useTranslation();
  const sag = value === null ? 0 : Math.min(max, Math.max(0, value));

  const stepBy = (direction: -1 | 1): void => {
    // The first press records the start; only a recorded value is stepped.
    const next = value === null ? start : Math.min(max, Math.max(0, value + direction));
    if (next === value) return;
    tapFeedback();
    onChange(next);
  };

  return (
    <Stack gap={4} align="center">
      <Text style={fieldLabel} w={PICTURE_WIDTH} ta="center">
        {label}
      </Text>
      {/* The picture is the column's centre, over the middle of the pair; it hangs from the top,
          the fork drawn so its gold sits on the figure line. The figure hangs off its right. */}
      <Box pos="relative" w={PICTURE_WIDTH} h={size}>
        {part === "Fork" ? <ForkLeg size={size} sag={sag} /> : <ShockBody size={size} sag={sag} />}
        {/* Set by the part's own edge rather than the picture's blank margin. The sign is set
            beside the figure on its baseline, as the app writes "15 %"; the readout's own unit
            line stays blank so the figure keeps the row's line. */}
        <GaugeReadout
          size={size}
          align="flex-start"
          style={{ position: "absolute", top: 0, left: PICTURE_INK_RIGHT[part] + FIGURE_GAP }}
        >
          <Group gap={FIGURE_UNIT_GAP} wrap="nowrap" align="baseline">
            <BigNumberInput
              label={label}
              value={value}
              onChange={onChange}
              decimals={0}
              max={max}
              align="left"
              width={FIGURE_WIDTH}
              fontSize={figureFontSize(size)}
              readOnly={readOnly}
            />
            <Text fz={unitFontSize(size)} fw={500} c="var(--color-text-dim)" lh={UNIT_LINE_HEIGHT}>
              %
            </Text>
          </Group>
        </GaugeReadout>
      </Box>
      {/* Centred in the column, so the pair lines up with the pairs under the other gauges. */}
      {!readOnly && (
        <Group gap={STEP_PAIR_GAP} wrap="nowrap" justify="center" w="100%">
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
