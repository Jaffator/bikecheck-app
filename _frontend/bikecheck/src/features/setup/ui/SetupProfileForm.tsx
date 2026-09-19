// The numbers of one Setup Profile as a sheet: Tyres always, Fork and Shock by the bike's own
// suspension flags rather than by what is mounted (ADR 0029). Tyres read in the owner's Tyre
// Pressure Unit; a fork or shock is always psi, because that is what every shock pump shows.
import type { CSSProperties, ReactElement } from "react";
import { Divider, SimpleGrid, Stack, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { autosizeInputStyles } from "@/features/add_bike_page/formStyles";
import type { TirePressureUnit } from "@/features/users/users.types";
import type { DialKind } from "../dial.types";
import type { MountedSuspension } from "../dialBrand";
import {
  PRESSURE_DECIMALS,
  TYRE_PRESSURE_MAX,
  TYRE_PRESSURE_START,
  TYRE_PRESSURE_STEP,
  fromPsi,
  otherUnitReading,
} from "../pressure";
import {
  FORK_PSI_START,
  SAG_START,
  SHOCK_PSI_START,
  clickField,
  sectionClicks,
  type SetupFormValues,
  type SetupSuspension,
} from "../setupForm";
import { GAUGE_GRID_SPACING, GAUGE_LABEL_GAP } from "./gaugeMetrics";
import { SagGauge } from "./SagGauge";
import { SetupGauge } from "./SetupGauge";
import { SetupSection } from "./SetupSection";
import { SuspensionDials } from "./SuspensionDials";
import { TokenStepper } from "./TokenStepper";

// Suspension pressure is accepted to a tenth of a psi, which is what the API stores.
const SUSPENSION_PSI_DECIMALS = 1;
// The buttons move a whole psi at a time; a tenth is typed, never stepped to.
export const SUSPENSION_PSI_MAX = 350;
const SUSPENSION_PSI_STEP = 1;
// Volume spacers: a fork or shock takes a handful, never more than eight.
const TOKENS_MAX = 8;
// Between the pressure gauge, the token column and the sag picture.
const GAUGE_ROW_GAP = 16;
// Under the gauge row, before the knobs.
const DIALS_GAP = 30;
// Before the divider. Less than DIALS_GAP by what the gauges' names now give their bodies, so
// the controls sit lower without the line moving.
const DIVIDER_GAP = DIALS_GAP - (GAUGE_LABEL_GAP - 4);
// Pressure, tokens and sag in one row. The outer columns share what is left over, so the token
// column falls in the middle of the card however wide the gauge and the sag picture are.
const gaugeRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  justifyItems: "center",
  alignItems: "start",
  columnGap: GAUGE_ROW_GAP,
};
// Sag is set between a fifth and a third of the travel; half is already far past any chart.
const SAG_MAX = 50;

// The same pressure as a shock pump in bar would show it, under the psi figure.
function barHint(psi: number): string {
  return `(${fromPsi(psi, "bar")} bar)`;
}

interface SetupProfileFormProps {
  values: SetupFormValues;
  onChange: <K extends keyof SetupFormValues>(key: K, value: SetupFormValues[K]) => void;
  unit: TirePressureUnit;
  hasFork: boolean;
  hasShock: boolean;
  // The mounted fork and shock: which knob each section draws (ADR 0029) and how many
  // adjusters it carries. Null when none is mounted; the generic single knob then stands in.
  fork: MountedSuspension | null;
  shock: MountedSuspension | null;
  onDualChange: (section: SetupSuspension, kind: DialKind, dual: boolean) => void;
  // An Archived Bike is a frozen record: every field is read, none is typed into.
  readOnly?: boolean;
}

