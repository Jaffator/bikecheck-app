// The ride drawer's heading: the ride's name over `● bike · date · time`.
import type { ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import type { RideItem } from "@/features/rides/rideDetail";

const START_FORMAT = "D. M. YYYY · HH:mm";

export function RideDetailHeader({ item }: { item: RideItem }): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();
  const { ride } = item;
  const started = ride.started_at === null ? null : dayjs(ride.started_at).format(START_FORMAT);
  const bikeName = item.kind === "ride" ? (item.ride.bike_name ?? t("rides.unknownBike")) : t("rides.bikeNotPicked");
  const colorIndex = item.kind === "ride" ? colorIndexOf(bikes, item.ride.bike_id) : null;

  return (
    <Stack gap={4} style={{ minWidth: 0 }}>
      {/* An Unassigned Ride parked before Strava titles were kept has none; its start stands in. */}
      <Text fw={600} fz={22} lh={1.15} lts="var(--tracking-title)" c="text.6" lineClamp={2}>
        {ride.name || started}
      </Text>
      <Group gap={7} wrap="nowrap" style={{ minWidth: 0 }}>
        <BikeColorDot colorIndex={colorIndex} size={7} />
        <Text className="tabular-nums" fz={13} c="var(--color-text-dim)" lineClamp={1}>
          {[bikeName, started].filter((part) => part !== null).join(" · ")}
        </Text>
      </Group>
    </Stack>
  );
}
