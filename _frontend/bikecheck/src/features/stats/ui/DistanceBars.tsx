// Desktop Home's distance: one bar per day, month or year, stacked by bike in each bike's colour.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text, Tooltip, type TooltipProps } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { bikeColor } from "@/features/bikes/bikeColors";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { formatKm } from "@/features/profile/profileFormat";
import { bucketMeters, bucketStarts } from "../distanceDays";
import type { DistanceBucket } from "../homePeriod";
import type { Distance, DistanceBike } from "../stats.types";

const BARS_HEIGHT = 150;
// Percent of the height the biggest bar reaches, leaving room above it for its value.
const TALLEST = 85;
const SEGMENT_GAP = 2;
// A month of days needs narrower gaps than a year of months to keep its bars readable.
const COLUMN_GAP = 8;
const DENSE_COLUMN_GAP = 3;
const DENSE_FROM = 16;

// Mantine draws its tooltip for a light page; this one sits on the dark card.
const TOOLTIP_STYLES: TooltipProps["styles"] = {
  tooltip: {
    backgroundColor: "var(--mantine-color-cards-7)",
    border: "1px solid var(--color-border-strong)",
    color: "var(--mantine-color-text-6)",
    padding: "8px 10px",
  },
};

// How a bar is named under it and on its tooltip; every bucket starts on a UTC day.
const AXIS_FORMAT: Record<DistanceBucket, Intl.DateTimeFormatOptions> = {
  day: { day: "numeric", timeZone: "UTC" },
  month: { month: "short", timeZone: "UTC" },
  year: { year: "numeric", timeZone: "UTC" },
};
const TOOLTIP_FORMAT: Record<DistanceBucket, Intl.DateTimeFormatOptions> = {
  day: { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  month: { month: "long", year: "numeric", timeZone: "UTC" },
  year: { year: "numeric", timeZone: "UTC" },
};

interface Bar {
  index: number;
  start: Date;
  // Per bike, in the order of the served bikes.
  meters: number[];
  total: number;
}

export function DistanceBars({ distance, bucket }: { distance: Distance; bucket: DistanceBucket }): ReactElement {
  const { i18n } = useTranslation();
  const bars = barsOf(distance, bucket);
  const largest = Math.max(0, ...bars.map((bar) => bar.total));
  // Rides with time but no distance leave every bar at 0, and no bar is the biggest.
  const biggest = largest === 0 ? undefined : bars.find((bar) => bar.total === largest)?.index;
  const columns = `repeat(${String(bars.length)}, minmax(0, 1fr))`;
  const gap = bars.length >= DENSE_FROM ? DENSE_COLUMN_GAP : COLUMN_GAP;
  const axis = new Intl.DateTimeFormat(i18n.language, AXIS_FORMAT[bucket]);

  return (
    <Stack gap={8}>
      <Box
        h={BARS_HEIGHT}
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          gap,
          alignItems: "end",
          borderBottom: "1px solid var(--color-border-strong)",
        }}
      >
        {bars.map((bar) => (
          <BucketBar
            key={bar.index}
            distance={distance}
            bucket={bucket}
            bar={bar}
            largest={largest}
            // The biggest bar gives the scale, the last one where the Period stands now.
            printed={bar.index === biggest || bar.index === bars.length - 1}
          />
        ))}
      </Box>

      <Box style={{ display: "grid", gridTemplateColumns: columns, gap }}>
        {bars.map((bar) => (
          <Text key={bar.index} className="font-mono" fz={10} tt="uppercase" lts="0.04em" c="text.8" ta="center">
            {axis.format(bar.start)}
          </Text>
        ))}
      </Box>

      <Legend bikes={distance.bikes} />
    </Stack>
  );
}

// Each bike's buckets side by side, so one bar and its tooltip read one row.
function barsOf(distance: Distance, bucket: DistanceBucket): Bar[] {
  const perBike = distance.bikes.map((bike) => bucketMeters(bike.daily_m, distance, bucket));

  return bucketStarts(distance, bucket).map((start, index) => {
    const meters = perBike.map((buckets) => buckets[index]);
    return { index, start, meters, total: meters.reduce((sum, value) => sum + value, 0) };
  });
}

interface BucketBarProps {
  distance: Distance;
  bucket: DistanceBucket;
  bar: Bar;
  largest: number;
  printed: boolean;
}

// The first bike, the one that rode most, sits at the bottom of every bar.
function BucketBar({ distance, bucket, bar, largest, printed }: BucketBarProps): ReactElement {
  const { i18n } = useTranslation();
  const height = largest === 0 ? 0 : (bar.total / largest) * TALLEST;

  return (
    <Tooltip label={<BarTooltip distance={distance} bucket={bucket} bar={bar} />} styles={TOOLTIP_STYLES}>
      <Box h="100%" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {printed && (
          <Text className="font-mono" fz={11} c="text.7" ta="center" mb={4} style={{ whiteSpace: "nowrap" }}>
            {new Intl.NumberFormat(i18n.language).format(Math.round(bar.total / 1000))}
          </Text>
        )}
        <Box
          h={`${String(height)}%`}
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            gap: SEGMENT_GAP,
            borderRadius: "3px 3px 0 0",
            overflow: "hidden",
          }}
        >
          {distance.bikes.map((bike, row) =>
            bar.meters[row] > 0 ? (
              <Box
                key={bike.bike_id}
                style={{ flex: `${String(bar.meters[row])} 1 0`, backgroundColor: bikeColor(bike.color_index) }}
              />
            ) : null,
          )}
        </Box>
      </Box>
    </Tooltip>
  );
}

function BarTooltip({ distance, bucket, bar }: { distance: Distance; bucket: DistanceBucket; bar: Bar }): ReactElement {
  const { t, i18n } = useTranslation();
  const km = (meters: number): string => formatKm(Math.round(meters / 1000), i18n.language);

  return (
    <Stack gap={4} miw={180}>
      <Text className="font-mono" fz={12} c="text.7" tt="capitalize">
        {new Intl.DateTimeFormat(i18n.language, TOOLTIP_FORMAT[bucket]).format(bar.start)}
      </Text>
      {distance.bikes.map((bike, row) => (
        <Group key={bike.bike_id} justify="space-between" wrap="nowrap" gap="md">
          <Group gap={6} wrap="nowrap">
            <BikeColorDot colorIndex={bike.color_index} />
            <Text fz={13} c="text.7">
              {bikeTitle(bike)}
            </Text>
          </Group>
          <Text className="font-mono" fz={13} c="text.6">
            {km(bar.meters[row])}
          </Text>
        </Group>
      ))}
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="md"
        pt={4}
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <Text fz={13} fw={600} c="text.6">
          {t("stats.monthTotal")}
        </Text>
        <Text className="font-mono" fz={13} fw={600} c="text.6">
          {km(bar.total)}
        </Text>
      </Group>
    </Stack>
  );
}

function Legend({ bikes }: { bikes: DistanceBike[] }): ReactElement {
  const { i18n } = useTranslation();
  const kmFormat = new Intl.NumberFormat(i18n.language);

  return (
    <Group gap="md" style={{ rowGap: 4 }}>
      {bikes.map((bike) => (
        <Group key={bike.bike_id} gap={6} wrap="nowrap">
          <BikeColorDot colorIndex={bike.color_index} />
          <Text fz={13} c="text.7">
            {bikeTitle(bike)}
          </Text>
          <Text className="font-mono" fz={13} c="text.6">
            {kmFormat.format(bike.total_km)}
          </Text>
        </Group>
      ))}
    </Group>
  );
}
