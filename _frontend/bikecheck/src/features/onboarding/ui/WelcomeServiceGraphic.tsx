import type { ReactElement } from "react";
import { Box, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { attentionColor } from "@/features/service_tracking/attentionLevel";
import { RAISED_SHADOW, WelcomeBike } from "./WelcomeGraphicParts";

const SAMPLE_WEAR = "94 %";
// The same reading the app would paint on a part at this wear.
const WEAR_ALERT = attentionColor(94);
const RING_TRACK = "#3a3833";
const RING_MASK_ID = "welcome-ring-ticks";

// Board A2 is a 390×516 stage, board D2 a 600×600 one.
const PHONE = {
  bike: { left: -305, top: -315, width: 1396 },
  ring: { cx: 258, cy: 228, r: 84, stroke: 12, halo: 22 },
  tick: { x: 227, top: 136 },
  pill: { left: 189, top: 102 },
  alert: { left: 20, top: 406, width: 350 },
};

const DESKTOP = {
  bike: { left: -414, top: -429, width: 1745 },
  ring: { cx: 290, cy: 250, r: 105, stroke: 15, halo: 27 },
  tick: { x: 251, top: 138 },
  pill: { left: 221, top: 110 },
  alert: { left: 100, top: 416, width: 380 },
};

export function WelcomeServiceGraphic({ desktop }: { desktop: boolean }): ReactElement {
  const { t } = useTranslation();
  const art = desktop ? DESKTOP : PHONE;
  const { cx, cy, r, stroke, halo } = art.ring;
  const rotate = `rotate(-90 ${String(cx)} ${String(cy)})`;
  const circle = { cx, cy, r };

  return (
    <>
      <WelcomeBike {...art.bike} />

      <svg width="600" height="600" viewBox="0 0 600 600" fill="none" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <mask id={RING_MASK_ID}>
            <circle {...circle} fill="none" stroke="#fff" strokeWidth={stroke} pathLength="360" strokeDasharray="1 2" />
          </mask>
        </defs>
        <circle {...circle} stroke="#0a0a0b" strokeOpacity="0.72" strokeWidth={halo} />
        <g mask={`url(#${RING_MASK_ID})`} strokeWidth={stroke}>
          <circle {...circle} stroke={RING_TRACK} />
          <circle
            {...circle}
            stroke="var(--mantine-color-primary-6)"
            pathLength="360"
            strokeDasharray="270 360"
            transform={rotate}
          />
          <circle
            {...circle}
            stroke={WEAR_ALERT}
            pathLength="360"
            strokeDasharray="68.4 360"
            strokeDashoffset="-270"
            transform={rotate}
          />
        </g>
        <path d={`M${String(art.tick.x)} ${String(art.tick.top)}v7`} stroke={WEAR_ALERT} />
        <circle cx={art.tick.x} cy={art.tick.top + 14} r="5" fill={WEAR_ALERT} />
      </svg>

      <Box
        pos="absolute"
        w={60}
        h={28}
        bg="cards.6"
        fz={14}
        fw={600}
        c={WEAR_ALERT}
        style={{
          ...art.pill,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          borderRadius: 9999,
          boxShadow: RAISED_SHADOW,
        }}
      >
        {SAMPLE_WEAR}
      </Box>

      <Box
        pos="absolute"
        p={16}
        bg="cards.5"
        style={{
          ...art.alert,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          borderRadius: 16,
          boxShadow: RAISED_SHADOW,
        }}
      >
        <Box
          w={36}
          h={36}
          bg="primary.6"
          c="textDark.6"
          style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10 }}
        >
          <Bell size={20} />
        </Box>
        <div>
          <Text fz={14} fw={600} c="text.6">
            {t("onboarding.welcome.sample.alertTitle")}
          </Text>
          <Text fz={13} lh="18px" c="var(--color-text-dim)">
            {t("onboarding.welcome.sample.alertBody")}
          </Text>
        </div>
      </Box>
    </>
  );
}
