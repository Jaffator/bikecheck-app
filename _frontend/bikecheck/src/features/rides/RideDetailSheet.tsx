// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Drawer, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { RouteMap } from "@/components/RouteMap";
import { ridePolyline } from "./ridePolyline";
import type { Ride } from "./rides.types";

interface RideDetailSheetProps {
  // The ride being shown. Null closes the sheet — the caller owns which one is
  // open, as the list is what the user taps.
  ride: Ride | null;
  onClose: () => void;
}

// One figure of the ride, as a label above its value.
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

// What the app recorded for one ride. Everything shown here already travelled
// with the list, so opening the sheet asks the backend for nothing.
export function RideDetailSheet({ ride, onClose }: RideDetailSheetProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Drawer
      opened={ride !== null}
      onClose={onClose}
      position="bottom"
      size="lg"
      radius="md"
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, display: "flex", flexDirection: "column" },
        header: { backgroundColor: "var(--mantine-color-cards-6)", marginBottom: "1.5rem" },
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

          {/* The shared card surface — see docs/ui/card-surface.md. */}
          <Paper
            radius="lg"
            p="md"
            style={{
              backgroundColor: "var(--mantine-color-cards-6)",
              backgroundImage:
                "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
              border: "1px solid var(--color-border-subtle)",
              boxShadow:
                "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
            }}
          >
            <Stack gap="md">
              {/* The route reads as the picture of the ride, so it takes the
                  full width here rather than the list's thumbnail. */}
              <RouteMap polyline={ridePolyline(ride.json_data)} width="100%" height={140} strokeWidth={3} />

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
    </Drawer>
  );
}

// The ride stores metres; the sheet shows kilometres, as the card does.
function toKm(metres: number | null): number {
  return metres === null ? 0 : Math.round(metres / 1000);
}
