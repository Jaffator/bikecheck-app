// A component only talks to hooks — no fetch, no URL, no manual loading state.
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

// One waiting ride, shown by the figures that make it recognisable — a date
// alone does not tell you which ride you are about to assign.
function PendingRideRow({ ride, onOpen }: { ride: PendingRide; onOpen: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left" }}>
      <Paper
        radius="lg"
        p="sm"
        style={{
          // Colour, glow and inner edge all live in this one object: `bg` would
          // emit the `background` shorthand and wipe the gradient beside it.
          backgroundColor: "var(--mantine-color-cards-6)",
          // Warm light from the top-left corner, falling off across the card, so
          // the row has a light source instead of sitting flat. The tint follows
          // the route colour, which is the only other colour on the card.
          backgroundImage:
            "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 60%)",
          border: "1px solid var(--color-border-subtle)",
          // A lit top edge and a shadow underneath: the pair is what reads as
          // raised rather than drawn.
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 4px 12px -6px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.12s ease",
        }}
        className="active:scale-[0.985]"
      >
        {/* The route leads: nine cards of dates and figures look alike, and the
            shape of where the ride went is what tells them apart at a glance. */}
        <Group gap="lg" wrap="nowrap" align="center">
          <RouteMap polyline={ride.summary_polyline} width={50} height={50} />

          {/* minWidth lets the column shrink below its content, without which
              the title's lineClamp has nothing to clamp against. */}
          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            {/* Title and date are one unit — kept tight together so the gap that
              reads as a break is the one before the figures. */}
            <Stack gap={2}>
              {/* The ride's own title leads: a column of dates alone gives the
                user nothing to recognise a ride by. Clamped because Strava
                titles run long and would otherwise change the card's height. */}
              <Text fw={600} fz={15} c="text.7" lineClamp={1}>
                {ride.name || dayjs(ride.started_at).format("D. M. YYYY")}
              </Text>
              <Text fz={13} c="text.8">
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
  // The ride a notification asked for, if any. Opening it is the caller's job
  // to hand over, because the id arrives in the URL, which this list does not
  // read.
  openActivityId?: string;
  onOpenedActivityHandled?: () => void;
}

// The Pending tab: every ride still waiting to be told which bike it was on.
export function PendingRides({ openActivityId, onOpenedActivityHandled }: PendingRidesProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError } = usePendingRides();
  const [openedRide, setOpenedRide] = useState<PendingRide | null>(null);

  const rides = data ?? [];

  // A ride named in the URL opens as soon as the list carrying it arrives.
  // Derived rather than stored by an effect: the sheet's own state is what the
  // user opens by tapping, and this only supplies the first one.
  const requested =
    openActivityId === undefined ? null : (rides.find((ride) => ride.activity_id === openActivityId) ?? null);
  const shownRide = openedRide ?? requested;

  function closeSheet(): void {
    setOpenedRide(null);
    // Clears the URL, so closing the sheet does not leave a parameter that
    // would reopen it on the next render.
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
    // The same frame the Rides tab's empty state uses, so switching tabs does
    // not move the copy or change its size.
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
