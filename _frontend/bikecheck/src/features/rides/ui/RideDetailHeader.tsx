// The ride drawer's heading: the ride's name over `● bike · date · time`; on the walk, where it came from.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Eyebrow } from "@/components/Eyebrow";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import type { RideItem, RideWalk } from "@/features/rides/rideDetail";

dayjs.extend(relativeTime);

const START_FORMAT = "D. M. YYYY · HH:mm";

export function RideDetailHeader({ item, walk }: { item: RideItem; walk?: RideWalk }): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();
  const { ride } = item;
  const started = ride.started_at === null ? null : dayjs(ride.started_at).format(START_FORMAT);
  const bikeName = item.kind === "ride" ? (item.ride.bike_name ?? t("rides.unknownBike")) : t("rides.bikeNotPicked");
  const colorIndex = item.kind === "ride" ? colorIndexOf(bikes, item.ride.bike_id) : null;

  return (
    <Stack gap={4} style={{ minWidth: 0 }}>
      {walk !== undefined && <WalkEyebrow arrivedAt={ride.created_at} walk={walk} />}
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

// "New ride from Strava · 4 min ago" and `1 / 3`: when it arrived, which is what woke the walk.
function WalkEyebrow({ arrivedAt, walk }: { arrivedAt: string | null; walk: RideWalk }): ReactElement {
  const { t } = useTranslation();
  const arrived = arrivedAt === null ? null : dayjs(arrivedAt).fromNow();

  return (
    <Group justify="space-between" align="center" gap="sm" wrap="nowrap" mb={4}>
      <Box style={{ minWidth: 0 }}>
        <Eyebrow>{[t("checkIn.newFromStrava"), arrived].filter((part) => part !== null).join(" · ")}</Eyebrow>
      </Box>
      {walk.total > 1 && (
        <Text className="tabular-nums" fz={13} c="var(--color-text-dim)" style={{ whiteSpace: "nowrap" }}>
          {t("checkIn.counter", { index: walk.position + 1, total: walk.total })}
        </Text>
      )}
    </Group>
  );
}
