// Renders pending rides through query hooks.
import { useState, type ReactElement } from "react";
import { Group, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Clock, Mountain, Route } from "lucide-react";
import dayjs from "dayjs";
import { RouteMap } from "@/components/RouteMap";
import { HistoryCard, HistoryMetric } from "@/components/HistoryCard";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import trailIllustration from "@/assets/images/rides.png";
import { usePendingRides } from "./strava.queries";
import { PendingRideSheet } from "./PendingRideSheet";
import type { PendingRide } from "./strava.types";

// Renders a pending ride with recognizable route and metrics.
function PendingRideRow({ ride, onOpen }: { ride: PendingRide; onOpen: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <HistoryCard
      onOpen={onOpen}
      /* Route shape distinguishes otherwise similar ride rows. */
      leading={<RouteMap polyline={ride.summary_polyline} width={50} height={50} />}
      /* Clamps long Strava titles to preserve row height. */
      title={ride.name || dayjs(ride.started_at).format("D. M. YYYY")}
      subtitle={dayjs(ride.started_at).format("D. M. YYYY H:mm")}
      metrics={
        <>
          <HistoryMetric icon={Route}>{t("pendingRides.distance", { count: ride.distance_km })}</HistoryMetric>
          <HistoryMetric icon={Clock}>{t("pendingRides.duration", { count: ride.duration_min })}</HistoryMetric>
          <HistoryMetric icon={Mountain}>{t("pendingRides.elevation", { count: ride.elevation_up_m })}</HistoryMetric>
        </>
      }
    />
  );
}

interface PendingRidesProps {
  // Optional activity id from a notification URL.
  openActivityId?: string;
  onOpenedActivityHandled?: () => void;
}

// The Pending tab: every ride still waiting to be told which bike it was on.
export function PendingRides({ openActivityId, onOpenedActivityHandled }: PendingRidesProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError } = usePendingRides();
  const [openedRide, setOpenedRide] = useState<PendingRide | null>(null);

  const rides = data ?? [];

  // Resolves the notification-requested ride once list data arrives.
  const requested =
    openActivityId === undefined ? null : (rides.find((ride) => ride.activity_id === openActivityId) ?? null);
  const shownRide = openedRide ?? requested;

  function closeSheet(): void {
    setOpenedRide(null);
    // Clears the URL parameter to prevent reopening.
    onOpenedActivityHandled?.();
  }

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (isError) {
    return (
      <Text size="sm" c="red.5" className="m-3">
        {t("pendingRides.loadFailed")}
      </Text>
    );
  }

  if (rides.length === 0) {
    // Reuses the rides tab empty-state layout.
    return (
      <EmptyStateLayout
        illustration={trailIllustration}
        title={t("pendingRides.empty")}
        body={t("pendingRides.emptyBody")}
      />
    );
  }

  return (
    <>
      <Stack gap="sm" className="m-3">
        {rides.map((ride) => (
          <PendingRideRow
            key={ride.activity_id}
            ride={ride}
            onOpen={() => {
              setOpenedRide(ride);
            }}
          />
        ))}
      </Stack>

      <PendingRideSheet ride={shownRide} onClose={closeSheet} />
    </>
  );
}
