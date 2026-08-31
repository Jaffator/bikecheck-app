// UI component using feature hooks.
import { memo, useState, type ReactElement } from "react";
import { Group, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Bike, Clock, Mountain, Route } from "lucide-react";
import dayjs from "dayjs";
import { RouteMap } from "@/components/RouteMap";
import { CompletedRideCard, HistoryMetric } from "@/components/CompletedRideCard";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { EmptyRides } from "@/features/rides_page/EmptyRides";
import { useRides } from "./rides.queries";
import { RideDetailSheet } from "./RideDetailSheet";
import type { Ride } from "./rides.types";

// How far a point may stray before the thumbnail drops it, in viewBox units. The card
// draws the route at fifty pixels, where one unit is half a pixel - a quarter of the
// stroke, so nothing that survives here is anything the eye could have seen.
const CARD_SIMPLIFY = 1;

// Displays one confirmed ride.
function RideRow({ ride, onOpen }: { ride: Ride; onOpen: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <CompletedRideCard
      onOpen={onOpen}
      leading={<RouteMap polyline={ride.summary_polyline} width={50} height={50} simplify={CARD_SIMPLIFY} />}
      /* The activity's own title leads: it is what the user named the ride, so it
         identifies it faster than the bike or the date. */
      title={ride.name}
      subtitle={ride.started_at === null ? "" : dayjs(ride.started_at).format("D. M. YYYY H:mm")}
      /* The bike sits at metadata weight — it is no longer the heading, so it goes with
         the date rather than competing with the title. */
      meta={
        <Group gap={6} wrap="nowrap">
          <Bike size={13} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
          <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
            {ride.bike_name ?? t("rides.unknownBike")}
          </Text>
        </Group>
      }
      metrics={
        <>
          <HistoryMetric icon={Route}>{t("pendingRides.distance", { count: toKm(ride.distance_m) })}</HistoryMetric>
          <HistoryMetric icon={Clock}>{t("pendingRides.duration", { count: ride.duration_min ?? 0 })}</HistoryMetric>
          <HistoryMetric icon={Mountain}>
            {t("pendingRides.elevation", { count: ride.elevation_up_m ?? 0 })}
          </HistoryMetric>
        </>
      }
    />
  );
}

// Convert stored metres to displayed kilometres.
function toKm(metres: number | null): number {
  return metres === null ? 0 : Math.round(metres / 1000);
}

// Lists confirmed rides with infinite scrolling. Memoised because it takes no props and
// reads its own query: without it, every tab switch on the rides page re-renders each
// loaded row, which is work the list has no reason to do.
export const CompletedRides = memo(function CompletedRides(): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useRides();
  const [openedRide, setOpenedRide] = useState<Ride | null>(null);

  // Load the next page when the sentinel is visible.
  const sentinel = useInfiniteScrollSentinel(hasNextPage, () => void fetchNextPage());

  const rides = data?.pages.flatMap((page) => page.items) ?? [];

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
        {t("rides.loadFailed")}
      </Text>
    );
  }

  if (rides.length === 0) {
    // Reuse the tab empty state.
    return <EmptyRides />;
  }

  return (
    <>
      <Stack gap="sm" className="m-3">
        {rides.map((ride) => (
          <RideRow
            key={ride.id}
            ride={ride}
            onOpen={() => {
              setOpenedRide(ride);
            }}
          />
        ))}

        {/* Sentinel for loading the next page. */}
        {hasNextPage && (
          <Group ref={sentinel} justify="center" p="md">
            {isFetchingNextPage && <Loader size="sm" />}
          </Group>
        )}
      </Stack>

      <RideDetailSheet ride={openedRide} onClose={() => setOpenedRide(null)} />
    </>
  );
});
