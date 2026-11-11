// The ride drawer's heading: the ride's name over `● picked bike · date · time`; on the walk, where it came from.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Eyebrow } from "@/components/Eyebrow";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import type { BikePick, RideItem, RideWalk } from "@/features/rides/rideDetail";
import { rideTitle } from "@/features/rides/rideTitle";

dayjs.extend(relativeTime);

const START_FORMAT = "D. M. YYYY · HH:mm";

interface RideDetailHeaderProps {
  item: RideItem;
  // The bike in the picker, saved or not.
  pick: BikePick | null;
  walk?: RideWalk;
}

export function RideDetailHeader({ item, pick, walk }: RideDetailHeaderProps): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();
  const { ride } = item;
  const started = ride.started_at === null ? null : dayjs(ride.started_at).format(START_FORMAT);
  const pickedId = pick?.kind === "bike" ? pick.bikeId : null;
  const bikeName = pickedId === null ? t("rides.bikeNotPicked") : pickedBikeName(item, pickedId, { bikes, t });
  const colorIndex = pickedId === null ? null : colorIndexOf(bikes, pickedId);

  return (
    <Stack gap={4} style={{ minWidth: 0 }}>
      {walk !== undefined && <WalkEyebrow arrivedAt={ride.created_at} walk={walk} />}
      {/* A ride keeps no Strava title (#375); an Unassigned Ride without one shows its start. */}
      <Text fw={600} fz={22} lh={1.15} lts="var(--tracking-title)" c="text.6" lineClamp={2}>
        {item.kind === "ride" ? rideTitle(item.ride, t("rides.unknownBike")) : item.ride.name || started}
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

interface BikeNames {
  bikes: ListedBike[] | undefined;
  t: TFunction;
}

// The ride's own bike keeps the name it was saved under; another reads as the picker shows it.
function pickedBikeName(item: RideItem, bikeId: number, { bikes, t }: BikeNames): string {
  if (item.kind === "ride" && item.ride.bike_id === bikeId) return item.ride.bike_name ?? t("rides.unknownBike");
  const bike = bikes?.find((one) => one.id === bikeId);
  return bike === undefined ? t("rides.unknownBike") : bikeTitle(bike);
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
