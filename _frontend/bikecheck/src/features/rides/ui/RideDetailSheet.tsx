// UI component using feature hooks.
import type { ReactElement } from "react";
import { Button, Divider, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Clock, Gauge, Route, TrendingDown, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import dayjs from "dayjs";
import { Eyebrow } from "@/components/Eyebrow";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { RideMap } from "@/components/RideMap";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import type { CheckInStatus, Ride } from "@/features/rides/rides.types";
import { formatDuration } from "@/features/rides/rideDuration";
import { useRideCheckIn } from "@/features/rides/useRideCheckIn";
import { useIsDesktop } from "@/layout/breakpoints";
import { ChangeBikeMenu } from "./ChangeBikeMenu";
import { DeleteRideButton } from "./DeleteRideButton";
import { RideCheckInSection } from "./RideCheckInSection";
import { WoreOff } from "./WoreOff";

// Mantine's large sheet: room for the map and both rows of figures.
const SHEET_HEIGHT = "var(--drawer-size-lg)";

const MAP_HEIGHT_DESKTOP = 480;
// Mantine keeps a smaller window's modal inside its margins.
const MODAL_WIDTH = 960;
const MAP_HEIGHT_PHONE = 200;
// Between Mantine's lg (20px) and xl (32px), which read too tight and too loose.
const MODAL_PADDING = "1.5rem";

interface RideDetailSheetProps {
  // Null closes the sheet.
  ride: Ride | null;
  onClose: () => void;
  // Opens the check-in form with this answer picked.
  checkInStartWith?: CheckInStatus;
}

// Displays one ride statistic.
function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }): ReactElement {
  return (
    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
      <Group gap={6} wrap="nowrap">
        <Icon size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
        <Text fz={12} c="text.7" tt="uppercase" lts="var(--tracking-label)" lineClamp={1}>
          {label}
        </Text>
      </Group>
      <Text className="tabular-nums" fw={600} fz={16} c="text.6">
        {value}
      </Text>
    </Stack>
  );
}

// Same name-then-meta pair as the Last ride card, so both read alike.
function RideTitle({ ride }: { ride: Ride }): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();

  return (
    <Stack gap={2} style={{ minWidth: 0 }}>
      <Text fw={700} fz={20} c="text.6" lineClamp={1}>
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
      </Group>
    </Stack>
  );
}

// Displays data already loaded with the ride.
export function RideDetailSheet({ ride, onClose, checkInStartWith }: RideDetailSheetProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  return (
    <ResponsiveSheet
      opened={ride !== null}
      onClose={onClose}
      desktop="modal"
      modalSize={MODAL_WIDTH}
      title={ride === null ? undefined : <RideTitle ride={ride} />}
      styles={{
        content: {
          height: SHEET_HEIGHT,
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, display: "flex", flexDirection: "column", ...(isDesktop ? { padding: MODAL_PADDING } : {}) },
        // The phone sheet keeps its own header padding: the grabber sits in it.
        header: { marginBottom: "1rem", ...(isDesktop ? { padding: MODAL_PADDING, paddingBottom: 0 } : {}) },
        title: { flex: 1, minWidth: 0 },
      }}
    >
      {ride !== null && (
        // A bottom sheet's foot is the wrapper's.
        <Stack gap={20} pb={isDesktop ? "1rem" : undefined}>
          {/* Static on the phone, so a drag on it never fights the sheet's own. */}
          <RideMap
            polyline={ride.summary_polyline}
            height={isDesktop ? MAP_HEIGHT_DESKTOP : MAP_HEIGHT_PHONE}
            interactive={isDesktop}
          />

          <Stack gap="lg">
            <Stack gap="md">
              <Group gap="md" wrap="nowrap">
                <Stat icon={Route} label={t("rides.statDistance")} value={`${toKm(ride.distance_m)} km`} />
                <Stat icon={Clock} label={t("rides.statDuration")} value={formatDuration(ride.duration_min ?? 0)} />
                <Stat icon={TrendingUp} label={t("rides.statElevation")} value={`${ride.elevation_up_m ?? 0} m`} />
              </Group>

              <Group gap="md" wrap="nowrap">
                <Stat icon={TrendingDown} label={t("rides.statDescent")} value={`${ride.elevation_down_m ?? 0} m`} />
                <Stat icon={Gauge} label={t("rides.statAvgSpeed")} value={`${ride.speed_avg ?? 0} km/h`} />
                <Stat icon={Zap} label={t("rides.statMaxSpeed")} value={`${ride.max_speed_kmh ?? 0} km/h`} />
              </Group>

              <WoreOff lines={ride.wore_off} />
            </Stack>

            <Divider color="var(--color-border-subtle)" />

            <RideDetailFoot key={ride.id} ride={ride} startWith={checkInStartWith} onClose={onClose} />
          </Stack>
        </Stack>
      )}
    </ResponsiveSheet>
  );
}

interface RideDetailFootProps {
  ride: Ride;
  startWith?: CheckInStatus;
  onClose: () => void;
}

// Check-in, bike and delete; on desktop the actions share one bar below the check-in.
function RideDetailFoot({ ride, startWith, onClose }: RideDetailFootProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const checkIn = useRideCheckIn(ride, startWith);

  if (!isDesktop) {
    return (
      <>
        <Stack gap="md">
          <RideCheckInSection checkIn={checkIn} />
          <ChangeBikeMenu ride={ride} onMoved={onClose} />
        </Stack>

        <Divider color="var(--color-border-subtle)" />

        <DeleteRideButton ride={ride} onDeleted={onClose} />
      </>
    );
  }

  const canAdd = checkIn.saved === null && checkIn.draft === null;
  return (
    <>
      <RideCheckInSection checkIn={checkIn} withAdd={false} />

      <Divider color="var(--color-border-subtle)" />

      <Group justify="space-between" wrap="nowrap">
        <DeleteRideButton ride={ride} onDeleted={onClose} inBar />
        <Group gap="xs" wrap="nowrap">
          <ChangeBikeMenu ride={ride} onMoved={onClose} inBar />
          {canAdd && (
            <Button color="primary.6" c="textDark.6" radius="md" size="sm" onClick={checkIn.edit}>
              {t("checkIn.addInBar")}
            </Button>
          )}
        </Group>
      </Group>
    </>
  );
}

// Convert stored metres to displayed kilometres.
function toKm(metres: number | null): number {
  return metres === null ? 0 : Math.round(metres / 1000);
}
