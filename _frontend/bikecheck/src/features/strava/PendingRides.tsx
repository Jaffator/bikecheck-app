// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Group, Loader, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Clock, Gauge, Link2Off, Mountain } from "lucide-react";
import dayjs from "dayjs";
import { tapFeedback } from "@/utils/haptics";
import { usePendingRides } from "./strava.queries";
import type { PendingRide } from "./strava.types";

// One waiting ride, shown by the figures that make it recognisable — a date
// alone does not tell you which ride you are about to assign.
export function PendingRideRow({
  ride,
  onOpen,
}: {
  ride: PendingRide;
  onOpen: () => void;
}): ReactElement {
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

// Every ride still waiting for a bike. Reached from the dashboard card, and
// from a notification when the user would rather see the whole queue.
export function PendingRides(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePendingRides();

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

  const rides = data ?? [];

  if (rides.length === 0) {
    return (
      <Stack align="center" gap="sm" pt="20dvh" px="xl">
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
    <Stack gap="sm" className="m-3">
      {rides.map((ride) => (
        <PendingRideRow
          key={ride.activity_id}
          ride={ride}
          onOpen={() => {
            void tapFeedback();
            navigate(`/rides/pending/${ride.activity_id}`);
          }}
        />
      ))}
    </Stack>
  );
}
