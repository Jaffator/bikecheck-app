// UI component using feature hooks.
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Group, Loader, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Bike, Clock, Mountain, Route } from "lucide-react";
import dayjs from "dayjs";
import { tapFeedback } from "@/utils/haptics";
import { RouteMap } from "@/components/RouteMap";
import { EmptyRides } from "@/features/rides_page/EmptyRides";
import { useRides } from "./rides.queries";
import { ridePolyline } from "./ridePolyline";
import { RideDetailSheet } from "./RideDetailSheet";
import type { Ride } from "./rides.types";

// Displays one confirmed ride.
function RideRow({ ride, onOpen }: { ride: Ride; onOpen: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left" }}>
      <Paper
        radius="lg"
        p="sm"
        style={{
          // Keep the gradient when setting the card color.
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage:
            "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
          border: "1px solid var(--color-border-subtle)",
          // Use a subtle shadow for stacked cards.
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 4px 12px -6px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.12s ease",
        }}
        className="active:scale-[0.985]"
      >
        <Group gap="lg" wrap="nowrap" align="center">
          <RouteMap polyline={ridePolyline(ride.json_data)} width={50} height={50} />

          {/* Allow the title to clamp. */}
          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <Stack gap={2}>
              {/* Display the bike first. */}
              <Group gap={6} wrap="nowrap">
                <Bike size={14} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
                <Text fw={600} fz={15} c="text.6" lineClamp={1}>
                  {ride.bike_name ?? t("rides.unknownBike")}
                </Text>
              </Group>
              <Text fz={13} c="text.7">
                {ride.started_at === null ? "" : dayjs(ride.started_at).format("D. M. YYYY H:mm")}
              </Text>
            </Stack>
            <Group gap="lg" wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                <Route size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.distance", { count: toKm(ride.distance_m) })}
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <Clock size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.duration", { count: ride.duration_min ?? 0 })}
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <Mountain size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.elevation", { count: ride.elevation_up_m ?? 0 })}
                </Text>
              </Group>
            </Group>
          </Stack>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

// Convert stored metres to displayed kilometres.
function toKm(metres: number | null): number {
  return metres === null ? 0 : Math.round(metres / 1000);
}

// Lists confirmed rides with infinite scrolling.
export function CompletedRides(): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useRides();
  const [openedRide, setOpenedRide] = useState<Ride | null>(null);

  // Load the next page when the sentinel is visible.
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (node === null || !hasNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) void fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

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
              void tapFeedback();
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
}
