// UI component using feature hooks.
import { memo, useState, type ReactElement, type ReactNode } from "react";
import { Box, Group, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Bike, Clock, Mountain, RefreshCw, Route } from "lucide-react";
import dayjs from "dayjs";
import { RouteMap } from "@/components/RouteMap";
import { CompletedRideCard, HistoryMetric } from "@/components/CompletedRideCard";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { usePullToRefresh, type PullToRefresh } from "@/hooks/usePullToRefresh";
import { EmptyRides } from "@/features/rides_page/EmptyRides";
import { useRides } from "@/features/rides/rides.queries";
import { RideDetailSheet } from "./RideDetailSheet";
import type { Ride } from "@/features/rides/rides.types";

// Clears the floating tab bar, so the last ride can be scrolled out from under it.
const FOOTER_CLEARANCE = "calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

// Where the pull indicator sits when the list is at rest: just off the top, so it is
// uncovered by the pull itself rather than faded in on top of the first card.
const INDICATOR_OFFSET_PX = 40;

// How far a point may stray before the thumbnail drops it, in viewBox units. The card
// draws the route at fifty pixels, where one unit is half a pixel - a quarter of the
// stroke, so nothing that survives here is anything the eye could have seen.
const CARD_SIMPLIFY = 1;

// Wraps the list in the pull gesture. The indicator sits just above the first card and is
// uncovered by the pull itself, so nothing is ever drawn over a ride.
function PullFrame({ attach, refreshing, children }: PullToRefresh & { children: ReactNode }): ReactElement {
  return (
    <Box ref={attach} style={{ overscrollBehaviorY: "contain" }}>
      {/* Both boxes read the pull the gesture writes onto the element above, so a finger
          moves them without re-rendering a single card. --pull-transition is "none" while
          the finger is down and an ease-out once it lifts, whether the list springs back
          or settles under the spinner. */}
      <Box
        pos="relative"
        style={{
          transform: "translate3d(0, var(--pull, 0px), 0)",
          transition: "var(--pull-transition, none)",
        }}
      >
        <Box
          pos="absolute"
          left={0}
          right={0}
          top={-INDICATOR_OFFSET_PX}
          className="flex justify-center"
          style={{ opacity: "var(--pull-progress, 0)" }}
        >
          {refreshing ? (
            <Loader size="sm" />
          ) : (
            /* Turns with the pull, so the arrow is upright exactly when letting go reloads. */
            <RefreshCw
              size={20}
              color="var(--color-text-dim)"
              style={{ transform: "rotate(calc(var(--pull-progress, 0) * 180deg))" }}
            />
          )}
        </Box>
        {children}
      </Box>
    </Box>
  );
}

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

interface CompletedRidesProps {
  // Strava activity id from a notification URL, opened once the list has loaded it.
  openActivityId?: string;
  onOpenedActivityHandled?: () => void;
}

// Lists confirmed rides with infinite scrolling. Memoised because its props are stable and
// it reads its own query: without it, every tab switch on the rides page re-renders each
// loaded row, which is work the list has no reason to do.
export const CompletedRides = memo(function CompletedRides({
  openActivityId,
  onOpenedActivityHandled,
}: CompletedRidesProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useRides();
  const [openedRide, setOpenedRide] = useState<Ride | null>(null);

  // Load the next page when the sentinel is visible.
  const sentinel = useInfiniteScrollSentinel(hasNextPage, () => void fetchNextPage());
  // A pull at the top reloads every page the list has already loaded.
  const pull = usePullToRefresh(refetch);

  const rides = data?.pages.flatMap((page) => page.items) ?? [];

  // The ride a notification asked for, once the page holding it has arrived. A ride old
  // enough to sit past the loaded pages simply opens nothing, and the list stands as it
  // is - the notification is always about the newest ride, which is the first row.
  const requested =
    openActivityId === undefined ? null : (rides.find((ride) => ride.activity_strava_id === openActivityId) ?? null);
  // A tap wins over the URL, so closing the requested sheet and opening another works.
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
      <PullFrame {...pull}>
        <Text size="sm" c="red.5" className="m-3">
          {t("rides.loadFailed")}
        </Text>
      </PullFrame>
    );
  }

  if (rides.length === 0) {
    // Reuse the tab empty state.
    return (
      <PullFrame {...pull}>
        <EmptyRides />
      </PullFrame>
    );
  }

  return (
    <>
      <PullFrame {...pull}>
        <Stack gap="sm" className="mx-3 mt-3" pb={FOOTER_CLEARANCE}>
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
      </PullFrame>

      <RideDetailSheet ride={shownRide} onClose={closeSheet} />
    </>
  );
});
