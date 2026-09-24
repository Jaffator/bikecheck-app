// UI component using feature hooks.
import type { ReactElement } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { RouteMap } from "@/components/RouteMap";
import type { Ride } from "@/features/rides/rides.types";

// Mantine's large sheet: room for the map and both rows of figures.
const SHEET_HEIGHT = "var(--drawer-size-lg)";

interface RideDetailSheetProps {
  // Null closes the sheet.
  ride: Ride | null;
  onClose: () => void;
}

// Displays one ride statistic.
function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
      <Text fz={12} c="text.7" tt="uppercase" style={{ letterSpacing: "0.06em" }}>
        {label}
      </Text>
      <Text fw={600} fz={16} c="text.6">
        {value}
      </Text>
    </Stack>
  );
}

// Displays data already loaded with the ride.
export function RideDetailSheet({ ride, onClose }: RideDetailSheetProps): ReactElement {
  const { t } = useTranslation();

  return (
    <ResponsiveSheet
      opened={ride !== null}
      onClose={onClose}
      desktop="panel"
      styles={{
        content: {
          height: SHEET_HEIGHT,
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, display: "flex", flexDirection: "column" },
        header: { marginBottom: "1.5rem" },
        title: { flex: 1, textAlign: "center", marginInlineStart: "2rem" },
      }}
    >
      {ride !== null && (
        <Stack gap={20} pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
          <Stack gap={4}>
            <Text fw={900} fz={20} c="text.7" ta="center">
              {ride.bike_name ?? t("rides.unknownBike")}
            </Text>
            <Text fz={13} c="text.7" ta="center">
              {ride.started_at === null ? "" : dayjs(ride.started_at).format("D. M. YYYY H:mm")}
            </Text>
          </Stack>

          {/* Shared card surface. */}
          <Paper
            radius="lg"
            p="md"
            style={{
              backgroundColor: "var(--mantine-color-cards-6)",
              backgroundImage: "var(--card-glow)",
              border: "1px solid var(--color-border-subtle)",
              boxShadow: "var(--elev-panel)",
            }}
          >
            <Stack gap="md">
              {/* Every point Strava gave us: this map is big enough to show them. */}
              <RouteMap polyline={ride.summary_polyline} width="100%" height={140} strokeWidth={3} />

              <Group gap="md" wrap="nowrap">
                <Stat label={t("rides.statDistance")} value={`${toKm(ride.distance_m)} km`} />
                <Stat label={t("rides.statDuration")} value={`${ride.duration_min ?? 0} min`} />
                <Stat label={t("rides.statElevation")} value={`${ride.elevation_up_m ?? 0} m`} />
              </Group>

              <Group gap="md" wrap="nowrap">
                <Stat label={t("rides.statDescent")} value={`${ride.elevation_down_m ?? 0} m`} />
                <Stat label={t("rides.statAvgSpeed")} value={`${ride.speed_avg ?? 0} km/h`} />
                <Stat label={t("rides.statMaxSpeed")} value={`${ride.max_speed_kmh ?? 0} km/h`} />
              </Group>
            </Stack>
          </Paper>
        </Stack>
      )}
    </ResponsiveSheet>
  );
}

// Convert stored metres to displayed kilometres.
function toKm(metres: number | null): number {
  return metres === null ? 0 : Math.round(metres / 1000);
}
