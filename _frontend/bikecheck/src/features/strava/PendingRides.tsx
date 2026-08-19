// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Group, Loader, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Clock, Gauge, Link2Off, Mountain } from "lucide-react";
import dayjs from "dayjs";
import { tapFeedback } from "@/utils/haptics";
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
        bg="cards.6"
        radius="md"
        p="md"
        style={{
          border: "1px solid var(--color-border-subtle)",
          transition: "transform 0.12s ease",
        }}
        className="active:scale-[0.985]"
      >
        <Stack gap="xs">
          <Text fw={600} fz={15} c="text.6">
            {dayjs(ride.started_at).format("D. M. YYYY H:mm")}
          </Text>
          <Group gap="lg" wrap="nowrap">
            <Group gap={6} wrap="nowrap">
              <Gauge size={14} color="var(--color-text-dim)" />
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
    return (
      <Stack align="center" gap="sm" pt="15dvh" px="xl">
        <Link2Off size={32} color="var(--mantine-color-text-9)" />
        <Text fw={600} fz={17} c="text.6" ta="center">
          {t("pendingRides.empty")}
        </Text>
        <Text size="sm" c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
          {t("pendingRides.emptyBody")}
        </Text>
      </Stack>
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
