// Home's distance card; which rides count is decided in StatsService.
import { useState, type ReactElement, type ReactNode } from "react";
import { Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { LineChart, type LineChartProps } from "@mantine/charts";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { bikeColor } from "@/features/bikes/bikeColors";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { formatKm } from "@/features/profile/profileFormat";
import { formatServiceDateShort } from "@/features/service/serviceDates";
import { useIsDesktop } from "@/layout/breakpoints";
import { servedDays, servedYear, weeklyRunningMeters, weekStarts } from "../distanceDays";
import { DISTANCE_BUCKET, homePeriodLabel, type DistanceBucket } from "../homePeriod";
import { useDistance } from "../stats.queries";
import type { Distance, DistanceBike, HomePeriod } from "../stats.types";
import { DistanceBars } from "./DistanceBars";

const CHART_HEIGHT = 180;

const BUCKET_UNIT: Record<DistanceBucket, string> = {
  day: "stats.distanceByDay",
  month: "stats.distanceByMonth",
  year: "stats.distanceByYear",
};

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

// The phone asks for no Period and keeps its weekly running line; desktop reads its Period's days as bars.
export function DistanceCard({ period }: { period?: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const isDesktop = useIsDesktop();
  // The last Period's data stands in while the next loads, so it is drawn as that Period until replaced.
  const [shown, setShown] = useState(period);
  if (!isPlaceholderData && shown !== period) setShown(period);
  const bucket = DISTANCE_BUCKET[shown ?? "year"];

  if (distance === undefined) {
    return (
      <DistancePaper>
        <Skeleton h={14} w="60%" />
        <Skeleton h={CHART_HEIGHT} />
      </DistancePaper>
    );
  }

  // The phone keeps drawing only bikes that covered a km, as before rides without distance were served.
  const drawn = isDesktop ? distance : { ...distance, bikes: distance.bikes.filter((bike) => bike.total_km > 0) };

  return (
    <DistancePaper>
      <Group justify="space-between" align="baseline" wrap="nowrap" gap="sm">
        <Text fz={16} fw={600} c="text.6">
          {t("stats.distanceTitle", {
            period: shown === undefined ? servedYear(distance) : homePeriodLabel(shown, i18n.language, t),
          })}
        </Text>
        {isDesktop && (
          <Text fz={12} c="var(--color-text-dim)">
            {t(BUCKET_UNIT[bucket])}
          </Text>
        )}
      </Group>

      {drawn.bikes.length === 0 ? (
        <Text fz={13} c="var(--color-text-dim)">
          {t(shown === undefined ? "stats.distanceEmpty" : "stats.distanceEmptyPeriod")}
        </Text>
      ) : isDesktop ? (
        <DistanceBars distance={distance} bucket={bucket} />
      ) : (
        <>
          <DistanceChart distance={drawn} />
          <Legend bikes={drawn.bikes} />
        </>
      )}
    </DistancePaper>
  );
}

function DistanceChart({ distance }: { distance: Distance }): ReactElement {
  const { t, i18n } = useTranslation();
  const kmFormat = new Intl.NumberFormat(i18n.language);
  const year = servedYear(distance);
  const weeks = weekStarts(servedDays(distance), year);
  const lastWeek = weeks.length - 1;
  // Rounded here, where the line prints them: the running metres end at the bike's total.
  const running = distance.bikes.map((bike) =>
    weeklyRunningMeters(bike.daily_m, year).map((meters) => Math.round(meters / 1000)),
  );

  const data = weeks.map((week, index) => ({
    week,
    ...Object.fromEntries(distance.bikes.map((bike, row) => [seriesName(bike), running[row][index]])),
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
        ticks: monthTicks(year, weeks),
        tickFormatter: (week: string) => weekMonth(year, weeks, week).format("MMM"),
      }}
      // Sized to its longest label; Mantine's 10px tick shift is dropped, auto width cannot see it.
      yAxisProps={{
        width: "auto",
        tick: { fontSize: 12, fill: "currentColor" },
        tickFormatter: (km: number) => kmFormat.format(km),
      }}
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
function weekMonth(year: number, weeks: string[], week: string): dayjs.Dayjs {
  return week === weeks[0] ? dayjs(`${String(year)}-01-01`) : dayjs(week);
}

function monthTicks(year: number, weeks: string[]): string[] {
  return weeks.filter(
    (week, index) =>
      index === 0 || weekMonth(year, weeks, week).month() !== weekMonth(year, weeks, weeks[index - 1]).month(),
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
          <BikeColorDot colorIndex={bike.color_index} />
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
      // Fills a desktop grid cell, so cards side by side end level.
      h="100%"
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