export function SetupProfileForm({
  values,
  onChange,
  unit,
  hasFork,
  hasShock,
  fork,
  shock,
  onDualChange,
  readOnly = false,
}: SetupProfileFormProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      {/* ---------- Tyres ---------- */}
      <SetupSection title={t("setup.tyres")}>
        {/* The same two columns as the suspension cards, so the steppers line up down the sheet. */}
        <SimpleGrid cols={2} spacing={GAUGE_GRID_SPACING}>
          <SetupGauge
            label={t("setup.front")}
            value={values.front_tire}
            onChange={(value) => onChange("front_tire", value)}
            unit={unit}
            decimals={PRESSURE_DECIMALS[unit]}
            max={TYRE_PRESSURE_MAX[unit]}
            step={TYRE_PRESSURE_STEP[unit]}
            start={TYRE_PRESSURE_START[unit]}
            hint={(value) => otherUnitReading(value, unit)}
            readOnly={readOnly}
          />
          <SetupGauge
            label={t("setup.rear")}
            value={values.rear_tire}
            onChange={(value) => onChange("rear_tire", value)}
            unit={unit}
            decimals={PRESSURE_DECIMALS[unit]}
            max={TYRE_PRESSURE_MAX[unit]}
            step={TYRE_PRESSURE_STEP[unit]}
            start={TYRE_PRESSURE_START[unit]}
            hint={(value) => otherUnitReading(value, unit)}
            readOnly={readOnly}
          />
        </SimpleGrid>
      </SetupSection>

      {/* ---------- Fork ---------- */}
      {hasFork && (
        <SetupSection title={t("setup.fork")}>
          {/* The two gauges at the sides with the token count between them. */}
          <div style={gaugeRow}>
            <SetupGauge
              label={t("setup.pressure")}
              value={values.fork_pressure_psi}
              onChange={(value) => onChange("fork_pressure_psi", value)}
              unit="psi"
              decimals={SUSPENSION_PSI_DECIMALS}
              max={SUSPENSION_PSI_MAX}
              step={SUSPENSION_PSI_STEP}
              start={FORK_PSI_START}
              hint={barHint}
              readOnly={readOnly}
            />
            <TokenStepper
              label={t("setup.tokens")}
              value={values.fork_tokens}
              onChange={(value) => onChange("fork_tokens", value)}
              max={TOKENS_MAX}
              readOnly={readOnly}
            />
            <SagGauge
              part="Fork"
              label={t("setup.sag")}
              value={values.fork_sag_percent}
              onChange={(value) => onChange("fork_sag_percent", value)}
              max={SAG_MAX}
              start={SAG_START}
              readOnly={readOnly}
            />
          </div>
          <Divider color="rgba(255, 255, 255, 0.09)" mt={DIVIDER_GAP} />
          <SuspensionDials
            style={{ marginTop: DIALS_GAP }}
            section="fork"
            part={fork}
            onDualChange={(kind, dual) => onDualChange("fork", kind, dual)}
            clicks={sectionClicks(values, "fork")}
            onChange={(ring, value) => onChange(clickField("fork", ring), value)}
            readOnly={readOnly}
          />
        </SetupSection>
      )}

      {/* ---------- Shock ---------- */}
      {hasShock && (
        <SetupSection title={t("setup.shock")}>
          {/* The two gauges at the sides with the token count between them. */}
          <div style={gaugeRow}>
            <SetupGauge
              label={t("setup.pressure")}
              value={values.shock_pressure_psi}
              onChange={(value) => onChange("shock_pressure_psi", value)}
              unit="psi"
              decimals={SUSPENSION_PSI_DECIMALS}
              max={SUSPENSION_PSI_MAX}
              step={SUSPENSION_PSI_STEP}
              start={SHOCK_PSI_START}
              hint={barHint}
              readOnly={readOnly}
            />
            <TokenStepper
              label={t("setup.tokens")}
              value={values.shock_tokens}
              onChange={(value) => onChange("shock_tokens", value)}
              max={TOKENS_MAX}
              readOnly={readOnly}
            />
            <SagGauge
              part="Shock"
              label={t("setup.sag")}
              value={values.shock_sag_percent}
              onChange={(value) => onChange("shock_sag_percent", value)}
              max={SAG_MAX}
              start={SAG_START}
              readOnly={readOnly}
            />
          </div>
          <Divider color="rgba(255, 255, 255, 0.09)" mt={DIVIDER_GAP} />
          <SuspensionDials
            style={{ marginTop: DIALS_GAP }}
            section="shock"
            part={shock}
            onDualChange={(kind, dual) => onDualChange("shock", kind, dual)}
            clicks={sectionClicks(values, "shock")}
            onChange={(ring, value) => onChange(clickField("shock", ring), value)}
            readOnly={readOnly}
          />
        </SetupSection>
      )}

      {/* ---------- Note ---------- */}
      <Textarea
        label={t("setup.note")}
        placeholder={readOnly ? undefined : t("setup.notePlaceholder")}
        styles={autosizeInputStyles}
        autosize
        minRows={2}
        maxRows={5}
        value={values.note}
        readOnly={readOnly}
        onChange={(event) => onChange("note", event.currentTarget.value)}
      />
    </Stack>
  );
}
