import type { ReactElement } from "react";
import { Box, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { SampleSwitch } from "./WelcomeGraphicParts";
import bikeImage from "@/assets/images/login_bike.webp";

// The report is a white PDF in the app too, so the paper keeps its print colours.
const PAPER = "#f8f8f8";
const INK = "#050505";
const INK_SOFT = "#525252";
const INK_BODY = "#2b2b2b";
const RULE = "#cacaca";
const PLACEHOLDER = "#c5c5c5";

// Board A4 is a 390×516 stage, board D4 a 600×600 one with the sheets a size larger.
const PHONE = {
  back: { left: 76, top: 40 },
  paper: { left: 62, top: 28 },
  scale: "",
  card: { left: 20, top: 379 },
};

const DESKTOP = {
  back: { left: 172, top: 90 },
  paper: { left: 157, top: 77 },
  scale: " scale(1.15)",
  card: { left: 115, top: 448 },
};

function ReportRow({ label }: { label: string }): ReactElement {
  return (
    <Box
      pt={8}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderTop: `1px solid ${RULE}`,
      }}
    >
      <div>{label}</div>
      <Box w={44} h={4} style={{ flexShrink: 0, borderRadius: 2, backgroundColor: PLACEHOLDER }} />
    </Box>
  );
}

export function WelcomeSharingGraphic({ desktop }: { desktop: boolean }): ReactElement {
  const { t } = useTranslation();
  const art = desktop ? DESKTOP : PHONE;

  return (
    <>
      <Box
        pos="absolute"
        w={256}
        h={430}
        bg="cards.5"
        style={{ ...art.back, borderRadius: 6, transform: `rotate(4deg)${art.scale}` }}
      />

      <Box
        pos="absolute"
        w={266}
        h={440}
        p={20}
        c={INK}
        style={{
          ...art.paper,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          borderRadius: 6,
          backgroundColor: PAPER,
          transform: `rotate(-2.5deg)${art.scale}`,
          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.4), 0 12px 24px -8px rgba(0,0,0,0.55)",
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Box w={18} h={18} bg="primary.6" style={{ borderRadius: 4 }} />
          <Text fz={13} lh="18px" fw={700} c={INK}>
            BikeCheck
          </Text>
          <Box
            ml="auto"
            py={1}
            px={6}
            fz={10}
            lh="14px"
            fw={700}
            style={{ borderRadius: 4, backgroundColor: INK, color: PAPER }}
          >
            PDF
          </Box>
        </Box>
        <Text mt={14} fz={22} lh="26px" fw={700} lts="var(--tracking-display)" c={INK}>
          {t("onboarding.welcome.sample.reportTitle")}
        </Text>
        <Text mt={2} fz={12} lh="16px" c={INK_SOFT}>
          {t("onboarding.welcome.sample.reportSubtitle")}
        </Text>
        <img src={bikeImage} alt="" style={{ display: "block", width: 226, height: "auto", marginTop: 12 }} />
        <Box mt={12} fz={12} lh="16px" c={INK_BODY} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ReportRow label={t("onboarding.welcome.sample.chainSwap")} />
          <ReportRow label={t("onboarding.welcome.sample.padsSwap")} />
          <ReportRow label={t("onboarding.welcome.sample.forkService")} />
        </Box>
      </Box>

      <Box
        pos="absolute"
        w={350}
        p={16}
        bg="cards.6"
        style={{
          ...art.card,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          borderRadius: 16,
          boxShadow:
            "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 1px 2px 0 rgba(0,0,0,0.4), 0 12px 24px -8px rgba(0,0,0,0.55)",
        }}
      >
        <Text fz={14} fw={600} c="text.6">
          {t("onboarding.welcome.sample.visibility")}
        </Text>
        <SampleSwitch
          options={[
            t("onboarding.welcome.sample.nobody"),
            t("onboarding.welcome.sample.followers"),
            t("onboarding.welcome.sample.everyone"),
          ]}
          active={2}
        />
      </Box>
    </>
  );
}
