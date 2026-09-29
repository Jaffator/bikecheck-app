// One ride in the desktop Přiřazené table; a click opens its detail.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text, Tooltip } from "@mantine/core";
import { Check, TriangleAlert } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, onPanelRowKey } from "@/components/panelRows";
import { RouteMap } from "@/components/RouteMap";
import { bikeColor } from "@/features/bikes/bikeColors";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { CHECK_IN_COLOR, symptomKey } from "@/features/rides/checkIn";
import { formatDuration } from "@/features/rides/rideDuration";
import type { Ride, RideCheckIn } from "@/features/rides/rides.types";
import { woreOffAmount, woreOffLabel } from "@/features/rides/woreOff";

export const RIDE_TABLE_COLUMNS = "minmax(0, 2fr) minmax(0, 1.1fr) 56px 64px 64px minmax(0, 1.4fr) 104px";
// The table draws the route at 52 px, about the phone card's size.
const ROUTE_SIMPLIFY = 1;
// The table shows the first two; the detail has them all.
const WORE_OFF_SHOWN = 2;

interface RideTableRowProps {
  ride: Ride;
  // Null while the garage loads, or for a bike no longer in it.
  colorIndex: number | null;
  onOpen: () => void;
}

export function RideTableRow({ ride, colorIndex, onOpen }: RideTableRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const figure = (value: number, digits = 0): string =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onPanelRowKey(event, onOpen)}
      className="hover-veil"
      style={{
        display: "grid",
        gridTemplateColumns: RIDE_TABLE_COLUMNS,
        alignItems: "center",
        gap: 16,
        padding: PANEL_ROW_PADDING,
        borderTop: PANEL_HAIRLINE,
      }}
    >
      <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
        <RouteMap
          polyline={ride.summary_polyline}
          width={52}
          height={36}
          color={colorIndex === null ? undefined : bikeColor(colorIndex)}
          simplify={ROUTE_SIMPLIFY}
        />
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text fz={13} fw={600} c="text.6" lineClamp={1}>
            {ride.name}
          </Text>
          <Text className="tabular-nums" fz={12} c="var(--color-text-dim)" lineClamp={1}>
            {ride.started_at === null ? "—" : startLabel(ride.started_at, i18n.language)}
          </Text>
        </Stack>
      </Group>
      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        <BikeColorDot colorIndex={colorIndex} size={7} />
        <Text fz={12} c="text.7" lineClamp={1}>
          {ride.bike_name ?? t("rides.unknownBike")}
        </Text>
      </Group>
      <Text className="tabular-nums" fz={13} c="text.7" ta="right">
        {figure((ride.distance_m ?? 0) / 1000, 1)}
      </Text>
      <Text className="tabular-nums" fz={13} c="text.7" ta="right">
        {formatDuration(ride.duration_min ?? 0)}
      </Text>
      <Text className="tabular-nums" fz={13} c="text.7" ta="right">
        {figure(ride.elevation_up_m ?? 0)}
      </Text>
      <Text className="tabular-nums" fz={12} c="var(--color-text-dim)" lineClamp={1}>
        {woreOffSummary(ride, t) ?? "—"}
      </Text>
      <CheckInCell checkIn={ride.check_in} />
    </Box>
  );
}

// "st 23. 9. · 10:00"
function startLabel(startedAt: string, language: string): string {
  const weekday = new Intl.DateTimeFormat(language, {
    weekday: "short",
  }).format(new Date(startedAt));
  return `${weekday} ${dayjs(startedAt).format("D. M. · HH:mm")}`;
}

// "Řetěz +32 km · Destičky 95 %": the wear index has no unit, so it says where the reading ended.
function woreOffSummary(ride: Ride, t: (key: string, options?: Record<string, unknown>) => string): string | null {
  if (ride.wore_off.length === 0) return null;
  return ride.wore_off
    .slice(0, WORE_OFF_SHOWN)
    .map((line) => {
      const amount = woreOffAmount(line, t) ?? t("tracking.percentage", { value: line.after });
      return `${woreOffLabel(line, t)} ${amount}`;
    })
    .join(" · ");
}

// Quiet when there is none: a missing check-in is never a nag.
function CheckInCell({ checkIn }: { checkIn: RideCheckIn | null }): ReactElement {
  const { t } = useTranslation();
  if (checkIn === null) {
    return (
      <Text fz={12} c="var(--color-text-dim)">
        —
      </Text>
    );
  }

  const Icon = checkIn.status === "OK" ? Check : TriangleAlert;
  const symptoms = checkIn.symptoms.map((symptom) => t(symptomKey(symptom))).join(", ");
  const cell = (
    <Group gap={5} wrap="nowrap" style={{ minWidth: 0 }}>
      <Icon size={12} strokeWidth={2.4} color={CHECK_IN_COLOR[checkIn.status]} style={{ flexShrink: 0 }} />
      <Text fz={12} fw={600} c={CHECK_IN_COLOR[checkIn.status]} lineClamp={1}>
        {t(checkIn.status === "OK" ? "checkIn.ok" : "checkIn.issue")}
      </Text>
    </Group>
  );
  return symptoms === "" ? cell : <Tooltip label={symptoms}>{cell}</Tooltip>;
}
