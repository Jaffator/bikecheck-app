// Home's distance card; which rides count is decided in StatsService.
import { useState, type ReactElement, type ReactNode } from "react";
import { Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { LineChart, type LineChartProps } from "@mantine/charts";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { bikeColor } from "@/features/bikes/bikeColors";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { formatKm } from "@/features/profile/profileFormat";
import { formatServiceDateShort } from "@/features/service/serviceDates";
import { useIsDesktop } from "@/layout/breakpoints";
import { runningDistance, servedYear, type DistanceStep, type RunningDistance } from "../distanceDays";
import { homePeriodLabel } from "../homePeriod";
import { useDistance } from "../stats.queries";
import type { Distance, DistanceBike, HomePeriod } from "../stats.types";

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
    fontVariantNumeric: "tabular-nums",
  },
  tooltipItemName: { color: "var(--mantine-color-text-7)" },
  tooltipItemData: {
    color: "var(--mantine-color-text-6)",
    fontVariantNumeric: "tabular-nums",
  },
};

// Each bike's running km over the Period; the phone asks for no Period and reads its year.
export function DistanceCard({ period }: { period?: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const isDesktop = useIsDesktop();
  // The last Period's data stands in while the next loads, so it is drawn as that Period until replaced.
  const [shown, setShown] = useState(period);
  if (!isPlaceholderData && shown !== period) setShown(period);

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
      <Text fz={16} fw={600} c="text.6">
        {t("stats.distanceTitle", {
          period: shown === undefined ? servedYear(distance) : homePeriodLabel(shown, i18n.language, t),
        })}
      </Text>

      {drawn.bikes.length === 0 ? (
        <Text fz={13} c="var(--color-text-dim)">
          {t(shown === undefined ? "stats.distanceEmpty" : "stats.distanceEmptyPeriod")}
        </Text>
      ) : (
        <>
          <DistanceChart distance={drawn} period={shown} />
          <Legend bikes={drawn.bikes} withTotals={isDesktop} />
        </>
      )}
    </DistancePaper>
  );
}

function DistanceChart({ distance, period }: { distance: Distance; period: HomePeriod | undefined }): ReactElement {
  const { t, i18n } = useTranslation();
  const kmFormat = new Intl.NumberFormat(i18n.language);
  const line = runningDistance(distance, period);
  const lastIndex = line.starts.length - 1;

  // Rounded here, where the line prints them: the running metres end at the bike's total.
  const data = line.starts.map((start, index) => ({
    start,
    ...Object.fromEntries(
      distance.bikes.map((bike, row) => [seriesName(bike), Math.round(line.meters[row][index] / 1000)]),
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
      dataKey="start"
      series={series}
      withDots={false}
      tickLine="none"
      textColor="text.8"
      gridColor="var(--color-border-subtle)"
      valueFormatter={(km) => formatKm(km, i18n.language)}
      xAxisProps={xAxisOf(line, servedYear(distance))}
      // Sized to its longest label; Mantine's 10px tick shift is dropped, auto width cannot see it.
      yAxisProps={{
        width: "auto",
        tick: { fontSize: 12, fill: "currentColor" },
        tickFormatter: (km: number) => kmFormat.format(km),
      }}
      // Room on the right for each line's total; all time runs to six digits.
      lineChartProps={{ margin: { top: 8, right: 60 } }}
      lineProps={(item) => ({
        label: <EndLabel lastIndex={lastIndex} lineColor={item.color ?? ""} kmFormat={kmFormat} />,
      })}
      tooltipProps={{
        labelFormatter: (start: ReactNode) => pointLabel(line.step, String(start), i18n.language, t),
      }}
      styles={TOOLTIP_STYLES}
    />
  );
}

// The year names a month under each month's first week; a month and all time leave the spacing to the chart.
function xAxisOf(line: RunningDistance, year: number): LineChartProps["xAxisProps"] {
  if (line.step === "week") {
    return {
      ticks: monthTicks(year, line.starts),
      tickFormatter: (week: string) => weekMonth(year, line.starts, week).format("MMM"),
    };
  }
  const format = line.step === "day" ? "D" : "MMM YY";
  return { tickFormatter: (start: string) => dayjs(start).format(format) };
}

// dayjs, not Intl: Mantine also asks for a label while the tooltip is hidden, and Intl throws on it.
function pointLabel(step: DistanceStep, start: string, language: string, t: TFunction): string {
  if (step === "week") return t("stats.distanceWeek", { date: formatServiceDateShort(start, language) });
  if (step === "day") return formatServiceDateShort(start, language);
  return dayjs(start).format("MMMM YYYY");
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

// Recharts clones this onto every point of a line; only the last one prints the Period's total.
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
    <text x={Number(x) + 6} y={Number(y)} dy={4} fill={lineColor} fontSize={13} className="tabular-nums">
      {kmFormat.format(Number(value))}
    </text>
  );
}

// Desktop prints each total again: line ends that finish close together overlap.
function Legend({ bikes, withTotals }: { bikes: DistanceBike[]; withTotals: boolean }): ReactElement {
  const { i18n } = useTranslation();
  const kmFormat = new Intl.NumberFormat(i18n.language);

  return (
    <Group gap={withTotals ? "md" : "sm"} style={{ rowGap: 4 }}>
      {bikes.map((bike) => (
        <Group key={bike.bike_id} gap={6} wrap="nowrap">
          <BikeColorDot colorIndex={bike.color_index} />
          <Text fz={13} c="text.7">
            {bikeTitle(bike)}
          </Text>
          {withTotals && (
            <Text className="tabular-nums" fz={13} c="text.6">
              {kmFormat.format(bike.total_km)}
            </Text>
          )}
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
