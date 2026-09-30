// Desktop Home's latest ride: its route, name and figures; a tap opens the ride.
import { useState, type ReactElement } from "react";
import { Box, Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { Check, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelSkeletonRows } from "@/components/Panel";
import { PANEL_HAIRLINE, PRESS_TRANSITION } from "@/components/panelRows";
import { RideMap } from "@/components/RideMap";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { CHECK_IN_COLOR } from "@/features/rides/checkIn";
import { useRides, useSaveRideCheckIn } from "@/features/rides/rides.queries";
import type { CheckInStatus, Ride } from "@/features/rides/rides.types";
import { formatDuration } from "@/features/rides/rideDuration";
import { CheckInMark } from "./CheckInMark";
import { RideDetailSheet } from "./RideDetailSheet";
import { WoreOff } from "./WoreOff";

export function LastRidePanel(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRides();
  const { data: bikes } = useBikes();
  const [opened, setOpened] = useState<{ ride: Ride; checkInStartWith?: CheckInStatus } | null>(null);

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
          onClick={() => setOpened({ ride })}
          className="hover-veil active:scale-[0.985]"
          w="100%"
          p="md"
          style={{ borderTop: PANEL_HAIRLINE, transition: PRESS_TRANSITION }}
        >
          <Stack gap="sm">
            {/* A picture, so the click goes to the card and opens the ride. */}
            <RideMap polyline={ride.summary_polyline} height={150} interactive={false} />
            <Stack gap={2}>
              <Text fz={16} fw={600} c="text.6" lineClamp={1}>
                {ride.name}
              </Text>
              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                <BikeColorDot colorIndex={colorIndexOf(bikes, ride.bike_id)} size={6} />
                <Eyebrow>
                  {[
                    ride.started_at === null ? null : dayjs(ride.started_at).format("D. M. YYYY · HH:mm"),
                    ride.bike_name ?? t("rides.unknownBike"),
                  ]
                    .filter((part) => part !== null)
                    .join(" · ")}
                </Eyebrow>
                <CheckInMark checkIn={ride.check_in} size={12} />
              </Group>
            </Stack>
            <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              <Metric
                label={t("rides.statDistance")}
                value={t("pendingRides.distance", { count: Math.round((ride.distance_m ?? 0) / 1000) })}
              />
              <Metric label={t("rides.statDuration")} value={formatDuration(ride.duration_min ?? 0)} />
              <Metric
                label={t("rides.statElevation")}
                value={t("pendingRides.elevation", { count: ride.elevation_up_m ?? 0 })}
              />
            </Box>
            <WoreOff lines={ride.wore_off} />
          </Stack>
        </UnstyledButton>
      )}
      {ride !== null && ride.check_in === null && (
        <CheckInQuestion ride={ride} onIssue={() => setOpened({ ride, checkInStartWith: "ISSUE" })} />
      )}
      <RideDetailSheet
        ride={opened?.ride ?? null}
        checkInStartWith={opened?.checkInStartWith}
        onClose={() => setOpened(null)}
      />
    </Panel>
  );
}

// Asked in place rather than popped up: fine saves at once, anything else wants the detail's form.
function CheckInQuestion({ ride, onIssue }: { ride: Ride; onIssue: () => void }): ReactElement {
  const { t } = useTranslation();
  const save = useSaveRideCheckIn();

  function saveOk(): void {
    save.mutate(
      { rideId: ride.id, checkIn: { status: "OK", symptoms: [], note: null } },
      { onError: () => notifications.show({ color: "red.5", message: t("checkIn.saveFailed") }) },
    );
  }

  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" px="md" py="sm" style={{ borderTop: PANEL_HAIRLINE }}>
      <Text fz={14} fw={600} c="text.6" lineClamp={1}>
        {t("checkIn.question")}
      </Text>
      <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
        <Button
          variant="outline"
          radius="md"
          size="xs"
          loading={save.isPending}
          leftSection={<Check size={12} strokeWidth={2.4} color={CHECK_IN_COLOR.OK} />}
          onClick={saveOk}
        >
          {t("checkIn.ok")}
        </Button>
        <Button
          variant="outline"
          radius="md"
          size="xs"
          disabled={save.isPending}
          leftSection={<TriangleAlert size={12} strokeWidth={2.4} color={CHECK_IN_COLOR.ISSUE} />}
          onClick={onIssue}
        >
          {t("checkIn.issue")}
        </Button>
      </Group>
    </Group>
  );
}

// A figure over the word naming it, so nobody guesses which number is which.
function Metric({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Stack gap={0} style={{ minWidth: 0 }}>
      <Text className="tabular-nums" fz={16} fw={600} c="text.6" lineClamp={1}>
        {value}
      </Text>
      <Eyebrow>{label}</Eyebrow>
    </Stack>
  );
}
