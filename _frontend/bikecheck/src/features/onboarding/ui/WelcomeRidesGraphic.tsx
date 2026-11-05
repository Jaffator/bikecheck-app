import type { ReactElement } from "react";
import { Box, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import mapImage from "@/assets/images/welcome_map.svg";
import { STRAVA, TargetDot, WearChip, WelcomeBike } from "./WelcomeGraphicParts";
import { ROUTE_PATH } from "./welcomeArt";

const MAP_FADE = "radial-gradient(ellipse 54% 52% at 55% 54%, #000 35%, transparent 100%)";
const ROUTE_GLOW = `drop-shadow(0 0 6px color-mix(in srgb, ${STRAVA} 40%, transparent))`;

// Board A1 is a 390×516 stage, board D1 a 600×600 one.
const PHONE = {
  size: [390, 516],
  map: { left: 74, top: -5, width: 361.6, height: 274.7, scale: 0.82 },
  bike: { left: -39, top: 241, width: 471.15 },
  stats: { left: 20, top: 6 },
  chain: { left: 20, top: 296 },
  fork: { right: 20, top: 282 },
  pads: { right: 144, top: 452 },
  leaders: [
    { line: "M82 324V397", dot: [82, 406] },
    { line: "M306 310L292 324", dot: [286, 330] },
    { line: "M246 466H270.4L309 427.4", dot: [315, 422] },
  ],
};

const DESKTOP = {
  size: [600, 600],
  map: { left: 172, top: 2, width: 396.9, height: 301.5, scale: 0.9 },
  bike: { left: 30, top: 276, width: 523.5 },
  stats: { left: 36, top: 32 },
  chain: { left: 102, top: 341 },
  fork: { left: 383, top: 327 },
  pads: { right: 262, top: 510 },
  leaders: [
    { line: "M164 369V450", dot: [164, 459] },
    { line: "M411 355L397 369", dot: [391, 375] },
    { line: "M338 524H376L417 483", dot: [423, 477] },
  ],
};

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <Text fz={12} lh="16px" c="var(--color-muted)">
        {label}
      </Text>
      <Text
        fz={24}
        lh="30px"
        fw={700}
        lts="var(--tracking-title)"
        c="text.6"
        style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
      >
        {value}
      </Text>
    </div>
  );
}

export function WelcomeRidesGraphic({ desktop }: { desktop: boolean }): ReactElement {
  const { t } = useTranslation();
  const art = desktop ? DESKTOP : PHONE;
  const [width, height] = art.size;
  const { scale, ...map } = art.map;

  return (
    <>
      <img
        src={mapImage}
        alt=""
        style={{ position: "absolute", ...map, maxWidth: "none", WebkitMaskImage: MAP_FADE, maskImage: MAP_FADE }}
      />
      <svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`} fill="none" style={{ position: "absolute", inset: 0 }}>
        <g
          transform={`translate(${String(map.left)} ${String(map.top)}) scale(${String(scale)})`}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={ROUTE_PATH} stroke={STRAVA} strokeWidth="3" style={{ filter: ROUTE_GLOW }} />
          <circle cx="173" cy="172" r="5.5" fill={STRAVA} stroke="var(--mantine-color-text-1)" strokeWidth="2.5" />
        </g>
      </svg>

      <WelcomeBike {...art.bike} />

      <svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`} fill="none" style={{ position: "absolute", inset: 0 }}>
        {art.leaders.map(({ line, dot: [cx, cy] }) => (
          <g key={line}>
            <path d={line} stroke={STRAVA} strokeOpacity="0.75" />
            <TargetDot x={cx} y={cy} color={STRAVA} ringOpacity={0.5} />
          </g>
        ))}
      </svg>

      <Box pos="absolute" style={{ ...art.stats, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Text fz={12} lh="16px" fw={600} c={STRAVA}>
            Strava
          </Text>
          <Text fz={16} lh="22px" fw={600} c="text.6" style={{ whiteSpace: "nowrap" }}>
            {t("onboarding.welcome.sample.rideName")}
          </Text>
        </div>
        <Box style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Stat label={t("onboarding.welcome.sample.distance")} value="34 km" />
          <Stat label={t("onboarding.welcome.sample.time")} value="1:52 h" />
          <Stat label={t("onboarding.welcome.sample.elevation")} value="610 m" />
        </Box>
      </Box>

      <WearChip label={t("onboarding.welcome.sample.chain")} value="+3 %" position={art.chain} />
      <WearChip label={t("onboarding.welcome.sample.fork")} value="+4 %" position={art.fork} />
      <WearChip label={t("onboarding.welcome.sample.pads")} value="+2 %" position={art.pads} />
    </>
  );
}
