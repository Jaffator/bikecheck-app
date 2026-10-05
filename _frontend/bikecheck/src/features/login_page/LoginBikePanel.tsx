// The desktop login's left half: what the app tracks, shown on a bike, and the line that says so.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Box, Progress, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import bikeImage from "@/assets/images/login_bike.webp";
import roadBikeImage from "@/assets/images/login_road_bike.webp";

// Illustrative state of the bikes in the photos, not anyone's data.
const BRAKE_WEAR = 62;
const FORK_WEAR = 56;
const FORK_MODEL = "Fox 38 Factory";
const CHAIN_WEAR = 30;
const CHAINRING_WEAR = 72;
const CHAINRING_MODEL = "Shimano Ultegra";
const TYRE_MODEL = "Continental GP5000";

// Percentages of the design's 832×580 stage, so each card stays on its part at any width.
const STAGE_RATIO = "832 / 580";
// Bound by the height too, or a short window pushes the bike off the bottom.
const STAGE_WIDTH = `min(100cqw, calc(100cqh * ${STAGE_RATIO}), 1240px)`;
// The bikes span ~20–93 % of the stage; lifting it centres them, not the headroom above them.
const STAGE_LIFT = "translateY(-6.5%)";
const BIKE_POSITION: CSSProperties = { left: "1.92%", top: "17.24%", width: "96.15%" };
const ROAD_BIKE_POSITION: CSSProperties = { left: "7.69%", top: "19.48%", width: "84.13%" };
// Three free spots both bikes leave: above each wheel and between the wheels, under the cranks.
const TOP_LEFT: CSSProperties = { left: "0%", top: "22%" };
const TOP_RIGHT: CSSProperties = { left: "80%", top: "22%" };
const BOTTOM: CSSProperties = { left: "40%", bottom: "1%" };
// Each band is centred on its bike's tyre contact line.
const TYRE_SHADOW_SIZE: CSSProperties = { width: "22%", height: "4.4%" };
const MTB_TYRES: CSSProperties[] = [
  { top: "90.2%", left: "10%" },
  { top: "90.2%", left: "67.1%" },
];
const ROAD_TYRES: CSSProperties[] = [
  { top: "90.7%", left: "13.5%" },
  { top: "90.7%", left: "63.6%" },
];

const CARD_STYLE: CSSProperties = {
  width: "20%",
  gap: "0.45em",
  padding: "0.8em 0.95em",
  borderRadius: "1em",
  // A light sheen over a thin dark tint; the grey itself comes from the drained backdrop.
  background:
    "linear-gradient(160deg, color-mix(in srgb, var(--mantine-color-text-0) 16%, transparent), color-mix(in srgb, var(--mantine-color-text-0) 3%, transparent) 55%), color-mix(in srgb, var(--mantine-color-background-9) 28%, transparent)",
  // Light blur keeps the bike readable through the card; drained and dimmed, the gold reads dark grey.
  backdropFilter: "blur(8px) saturate(25%) brightness(0.5)",
  color: "var(--mantine-color-text-2)",
  // Sized by the stage, not the page, so the cards shrink with the bike.
  fontSize: "clamp(13px, 1.45cqw, 18px)",
  lineHeight: 1.25,
  fontVariantNumeric: "tabular-nums",
  boxShadow: "0 10px 28px rgba(10, 10, 11, 0.22)",
};

interface CardProps {
  at: CSSProperties;
  children: ReactNode;
}

// Hidden on a stage under 600 px, where three cards would cover the bike.
function Card({ at, children }: CardProps): ReactElement {
  return (
    <div className="absolute flex flex-col box-border @max-[600px]:hidden" style={{ ...CARD_STYLE, ...at }}>
      {children}
    </div>
  );
}

// Capped at 13 px, the top of the label tracking band (design.md §9).
function Eyebrow({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text component="span" fz="min(0.85em, 13px)" fw={600} lh={1.25} tt="uppercase" lts="var(--tracking-label)" c="text.3" className="flex items-center gap-[0.5em]">
      {children}
    </Text>
  );
}

function Headline({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text component="span" fz="1.1em" fw={600} lh={1.25}>
      {children}
    </Text>
  );
}

interface MetaProps {
  label: string;
  value: string;
  // A figure stands out from its label; a plain fact (a date, a place) does not.
  emphasis?: boolean;
}

