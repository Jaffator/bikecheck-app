// One card for the check-in and the pending sheet, so a ride reads the same in both.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Clock, Mountain, Route, type LucideIcon } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { RideMap } from "@/components/RideMap";
import { RouteMap } from "@/components/RouteMap";
import { formatDuration } from "@/features/rides/rideDuration";
import type { RideSummary } from "@/features/rides/rideSummary";

interface RideSummaryCardProps {
  ride: RideSummary;
  // Left out, the route stays Strava orange.
  routeColor?: string;
  // Desktop has the room to name the figures and the sport.
  detailed?: boolean;
}

export function RideSummaryCard({ ride, routeColor, detailed = false }: RideSummaryCardProps): ReactElement {
  return detailed ? (
    <DetailedCard ride={ride} routeColor={routeColor} />
  ) : (
    <CompactCard ride={ride} routeColor={routeColor} />
  );
}

interface CardProps {
  ride: RideSummary;
  routeColor?: string;
}

function CompactCard({ ride, routeColor }: CardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        backgroundColor: "transparent",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <Group gap="sm" wrap="nowrap" align="center" w="100%">
        <Box w={80} style={{ flexShrink: 0 }}>
          <RideMap polyline={ride.summary_polyline} height={80} interactive={false} color={routeColor} thumbnail />
        </Box>
        {/* minWidth lets the title clamp inside the flexible column. */}
        <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
          <Stack gap={4}>
            <Text fw={600} fz={15} c="text.6" lineClamp={1}>
              {rideTitle(ride)}
            </Text>
            <Text fz={13} c="text.7" className="tabular-nums">
              {startLine(ride, false)}
            </Text>
          </Stack>
          <Group justify="space-between" wrap="nowrap" w="90%" style={{ flexShrink: 0 }}>
            <IconFigure icon={Route}>{t("pendingRides.distance", { count: ride.distance_km })}</IconFigure>
            <IconFigure icon={Clock}>{formatDuration(ride.duration_min)}</IconFigure>
            <IconFigure icon={Mountain}>{t("pendingRides.elevation", { count: ride.elevation_up_m })}</IconFigure>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

function IconFigure({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }): ReactElement {
  return (
    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
      <Icon size={14} color="var(--mantine-color-text-7)" />
      <Text fz={14} c="text.7" className="tabular-nums" style={{ whiteSpace: "nowrap" }}>
        {children}
      </Text>
    </Group>
  );
}

function DetailedCard({ ride, routeColor }: CardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Box
        h={150}
        p="xs"
        style={{
          borderRadius: "var(--mantine-radius-md)",
          backgroundColor: "var(--mantine-color-cards-8)",
          border: PANEL_HAIRLINE,
        }}
      >
        <RouteMap polyline={ride.summary_polyline} width="100%" height={130} strokeWidth={2.5} color={routeColor} />
      </Box>
      <Stack gap={4}>
        <Text fw={600} fz={16} c="text.6" lineClamp={2}>
          {rideTitle(ride)}
        </Text>
        <Text fz={13} c="var(--color-text-dim)" className="tabular-nums" lineClamp={1}>
          {startLine(ride, true)}
        </Text>
      </Stack>
      <SimpleGrid cols={3} spacing="sm">
        <LabelledFigure label={t("rides.statDistance")}>
          {t("pendingRides.distance", { count: ride.distance_km })}
        </LabelledFigure>
        <LabelledFigure label={t("rides.statDuration")}>{formatDuration(ride.duration_min)}</LabelledFigure>
        <LabelledFigure label={t("rides.statElevation")}>
          {t("pendingRides.elevation", { count: ride.elevation_up_m })}
        </LabelledFigure>
      </SimpleGrid>
    </Stack>
  );
}

function LabelledFigure({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <Stack gap={3}>
      <Eyebrow>{label}</Eyebrow>
      <Text fz={16} fw={600} c="text.6" className="tabular-nums" style={{ whiteSpace: "nowrap" }}>
        {children}
      </Text>
    </Stack>
  );
}

// Older pending rides came without a name, so the date stands in.
function rideTitle(ride: RideSummary): string {
  if (ride.name !== "" || ride.started_at === null) return ride.name;
  return dayjs(ride.started_at).format("D. M. YYYY");
}

function startLine(ride: RideSummary, withSport: boolean): string {
  const start = ride.started_at === null ? null : dayjs(ride.started_at).format("D. M. YYYY H:mm");
  const sport = withSport ? (ride.sport_type ?? null) : null;
  return [start, sport].filter((part): part is string => part !== null).join(" · ");
}
