// The desktop login's left half: what the app tracks, shown on a bike, and the line that says so.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Box, Progress, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import bikeImage from "@/assets/images/login_bike.webp";

// Illustrative state of the bike in the photo, not anyone's data.
const BRAKE_WEAR = 62;
const FORK_WEAR = 56;
const FORK_MODEL = "Fox 38 Factory";

// Percentages of the design's 832×580 stage, so each card stays on its part at any width.
const STAGE_RATIO = "832 / 580";
// Bound by the height too, or a short window pushes the bike off the bottom.
const STAGE_WIDTH = `min(100cqw, calc(100cqh * ${STAGE_RATIO}), 1240px)`;
const BIKE_POSITION: CSSProperties = { left: "1.92%", top: "17.24%", width: "96.15%" };
const SERVICE_AT = { left: "40.87%", bottom: "9.66%" };
const BRAKES_AT = { left: "78.49%", bottom: "14.31%" };
const FORK_AT = { left: "71.75%", bottom: "59.83%" };
// Centred on the tyres' contact line, at 92.4 % of the stage's height.
const TYRE_SHADOW_BAND: CSSProperties = { top: "90.2%", width: "22%", height: "4.4%" };
const REAR_TYRE_LEFT = "10%";
const FRONT_TYRE_LEFT = "67.1%";

const CARD_STYLE: CSSProperties = {
  width: "20%",
  gap: "0.45em",
  padding: "0.8em 0.95em",
  borderRadius: "1em",
  // Near-solid: a see-through dark over the gold turns olive.
  background: "color-mix(in srgb, var(--mantine-color-background-9) 94%, transparent)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--color-border-strong)",
  color: "var(--mantine-color-text-2)",
  // Sized by the stage, not the page, so the cards shrink with the bike.
  fontSize: "clamp(13px, 1.45cqw, 18px)",
  lineHeight: 1.25,
  fontVariantNumeric: "tabular-nums",
  boxShadow: "0 10px 28px rgba(10, 10, 11, 0.22)",
};

interface CardProps {
  at: { left: string; bottom: string };
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
    <Text component="span" fz="min(0.85em, 13px)" fw={600} lh={1.25} tt="uppercase" lts="var(--tracking-label)" c="text.7" className="flex items-center gap-[0.5em]">
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
    <div className="flex justify-between gap-[0.6em]" style={{ fontSize: "0.92em", color: "var(--mantine-color-text-6)" }}>
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
function TyreShadow({ left }: { left: string }): ReactElement {
  return (
    <span
      aria-hidden
      className="absolute block"
      style={{ ...TYRE_SHADOW_BAND, left, background: "radial-gradient(closest-side, rgba(10, 10, 11, 0.38), transparent)" }}
    />
  );
}

function BikeStage(): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="@container relative" style={{ width: STAGE_WIDTH, aspectRatio: STAGE_RATIO }}>
      <TyreShadow left={REAR_TYRE_LEFT} />
      <TyreShadow left={FRONT_TYRE_LEFT} />
      <img src={bikeImage} alt={t("auth.panelImageAlt")} className="absolute block h-auto" style={BIKE_POSITION} />
      <Card at={SERVICE_AT}>
        <Eyebrow>
          <Wrench size="1.25em" color="var(--mantine-color-primary-6)" aria-hidden />
          {t("auth.showcase.serviceHistory")}
        </Eyebrow>
        <Headline>{t("auth.showcase.serviceName")}</Headline>
        <Meta label={t("auth.showcase.serviceDate")} value={t("auth.showcase.serviceWhere")} emphasis={false} />
      </Card>
      <Card at={BRAKES_AT}>
        <Eyebrow>{t("auth.showcase.brakePads")}</Eyebrow>
        <div className="flex justify-between gap-[0.6em]" style={{ fontSize: "1.1em" }}>
          <span>{t("auth.showcase.wear")}</span>
          <span style={{ fontWeight: 600 }}>{t("auth.showcase.percent", { value: BRAKE_WEAR })}</span>
        </div>
        <WearBar percent={BRAKE_WEAR} />
        <Meta label={t("auth.showcase.estimate")} value={t("auth.showcase.brakeEstimate")} />
      </Card>
      <Card at={FORK_AT}>
        <Eyebrow>{t("auth.showcase.fork")}</Eyebrow>
        <Headline>{FORK_MODEL}</Headline>
        <WearBar percent={FORK_WEAR} />
        <Meta label={t("auth.showcase.serviceIn")} value={t("auth.showcase.forkServiceIn")} />
      </Card>
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
