import type { ReactElement } from "react";
import { Box } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Callout, SampleSwitch, WelcomeBike } from "./WelcomeGraphicParts";

const LINE = "var(--mantine-color-text-6)";
const POINT = "#f8f8f8";
// Board D3 is board A3 moved to the middle of the wider stage.
const DESKTOP_OFFSET = { left: 95, top: 36 };

function Anchor({ x, y }: { x: number; y: number }): ReactElement {
  return (
    <>
      <circle cx={x} cy={y} r="4" fill={POINT} />
      <circle cx={x} cy={y} r="9" stroke={POINT} strokeOpacity="0.6" />
    </>
  );
}

export function WelcomeGarageGraphic({ desktop }: { desktop: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <Box pos="absolute" w={390} h={516} style={desktop ? DESKTOP_OFFSET : { left: 0, top: 0 }}>
      <WelcomeBike left={-1010} top={-190} width={1745} />

      <svg width="390" height="516" viewBox="0 0 390 516" fill="none" style={{ position: "absolute", inset: 0 }}>
        {/* The sag range along the fork leg, and how far the rider has used it. */}
        <path d="M125.3 104.6L199.3 238.6" stroke={LINE} strokeOpacity="0.55" strokeWidth="7" strokeDasharray="1 14.3" />
        <path d="M112 201H178.6L212 182.7" stroke={POINT} strokeWidth="1.5" />
        <path d="M178 146L250 68H276" stroke={LINE} strokeOpacity="0.8" />
        <Anchor x={178} y={146} />
        <path d="M322 172V230" stroke={LINE} strokeOpacity="0.8" />
        <Anchor x={322} y={172} />
      </svg>

      <Callout value="72 psi" label={t("onboarding.welcome.sample.fork")} position={{ left: 276, top: 41, width: 94 }} />
      <Callout
        value={t("onboarding.welcome.sample.frontPressure")}
        label={t("onboarding.welcome.sample.frontTyre")}
        position={{ left: 276, top: 230, width: 94 }}
      />
      <Callout value="28 %" label={t("onboarding.welcome.sample.sag")} position={{ left: 20, top: 174, width: 92 }} />

      <Box pos="absolute" left={20} top={444} w={350}>
        <SampleSwitch options={["Trail", "Race", "Park"]} active={0} />
      </Box>
    </Box>
  );
}
