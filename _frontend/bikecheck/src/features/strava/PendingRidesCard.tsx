// Renders pending rides through query hooks.
import { useState, type ReactElement } from "react";
import { Group, Loader, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Clock, Mountain, Route } from "lucide-react";
import dayjs from "dayjs";
import { tapFeedback } from "@/utils/haptics";
import { RouteMap } from "@/components/RouteMap";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import trailIllustration from "@/assets/images/rides.png";
import { usePendingRides } from "./strava.queries";
import { PendingRideSheet } from "./PendingRideSheet";
import type { PendingRide } from "./strava.types";

// Renders a pending ride with recognizable route and metrics.
function PendingRideRow({ ride, onOpen }: { ride: PendingRide; onOpen: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left" }}>
      <Paper
        radius="lg"
        p="sm"
        style={{
          // Uses separate background fields to preserve the gradient.
          backgroundColor: "var(--mantine-color-cards-6)",
          // Top-left route-colored glow gives the card depth.
          backgroundImage:
            "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
          border: "1px solid var(--color-border-subtle)",
          // Inner edge and shadow lift the card.
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 4px 12px -6px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.12s ease",
        }}
        className="active:scale-[0.985]"
      >
        {/* Route shape distinguishes otherwise similar ride rows. */}
        <Group gap="lg" wrap="nowrap" align="center">
          <RouteMap polyline={ride.summary_polyline} width={50} height={50} />

          {/* minWidth allows title line clamping in the flexible column. */}
          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            {/* Keeps title and date visually grouped. */}
            <Stack gap={2}>
              {/* Clamps long Strava titles to preserve row height. */}
              <Text fw={600} fz={15} c="text.6" lineClamp={1}>
                {ride.name || dayjs(ride.started_at).format("D. M. YYYY")}
              </Text>
              <Text fz={13} c="text.7">
                {dayjs(ride.started_at).format("D. M. YYYY H:mm")}
              </Text>
            </Stack>
            <Group gap="lg" wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                <Route size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.distance", { count: ride.distance_km })}
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <Clock size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.duration", { count: ride.duration_min })}
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <Mountain size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.elevation", { count: ride.elevation_up_m })}
                </Text>
              </Group>
            </Group>
          </Stack>
        </Group>
      </Paper>
    </UnstyledButton>
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
              void tapFeedback();
              setOpenedRide(ride);
            }}
          />
        ))}
      </Stack>

      <PendingRideSheet ride={shownRide} onClose={closeSheet} />
    </>
  );
}
