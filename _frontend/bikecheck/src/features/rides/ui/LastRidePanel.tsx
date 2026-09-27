// Desktop Home's latest ride: its route, name and figures; a tap opens the ride.
import { useState, type ReactElement } from "react";
import { Box, Center, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelSkeletonRows } from "@/components/Panel";
import { PANEL_HAIRLINE, PRESS_TRANSITION } from "@/components/panelRows";
import { RouteMap } from "@/components/RouteMap";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { useRides } from "@/features/rides/rides.queries";
import type { Ride } from "@/features/rides/rides.types";
import { formatDuration } from "@/features/rides/rideDuration";
import { RideDetailSheet } from "./RideDetailSheet";
import { WoreOff } from "./WoreOff";

export function LastRidePanel(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRides();
  const { data: bikes } = useBikes();
  const [opened, setOpened] = useState<Ride | null>(null);

  const ride = data?.pages[0]?.items[0] ?? null;

  return (
    <Panel title={t("rides.lastRide")} link={{ label: t("page.rides"), onClick: () => navigate("/rides") }}>
      {isLoading && <PanelSkeletonRows count={3} />}
      {!isLoading && ride === null && (
        <Text fz={13} c="var(--color-text-dim)" p="md" style={{ borderTop: PANEL_HAIRLINE }}>
          {t("bikes.noRidesYet")}
        </Text>
      )}
      {ride !== null && (
        <UnstyledButton
          onClick={() => setOpened(ride)}
          className="hover-veil active:scale-[0.985]"
          w="100%"
          p="md"
          style={{ borderTop: PANEL_HAIRLINE, transition: PRESS_TRANSITION }}
        >
          <Stack gap="sm">
            <Center h={150} style={{ borderRadius: "var(--mantine-radius-sm)", backgroundColor: "var(--color-decor-sunk)" }}>
              <RouteMap polyline={ride.summary_polyline} width="90%" height={130} strokeWidth={2.5} />
            </Center>
            <Stack gap={2}>
              <Text fz={16} fw={600} c="text.6" lineClamp={1}>
                {ride.name}
              </Text>
              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                <BikeColorDot colorIndex={colorIndexOf(bikes, ride.bike_id)} size={6} />
                <Eyebrow>
                  {[
                    ride.started_at === null ? null : dayjs(ride.started_at).format("D. M. YYYY · HH:mm"),
                    ride.bike_name ?? t("rides.unknownBike"),
                  ]
                    .filter((part) => part !== null)
                    .join(" · ")}
                </Eyebrow>
              </Group>
            </Stack>
            <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              <Metric
                label={t("rides.statDistance")}
                value={t("pendingRides.distance", { count: Math.round((ride.distance_m ?? 0) / 1000) })}
              />
              <Metric label={t("rides.statDuration")} value={formatDuration(ride.duration_min ?? 0)} />
              <Metric
                label={t("rides.statElevation")}
                value={t("pendingRides.elevation", { count: ride.elevation_up_m ?? 0 })}
              />
            </Box>
            <WoreOff lines={ride.wore_off} />
          </Stack>
        </UnstyledButton>
      )}
      <RideDetailSheet ride={opened} onClose={() => setOpened(null)} />
    </Panel>
  );
}

// A figure over the word naming it, so nobody guesses which number is which.
function Metric({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Stack gap={0} style={{ minWidth: 0 }}>
      <Text className="font-mono" fz={16} fw={600} c="text.6" lineClamp={1}>
        {value}
      </Text>
      <Eyebrow>{label}</Eyebrow>
    </Stack>
  );
}
