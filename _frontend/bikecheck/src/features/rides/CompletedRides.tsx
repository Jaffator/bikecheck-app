// A component only talks to hooks — no fetch, no URL, no manual loading state.
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

// One confirmed ride, drawn as the pending row is: the same card carrying the
// same figures, so a ride does not change shape when it stops being pending.
function RideRow({ ride, onOpen }: { ride: Ride; onOpen: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left" }}>
      <Paper
        radius="lg"
        p="sm"
        style={{
          // The shared card surface — see docs/ui/card-surface.md. Colour, glow
          // and inner edge all live in this one object: `bg` would emit the
          // `background` shorthand and wipe the gradient beside it.
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage:
            "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
          border: "1px solid var(--color-border-subtle)",
          // The list's flatter shadow rather than the doc's: a column of cards
          // with the full lift reads as clutter.
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 4px 12px -6px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.12s ease",
        }}
        className="active:scale-[0.985]"
      >
        <Group gap="lg" wrap="nowrap" align="center">
          <RouteMap polyline={ridePolyline(ride.json_data)} width={50} height={50} />

          {/* minWidth lets the column shrink below its content, without which
              the title's lineClamp has nothing to clamp against. */}
          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <Stack gap={2}>
              {/* The bike leads: these rides are already answered, so what tells
                  them apart is which bike carried them. */}
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

// The list stores metres; the card has always shown kilometres.
function toKm(metres: number | null): number {
  return metres === null ? 0 : Math.round(metres / 1000);
}

// The rides the user has confirmed onto a bike, newest first. Pages arrive as
// the user reaches the end of the list rather than all at once.
export function CompletedRides(): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useRides();
  const [openedRide, setOpenedRide] = useState<Ride | null>(null);

  // Watches the end of the list: once the sentinel scrolls into view there is
  // nothing below, which is the moment to ask for the next page.
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
    // The tab's own empty state, kept as it was before the list existed.
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

        {/* Sits below the last card, so seeing it means the list ran out. */}
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
