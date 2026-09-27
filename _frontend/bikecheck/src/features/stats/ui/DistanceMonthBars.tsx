// Desktop Home's distance: one bar per month, stacked by bike in each bike's colour.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text, Tooltip, type TooltipProps } from "@mantine/core";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { bikeColor } from "@/features/bikes/bikeColors";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { formatKm } from "@/features/profile/profileFormat";
import { monthlyMeters } from "../distanceDays";
import type { Distance, DistanceBike } from "../stats.types";

const BARS_HEIGHT = 150;
// Percent of the height the biggest month reaches, leaving room above it for its value.
const TALLEST = 85;
const SEGMENT_GAP = 2;
const COLUMN_GAP = 8;

// Mantine draws its tooltip for a light page; this one sits on the dark card.
const TOOLTIP_STYLES: TooltipProps["styles"] = {
  tooltip: {
    backgroundColor: "var(--mantine-color-cards-7)",
    border: "1px solid var(--color-border-strong)",
    color: "var(--mantine-color-text-6)",
    padding: "8px 10px",
  },
};

interface Month {
  // 0 is January.
  index: number;
  // Per bike, in the order of the served bikes.
  meters: number[];
  total: number;
}

export function DistanceMonthBars({ distance }: { distance: Distance }): ReactElement {
  const months = monthsOf(distance);
  const largest = Math.max(0, ...months.map((month) => month.total));
  const biggest = months.find((month) => month.total === largest)?.index;
  const columns = `repeat(${String(months.length)}, minmax(0, 1fr))`;

  return (
    <Stack gap={8}>
      <Box
        h={BARS_HEIGHT}
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          gap: COLUMN_GAP,
          alignItems: "end",
          borderBottom: "1px solid var(--color-border-strong)",
        }}
      >
        {months.map((month) => (
          <MonthBar
            key={month.index}
            distance={distance}
            month={month}
            largest={largest}
            // The biggest month gives the scale, the last one where the year stands now.
            printed={month.index === biggest || month.index === months.length - 1}
          />
        ))}
      </Box>

      <Box style={{ display: "grid", gridTemplateColumns: columns, gap: COLUMN_GAP }}>
        {months.map((month) => (
          <Text key={month.index} className="font-mono" fz={10} tt="uppercase" lts="0.04em" c="text.8" ta="center">
            {monthDate(distance.year, month.index).format("MMM")}
          </Text>
        ))}
      </Box>

      <Legend bikes={distance.bikes} />
    </Stack>
  );
}

// Each bike's months side by side, so one month's bar and tooltip read one row.
function monthsOf(distance: Distance): Month[] {
  const perBike = distance.bikes.map((bike) => monthlyMeters(bike.daily_m, distance.year));

  return (perBike[0] ?? []).map((_, index) => {
    const meters = perBike.map((months) => months[index]);
    return { index, meters, total: meters.reduce((sum, value) => sum + value, 0) };
  });
}

function monthDate(year: number, month: number): dayjs.Dayjs {
  return dayjs(new Date(year, month, 1));
}

interface MonthBarProps {
  distance: Distance;
  month: Month;
  largest: number;
  printed: boolean;
}

// The first bike, the one that rode most, sits at the bottom of every bar.
function MonthBar({ distance, month, largest, printed }: MonthBarProps): ReactElement {
  const { i18n } = useTranslation();
  const height = largest === 0 ? 0 : (month.total / largest) * TALLEST;

  return (
    <Tooltip label={<MonthTooltip distance={distance} month={month} />} styles={TOOLTIP_STYLES}>
      <Box h="100%" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {printed && (
          <Text className="font-mono" fz={11} c="text.7" ta="center" mb={4} style={{ whiteSpace: "nowrap" }}>
            {new Intl.NumberFormat(i18n.language).format(Math.round(month.total / 1000))}
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
            month.meters[row] > 0 ? (
              <Box
                key={bike.bike_id}
                style={{ flex: `${String(month.meters[row])} 1 0`, backgroundColor: bikeColor(bike.color_index) }}
              />
            ) : null,
          )}
        </Box>
      </Box>
    </Tooltip>
  );
}

function MonthTooltip({ distance, month }: { distance: Distance; month: Month }): ReactElement {
  const { t, i18n } = useTranslation();
  const km = (meters: number): string => formatKm(Math.round(meters / 1000), i18n.language);

  return (
    <Stack gap={4} miw={180}>
      <Text className="font-mono" fz={12} c="text.7" tt="capitalize">
        {monthDate(distance.year, month.index).format("MMMM YYYY")}
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
            {km(month.meters[row])}
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
          {km(month.total)}
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
