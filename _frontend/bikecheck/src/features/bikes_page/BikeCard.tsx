// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Paper, Progress, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { StravaPairingHint } from "../strava/StravaPairingHint";
import { ArrowUpRight, Clock, Gauge } from "lucide-react";
import type { Bike } from "../bikes/bikes.types";
import { bikeTitle } from "../bikes/bikeTitle";
import { BikePhoto } from "./BikePhoto";
import { HEALTH_COLORS, worstReading, type HealthReading } from "./bikeHealth.types";
import { HealthBadge } from "./HealthBadge";
import { StravaLinkedBadge } from "./StravaLinkedBadge";

interface BikeCardProps {
  bike: Bike;
  // Empty until the API serves per-bike wear; the card simply omits the section.
  readings?: HealthReading[];
  onOpen: () => void;
}

// How wide the health bar runs. Short enough to read as a gauge beside its label rather
// than a progress bar the card is waiting on.
const METER_WIDTH = 72;

// A hairline between two figures on the data line, the only divider the card carries.
function Rule(): ReactElement {
  return <Box aria-hidden w={1} h={12} style={{ backgroundColor: "var(--mantine-color-cards-5)", flexShrink: 0 }} />;
}

// One figure on the data line: its icon and the number, in the card's data voice.
function Metric({ icon, children }: { icon: ReactNode; children: ReactNode }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap">
      {icon}
      <Text className="font-mono" fz={13} tt="uppercase" c="text.6" lts="0.02em" style={{ whiteSpace: "nowrap" }}>
        {children}
      </Text>
    </Group>
  );
}

// The part that needs attention first, as one line: how much of its life is left, what it
// is, and the figure behind it.
function HealthMeter({ reading }: { reading: HealthReading }): ReactElement {
  const { t } = useTranslation();
  const color = HEALTH_COLORS[reading.level];

  return (
    <Group gap="sm" wrap="nowrap">
      <Progress
        value={reading.fill * 100}
        size={5}
        radius="xl"
        w={METER_WIDTH}
        style={{ flexShrink: 0 }}
        styles={{
          root: { backgroundColor: "var(--color-decor)" },
          section: { backgroundColor: color },
        }}
      />
      <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lts="0.08em" lineClamp={1}>
        {t(reading.labelKey)}
      </Text>
      <Text
        className="font-mono"
        fz={11}
        tt="uppercase"
        lts="0.08em"
        ml="auto"
        // Emphasize a reading that is no longer good.
        c={reading.level === "good" ? "var(--color-text-dim)" : color}
        style={{ whiteSpace: "nowrap" }}
      >
        {reading.value}
      </Text>
    </Group>
  );
}

export function BikeCard({ bike, readings = [], onOpen }: BikeCardProps): ReactElement {
  const { t } = useTranslation();

  const title = bikeTitle(bike);
  // The garage leads with the part that needs attention first; the whole list is on the
  // bike's own page.
  const worst = worstReading(readings);

  return (
    <Paper
      radius="lg"
      // Open bike details from the entire card.
      onClick={() => {
        onOpen();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        // Space would scroll the garage instead of opening the bike.
        event.preventDefault();
        onOpen();
      }}
      style={{
        overflow: "hidden",
        // `bg` would emit the `background` shorthand - see docs/ui/card-surface.md.
        backgroundColor: "var(--mantine-color-cards-6)",
        // The hairline every card wears, so the edge does not dissolve into the page.
        border: "1px solid var(--mantine-color-cards-5)",
        // Same three-part shadow the other cards use, one step deeper because this card is
        // the largest on the screen.
        boxShadow: "var(--elev-hero)",
        // Animate tap feedback before navigation.
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        cursor: "pointer",
        position: "relative",
      }}
      // Tailwind's active: variant handles the pressed state without tracking it.
      className="bike-card active:scale-[0.985]"
    >
      {/* Its own layer rather than a background on the card: the photo and the content sit
          on their own opaque backgrounds and would paint over a card-level gradient,
          leaving only a sliver of it visible. The card's own glow is lit from the top-left
          corner, which the photo covers, so this one comes up from under the data line. */}
      <Box
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(120% 90% at 0% 100%, color-mix(in srgb, var(--mantine-color-primary-6) 8%, transparent) 0%, transparent 50%)",
        }}
      />

      {/* The photo carries the name: the gradient that evens the photos out is already
          there, and the card below it is left to the numbers. */}
      <BikePhoto imageUrl={bike.image_url} title={title} subtitle={bike.bikename} titleSize={20}>
        {/* Stack overall bike badges in the photo's bottom corner. */}
        <Stack gap={6} align="flex-end">
          <HealthBadge readings={readings} />
          <StravaLinkedBadge stravaGearId={bike.strava_gear_id} />
        </Stack>
      </BikePhoto>

      <Stack gap="xs" px="md" py="sm" style={{ position: "relative", zIndex: 2 }}>
        {/* The three readings a bike keeps by itself, in the order the bike's own page
            gives them. The pairing hint takes whatever room is left. */}
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Metric icon={<Gauge size={14} color="var(--color-text-dim)" />}>
            {t("bikes.kilometres", { count: bike.total_km ?? 0 })}
          </Metric>
          <Rule />
          <Metric icon={<ArrowUpRight size={14} color="var(--color-text-dim)" />}>
            {t("bikes.metres", { count: bike.total_elevation_m ?? 0 })}
          </Metric>
          <Rule />
          <Metric icon={<Clock size={14} color="var(--color-text-dim)" />}>
            {t("bikes.hours", { count: Math.round((bike.total_time_min ?? 0) / 60) })}
          </Metric>
          <StravaPairingHint stravaGearId={bike.strava_gear_id} />
        </Group>

        {worst !== null && <HealthMeter reading={worst} />}
      </Stack>
    </Paper>
  );
}
