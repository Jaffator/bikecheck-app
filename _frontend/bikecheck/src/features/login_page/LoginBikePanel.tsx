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
const BIKE_POSITION: CSSProperties = { left: "1.92%", top: "17.24%", width: "96.15%" };
const SERVICE_AT = { left: "40.87%", bottom: "9.66%" };
const BRAKES_AT = { left: "78.49%", bottom: "14.31%" };
const FORK_AT = { left: "71.75%", bottom: "59.83%" };

const CARD_STYLE: CSSProperties = {
  width: "20%",
  gap: "0.45em",
  padding: "0.8em 0.95em",
  borderRadius: "1em",
  background: "color-mix(in srgb, var(--mantine-color-background-8) 72%, transparent)",
  backdropFilter: "blur(16px) saturate(1.3)",
  border: "1px solid var(--color-border-strong)",
  color: "var(--mantine-color-text-2)",
  // Sized by the stage, not the page, so the cards shrink with the bike.
  fontSize: "clamp(10px, 1.42cqw, 14px)",
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

function Eyebrow({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text component="span" fz="0.82em" fw={600} lh={1.25} tt="uppercase" lts="var(--tracking-label)" c="text.7" className="flex items-center gap-[0.5em]">
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

function BikeStage(): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="@container relative w-full max-w-225" style={{ aspectRatio: STAGE_RATIO }}>
      <img
        src={bikeImage}
        alt={t("auth.panelImageAlt")}
        className="absolute block h-auto"
        style={{ ...BIKE_POSITION, filter: "drop-shadow(0 28px 28px rgba(34, 51, 59, 0.35))" }}
      />
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
      <div className="flex flex-1 items-center justify-center">
        <BikeStage />
      </div>
      <div className="flex flex-col gap-3">
        {/* The size crosses 28 px at a 1018 px viewport, where the tracking band changes (design.md §9). */}
        <Title
          order={2}
          fz="clamp(26px, 2.75vw, 40px)"
          lh={1.08}
          fw={700}
          c="textDark.5"
          className="tracking-title min-[1018px]:tracking-display"
          style={{ whiteSpace: "pre-line" }}
        >
          {t("auth.panelTitle")}
        </Title>
        <Text fz={17} lh={1.5} c="textDark.5">
          {t("auth.panelSubtitle")}
        </Text>
      </div>
    </Box>
  );
}
