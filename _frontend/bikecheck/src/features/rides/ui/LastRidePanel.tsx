// Desktop Home's latest ride: its route, name and figures; a tap opens the ride.
import { useState, type ReactElement, type ReactNode } from "react";
import { Center, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelSkeletonRows } from "@/components/Panel";
import { PANEL_HAIRLINE, PRESS_TRANSITION } from "@/components/panelRows";
import { RouteMap } from "@/components/RouteMap";
import { useRides } from "@/features/rides/rides.queries";
import type { Ride } from "@/features/rides/rides.types";
import { formatDuration } from "@/features/rides/rideDuration";
import { RideDetailSheet } from "./RideDetailSheet";

export function LastRidePanel(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRides();
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
              <Eyebrow>
                {[
                  ride.started_at === null ? null : dayjs(ride.started_at).format("D. M. YYYY"),
                  ride.bike_name ?? t("rides.unknownBike"),
                ]
                  .filter((part) => part !== null)
                  .join(" · ")}
              </Eyebrow>
            </Stack>
            <Group gap="md" wrap="nowrap">
              <Metric>{t("pendingRides.distance", { count: Math.round((ride.distance_m ?? 0) / 1000) })}</Metric>
              <Metric>{t("pendingRides.elevation", { count: ride.elevation_up_m ?? 0 })}</Metric>
              <Metric>{formatDuration(ride.duration_min ?? 0)}</Metric>
            </Group>
          </Stack>
        </UnstyledButton>
      )}
      <RideDetailSheet ride={opened} onClose={() => setOpened(null)} />
    </Panel>
  );
}

function Metric({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text className="font-mono" fz={13} c="text.7" style={{ whiteSpace: "nowrap" }}>
      {children}
    </Text>
  );
}
