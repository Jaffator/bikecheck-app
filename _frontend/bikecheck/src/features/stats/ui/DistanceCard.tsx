// Home's distance card; which rides count is decided in StatsService.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { LineChart, type LineChartProps } from "@mantine/charts";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { formatKm } from "@/features/profile/profileFormat";
import { formatServiceDateShort } from "@/features/service/serviceDates";
import { bikeColor } from "../bikeColors";
import { useDistance } from "../stats.queries";
import type { Distance, DistanceBike } from "../stats.types";

const CHART_HEIGHT = 180;

// Mantine draws its tooltip for a light page; this one sits on the dark card.
const TOOLTIP_STYLES: LineChartProps["styles"] = {
  tooltip: {
    backgroundColor: "var(--mantine-color-cards-7)",
    border: "1px solid var(--color-border-strong)",
  },
  tooltipLabel: {
    color: "var(--mantine-color-text-6)",
    fontSize: 13,
    fontFamily: "var(--font-mono)",
  },
  tooltipItemName: { color: "var(--mantine-color-text-7)" },
  tooltipItemData: {
    color: "var(--mantine-color-text-6)",
    fontFamily: "var(--font-mono)",
  },
};

export function DistanceCard(): ReactElement {
  const { t } = useTranslation();
  const { data: distance } = useDistance();

  if (distance === undefined) {
    return (
      <DistancePaper>
        <Skeleton h={14} w="60%" />
        <Skeleton h={CHART_HEIGHT} />
      </DistancePaper>
    );
  }

  return (
    <DistancePaper>
      <Text fz={16} fw={600} c="text.6">
        {t("stats.distanceTitle", { year: distance.year })}
      </Text>

      {distance.bikes.length === 0 ? (
        <Text fz={13} c="var(--color-text-dim)">
          {t("stats.distanceEmpty")}
        </Text>
      ) : (
        <>
          <DistanceChart distance={distance} />
          <Legend bikes={distance.bikes} />
        </>
      )}
    </DistancePaper>
  );
}

function DistanceChart({ distance }: { distance: Distance }): ReactElement {
  const { t, i18n } = useTranslation();
  const kmFormat = new Intl.NumberFormat(i18n.language);
  const lastWeek = distance.weeks.length - 1;

  const data = distance.weeks.map((week, index) => ({
    week,
    ...Object.fromEntries(
      distance.bikes.map((bike) => [seriesName(bike), bike.cumulative_km[index]]),
    ),
  }));
  const series = distance.bikes.map((bike) => ({
    name: seriesName(bike),
    label: bikeTitle(bike),
    color: bikeColor(bike.color_index),
  }));

  return (
    <LineChart
      h={CHART_HEIGHT}
      data={data}
      dataKey="week"
      series={series}
      withDots={false}
      tickLine="none"
      textColor="text.8"
      gridColor="var(--color-border-subtle)"
      valueFormatter={(km) => formatKm(km, i18n.language)}
      xAxisProps={{
        ticks: monthTicks(distance),
        tickFormatter: (week: string) => weekMonth(distance, week).format("MMM"),
      }}
      yAxisProps={{ width: 44, tickFormatter: (km: number) => kmFormat.format(km) }}
      // Room on the right for each line's total.
      lineChartProps={{ margin: { top: 8, right: 52 } }}
      lineProps={(line) => ({
        label: <EndLabel lastIndex={lastWeek} lineColor={line.color ?? ""} kmFormat={kmFormat} />,
      })}
      tooltipProps={{
        labelFormatter: (week: ReactNode) =>
          t("stats.distanceWeek", { date: formatServiceDateShort(String(week), i18n.language) }),
      }}
      styles={TOOLTIP_STYLES}
    />
  );
}

function seriesName(bike: DistanceBike): string {
  return `bike-${String(bike.bike_id)}`;
}

// A week reads the month it starts in; the first may start in December but opens the year.
function weekMonth(distance: Distance, week: string): dayjs.Dayjs {
  return week === distance.weeks[0] ? dayjs(`${String(distance.year)}-01-01`) : dayjs(week);
}

function monthTicks(distance: Distance): string[] {
  return distance.weeks.filter(
    (week, index) =>
      index === 0 ||
      weekMonth(distance, week).month() !== weekMonth(distance, distance.weeks[index - 1]).month(),
  );
}

// Recharts clones this onto every point of a line; only the last one prints the year's total.
interface EndLabelProps {
  lastIndex: number;
  lineColor: string;
  kmFormat: Intl.NumberFormat;
  x?: number | string;
  y?: number | string;
  value?: number | string;
  index?: number;
}

function EndLabel({ lastIndex, lineColor, kmFormat, x, y, value, index }: EndLabelProps): ReactElement | null {
  if (index !== lastIndex || value === undefined) return null;

  return (
    <text x={Number(x) + 6} y={Number(y)} dy={4} fill={lineColor} fontSize={13} className="font-mono">
      {kmFormat.format(Number(value))}
    </text>
  );
}

function Legend({ bikes }: { bikes: DistanceBike[] }): ReactElement {
  return (
    <Group gap="sm" style={{ rowGap: 4 }}>
      {bikes.map((bike) => (
        <Group key={bike.bike_id} gap={6} wrap="nowrap">
          <Box
            w={8}
            h={8}
            style={{
              borderRadius: "50%",
              backgroundColor: bikeColor(bike.color_index),
              flexShrink: 0,
            }}
          />
          <Text fz={13} c="text.7">
            {bikeTitle(bike)}
          </Text>
        </Group>
      ))}
    </Group>
  );
}

function DistancePaper({ children }: { children: ReactNode }): ReactElement {
  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Stack gap="md">{children}</Stack>
    </Paper>
  );
}
