// Home's latest ride: its route, name and figures; a tap opens the ride.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Box, Button, Group, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, TriangleAlert } from "lucide-react";
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
import { useIsDesktop } from "@/layout/breakpoints";
import { CheckInMark } from "./CheckInMark";
import { RideDetailSheet } from "./RideDetailSheet";
import { WoreOff } from "./WoreOff";

const THUMBNAIL_SIZE = 96;
const THUMBNAIL_STYLE: CSSProperties = { flexShrink: 0, overflow: "hidden", borderRadius: "var(--mantine-radius-md)" };
// A finger needs about 44 px.
const ANSWER_HEIGHT = 44;

export function LastRidePanel(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRides();
  const { data: bikes } = useBikes();
  const isDesktop = useIsDesktop();
  const [opened, setOpened] = useState<{ ride: Ride; checkInStartWith?: CheckInStatus } | null>(null);

  const ride = data?.pages[0]?.items[0] ?? null;
  const colorIndex = ride === null ? null : colorIndexOf(bikes, ride.bike_id);

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
          // The phone's card runs on under its title, without the hairline.
          pt={isDesktop ? "md" : 0}
          style={{ borderTop: isDesktop ? PANEL_HAIRLINE : undefined, transition: PRESS_TRANSITION }}
        >
          {isDesktop ? (
            <FullRide ride={ride} colorIndex={colorIndex} />
          ) : (
            <CompactRide ride={ride} colorIndex={colorIndex} />
          )}
        </UnstyledButton>
      )}
      {ride !== null && ride.check_in === null && (
        <CheckInQuestion
          ride={ride}
          onIssue={() => setOpened({ ride, checkInStartWith: "ISSUE" })}
          stacked={!isDesktop}
        />
      )}
      <RideDetailSheet
        ride={opened?.ride ?? null}
        checkInStartWith={opened?.checkInStartWith}
        onClose={() => setOpened(null)}
      />
    </Panel>
  );
}

interface RideBodyProps {
  ride: Ride;
  // Null while the garage loads, or for a bike no longer in it.
  colorIndex: number | null;
}

function FullRide({ ride, colorIndex }: RideBodyProps): ReactElement {
  return (
    <Stack gap="sm">
      {/* A picture, so the click goes to the card and opens the ride. */}
      <RideMap polyline={ride.summary_polyline} height={150} interactive={false} />
      <RideHeading ride={ride} colorIndex={colorIndex} dateFormat="D. M. YYYY · HH:mm" />
      <RideMetrics ride={ride} short={false} />
      <WoreOff lines={ride.wore_off} />
    </Stack>
  );
}

// The phone's card: the route as a thumbnail beside the ride; what it wore off waits in the detail.
function CompactRide({ ride, colorIndex }: RideBodyProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="sm">
      <Group gap="sm" wrap="nowrap" align="stretch">
        <Box w={THUMBNAIL_SIZE} h={THUMBNAIL_SIZE} style={THUMBNAIL_STYLE}>
          <RideMap polyline={ride.summary_polyline} height={THUMBNAIL_SIZE} interactive={false} thumbnail />
        </Box>
        <Stack justify="space-between" gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <RideHeading ride={ride} colorIndex={colorIndex} dateFormat="D. M. · HH:mm" />
          <RideMetrics ride={ride} short />
        </Stack>
      </Group>
      {/* A quiet pointer only; no count, since wore_off carries at most three lines. */}
      {ride.wore_off.length > 0 && (
        <Group gap={4} wrap="nowrap">
          <Text fz={13} c="var(--color-text-dim)">
            {t("rides.woreOffHint")}
          </Text>
          <ChevronRight size={14} color="var(--color-text-dim)" />
        </Group>
      )}
    </Stack>
  );
}

function RideHeading({ ride, colorIndex, dateFormat }: RideBodyProps & { dateFormat: string }): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={2}>
      <Text fz={16} fw={600} c="text.6" lineClamp={1}>
        {ride.name}
      </Text>
      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        <BikeColorDot colorIndex={colorIndex} size={6} />
        <Eyebrow>
          {[
            ride.started_at === null ? null : dayjs(ride.started_at).format(dateFormat),
            ride.bike_name ?? t("rides.unknownBike"),
          ]
            .filter((part) => part !== null)
            .join(" · ")}
        </Eyebrow>
        <CheckInMark checkIn={ride.check_in} size={12} />
      </Group>
    </Stack>
  );
}

// Beside the phone's thumbnail a column is about 70 px, so the long labels go short.
function RideMetrics({ ride, short }: { ride: Ride; short: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: short ? 6 : 8 }}>
      <Metric
        label={t(short ? "rides.statDistanceShort" : "rides.statDistance")}
        value={t("pendingRides.distance", { count: Math.round((ride.distance_m ?? 0) / 1000) })}
      />
      <Metric label={t("rides.statDuration")} value={formatDuration(ride.duration_min ?? 0)} />
      <Metric
        label={t(short ? "rides.statElevationShort" : "rides.statElevation")}
        value={t("pendingRides.elevation", { count: ride.elevation_up_m ?? 0 })}
      />
    </Box>
  );
}

interface CheckInQuestionProps {
  ride: Ride;
  onIssue: () => void;
  // The phone has no room beside the question, so the answers go under it, finger-sized.
  stacked: boolean;
}

// Asked in place rather than popped up: fine saves at once, anything else wants the detail's form.
function CheckInQuestion({ ride, onIssue, stacked }: CheckInQuestionProps): ReactElement {
  const { t } = useTranslation();
  const save = useSaveRideCheckIn();

  function saveOk(): void {
    save.mutate(
      { rideId: ride.id, checkIn: { status: "OK", symptoms: [], note: null } },
      { onError: () => notifications.show({ color: "red.5", message: t("checkIn.saveFailed") }) },
    );
  }

  const question = (
    <Text fz={14} fw={600} c="text.6" lineClamp={1}>
      {t("checkIn.question")}
    </Text>
  );
  const answers = (
    <>
      <Button
        variant="outline"
        radius="md"
        size={stacked ? "sm" : "xs"}
        h={stacked ? ANSWER_HEIGHT : undefined}
        loading={save.isPending}
        leftSection={<Check size={stacked ? 16 : 12} strokeWidth={2.4} color={CHECK_IN_COLOR.OK} />}
        onClick={saveOk}
      >
        {t("checkIn.ok")}
      </Button>
      <Button
        variant="outline"
        radius="md"
        size={stacked ? "sm" : "xs"}
        h={stacked ? ANSWER_HEIGHT : undefined}
        disabled={save.isPending}
        leftSection={<TriangleAlert size={stacked ? 16 : 12} strokeWidth={2.4} color={CHECK_IN_COLOR.ISSUE} />}
        onClick={onIssue}
      >
        {t("checkIn.issue")}
      </Button>
    </>
  );

  if (stacked) {
    return (
      <Stack gap="sm" px="md" pt="sm" pb="md" style={{ borderTop: PANEL_HAIRLINE }}>
        {question}
        <SimpleGrid cols={2} spacing="xs">
          {answers}
        </SimpleGrid>
      </Stack>
    );
  }
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" px="md" py="sm" style={{ borderTop: PANEL_HAIRLINE }}>
      {question}
      <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
        {answers}
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