function Meta({ label, value, emphasis = true }: MetaProps): ReactElement {
  const valueStyle: CSSProperties | undefined = emphasis ? { fontWeight: 600, color: "var(--mantine-color-text-2)" } : undefined;
  return (
    <div className="flex justify-between gap-[0.6em]" style={{ fontSize: "0.92em", color: "var(--mantine-color-text-3)" }}>
      <span>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

function WearBar({ percent }: { percent: number }): ReactElement {
  return (
    <Progress
      value={percent}
      size="0.3em"
      radius="0.15em"
      styles={{ root: { backgroundColor: "color-mix(in srgb, var(--mantine-color-text-0) 16%, transparent)" } }}
    />
  );
}

// A soft contact shadow; a drop-shadow on the whole photo haloes the spokes.
function TyreShadow({ at }: { at: CSSProperties }): ReactElement {
  return (
    <span
      aria-hidden
      className="absolute block"
      style={{ ...TYRE_SHADOW_SIZE, ...at, background: "radial-gradient(closest-side, rgba(10, 10, 11, 0.38), transparent)" }}
    />
  );
}

interface BikeLayerProps {
  className: string;
  image: string;
  alt: string;
  position: CSSProperties;
  tyres: CSSProperties[];
  children: ReactNode;
}

// One bike with its shadows and cards. The children fade, not the layer: a fading parent
// would cut the cards' blur off from the gold behind.
function BikeLayer({ className, image, alt, position, tyres, children }: BikeLayerProps): ReactElement {
  return (
    <div className={`absolute inset-0 ${className}`}>
      {tyres.map((at) => (
        <TyreShadow key={String(at.left)} at={at} />
      ))}
      <img src={image} alt={alt} className="absolute block h-auto" style={position} />
      {children}
    </div>
  );
}

function MountainBike(): ReactElement {
  const { t } = useTranslation();
  return (
    <BikeLayer className="login-bike-first" image={bikeImage} alt={t("auth.panelImageAlt")} position={BIKE_POSITION} tyres={MTB_TYRES}>
      <Card at={BOTTOM}>
        <Eyebrow>
          <Wrench size="1.25em" color="var(--mantine-color-primary-6)" aria-hidden />
          {t("auth.showcase.serviceHistory")}
        </Eyebrow>
        <Headline>{t("auth.showcase.serviceName")}</Headline>
        <Meta label={t("auth.showcase.serviceDate")} value={t("auth.showcase.serviceWhere")} emphasis={false} />
      </Card>
      <Card at={TOP_LEFT}>
        <Eyebrow>{t("auth.showcase.brakePads")}</Eyebrow>
        <div className="flex justify-between gap-[0.6em]" style={{ fontSize: "1.1em" }}>
          <span>{t("auth.showcase.wear")}</span>
          <span style={{ fontWeight: 600 }}>{t("auth.showcase.percent", { value: BRAKE_WEAR })}</span>
        </div>
        <WearBar percent={BRAKE_WEAR} />
        <Meta label={t("auth.showcase.estimate")} value={t("auth.showcase.brakeEstimate")} />
      </Card>
      <Card at={TOP_RIGHT}>
        <Eyebrow>{t("auth.showcase.fork")}</Eyebrow>
        <Headline>{FORK_MODEL}</Headline>
        <WearBar percent={FORK_WEAR} />
        <Meta label={t("auth.showcase.serviceIn")} value={t("auth.showcase.forkServiceIn")} />
      </Card>
    </BikeLayer>
  );
}

function RoadBike(): ReactElement {
  const { t } = useTranslation();
  return (
    <BikeLayer className="login-bike-second" image={roadBikeImage} alt={t("auth.panelRoadImageAlt")} position={ROAD_BIKE_POSITION} tyres={ROAD_TYRES}>
      <Card at={TOP_LEFT}>
        <Eyebrow>{t("auth.showcase.chain")}</Eyebrow>
        <div className="flex justify-between gap-[0.6em]" style={{ fontSize: "1.1em" }}>
          <span>{t("auth.showcase.wear")}</span>
          <span style={{ fontWeight: 600 }}>{t("auth.showcase.percent", { value: CHAIN_WEAR })}</span>
        </div>
        <WearBar percent={CHAIN_WEAR} />
        <Meta label={t("auth.showcase.estimate")} value={t("auth.showcase.chainEstimate")} />
      </Card>
      <Card at={BOTTOM}>
        <Eyebrow>{t("auth.showcase.chainring")}</Eyebrow>
        <Headline>{CHAINRING_MODEL}</Headline>
        <WearBar percent={CHAINRING_WEAR} />
        <Meta label={t("auth.showcase.lastsAnother")} value={t("auth.showcase.chainringLasts")} />
      </Card>
      <Card at={TOP_RIGHT}>
        <Eyebrow>{t("auth.showcase.tyrePressure")}</Eyebrow>
        <Headline>{TYRE_MODEL}</Headline>
        <Meta label={t("auth.showcase.front")} value={t("auth.showcase.frontPressure")} />
        <Meta label={t("auth.showcase.rear")} value={t("auth.showcase.rearPressure")} />
      </Card>
    </BikeLayer>
  );
}

function BikeStage(): ReactElement {
  return (
    <div className="@container relative" style={{ width: STAGE_WIDTH, aspectRatio: STAGE_RATIO, transform: STAGE_LIFT }}>
      <MountainBike />
      <RoadBike />
    </div>
  );
}

export function LoginBikePanel(): ReactElement {
  const { t } = useTranslation();
  return (
    <Box
      component="aside"
      bg="primary.6"
      // Pinned to the viewport, so a registration taller than the screen scrolls the form alone.
      className="sticky top-0 flex h-dvh flex-1 min-w-0 flex-col gap-7 overflow-hidden box-border"
      style={{ padding: "clamp(24px, 4.5vw, 64px)" }}
    >
      <div className="flex flex-col gap-3">
        <Title
          order={2}
          fz="clamp(32px, 3.2vw, 60px)"
          lh={1.08}
          fw={700}
          c="textDark.5"
          lts="var(--tracking-display)"
          style={{ whiteSpace: "pre-line" }}
        >
          {t("auth.panelTitle")}
        </Title>
        <Text fz="clamp(16px, 1.3vw, 20px)" lh={1.5} c="textDark.5">
          {t("auth.panelSubtitle")}
        </Text>
      </div>
      {/* A size container, so the stage can fit the height left under the title too. */}
      <div className="flex min-h-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
        <BikeStage />
      </div>
    </Box>
  );
}
