// Home's distance card; which rides count is decided in StatsService.
import { useState, type ReactElement, type ReactNode } from "react";
import { Box, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { AreaChart, type AreaChartProps } from "@mantine/charts";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { bikeColor } from "@/features/bikes/bikeColors";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { formatKm } from "@/features/profile/profileFormat";
import { formatServiceDateShort } from "@/features/service/serviceDates";
import { useIsDesktop } from "@/layout/breakpoints";
import { formatNumber } from "@/utils/number";
import {
  RIDDEN,
  runningDistance,
  servedYear,
  totalMeters,
  type DistanceStep,
  type RunningDistance,
} from "../distanceDays";
import { homePeriodLabel } from "../homePeriod";
import { useDistance } from "../stats.queries";
import type { Distance, DistanceBike, HomePeriod } from "../stats.types";

const CHART_HEIGHT = 160;
const FIGURE_SIZE = 28;
const FIGURE_LINE = 1.1;
const TICK_SIZE = 11;
// One bike's line gets a soft fill; several would only muddy each other.
const SINGLE_FILL = 0.1;
const END_DOT_RADIUS = 4.5;
// One bike's label sits above its dot, room the top needs; several print right of their ends.
const SINGLE_MARGIN = { top: 16, right: 8 };
// All time runs to six digits.
const MULTI_MARGIN = { top: 8, right: 60 };
const X_TICK = { transform: "translate(0, 10)", fontSize: TICK_SIZE, fill: "currentColor" };
// Steps of the three-tick axis, times a power of ten, so it reads 0 · 40 · 80, never 0 · 55 · 110.
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

// Mantine draws its tooltip for a light page; this one sits on the dark card.
const TOOLTIP_STYLES: AreaChartProps["styles"] = {
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

// Each bike's running km over the Period, under what they add up to.
export function DistanceCard({ period }: { period: HomePeriod }): ReactElement {
  const { t } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const isDesktop = useIsDesktop();
  // The last Period's data stands in while the next loads, so it is drawn as that Period until replaced.
  const [shown, setShown] = useState(period);
  if (!isPlaceholderData && shown !== period) setShown(period);

  if (distance === undefined) {
    return (
      <DistancePaper>
        <Skeleton h={14} w="60%" />
        <Skeleton h={FIGURE_SIZE} w="35%" />
        <Skeleton h={CHART_HEIGHT} />
      </DistancePaper>
    );
  }

  // The phone keeps drawing only bikes that covered a km, as before rides without distance were served.
  const drawn = isDesktop ? distance : { ...distance, bikes: distance.bikes.filter((bike) => bike.total_km > 0) };
  const single = drawn.bikes.length === 1 ? drawn.bikes[0] : null;

  return (
    <DistancePaper>
      <Stack gap={10}>
        <DistanceHeader period={shown} />
        {drawn.bikes.length > 0 && <DistanceTotal distance={drawn} single={single} />}
      </Stack>

      {drawn.bikes.length === 0 ? (
        <Text fz={13} c="var(--color-text-dim)">
          {t("stats.distanceEmptyPeriod")}
        </Text>
      ) : (
        <>
          <DistanceChart distance={drawn} period={shown} />
          {single === null && <Legend bikes={drawn.bikes} withTotals={isDesktop} />}
        </>
      )}
    </DistancePaper>
  );
}

function DistanceHeader({ period }: { period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const label = homePeriodLabel(period, i18n.language, t);

  return (
    <Group justify="space-between" align="baseline" wrap="nowrap" gap="sm">
      <Text fz={17} fw={600} c="text.6">
        {t("stats.distance")}
      </Text>
      {/* Capitalised because it stands alone, though Czech writes months small. */}
      <Text fz={13} c="text.7" style={{ flexShrink: 0 }}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </Group>
  );
}

// Summed in metres and rounded once, as every distance figure on Home is.
function DistanceTotal({ distance, single }: { distance: Distance; single: DistanceBike | null }): ReactElement {
  const { i18n } = useTranslation();

  return (
    <Group justify="space-between" align="baseline" wrap="nowrap" gap="sm">
      <Text
        className="tabular-nums"
        fz={FIGURE_SIZE}
        fw={600}
        lh={FIGURE_LINE}
        lts="var(--tracking-display)"
        c="text.6"
        style={{ flexShrink: 0 }}
      >
        {RIDDEN.format(totalMeters(distance, RIDDEN), i18n.language)}
      </Text>
      {single !== null && (
        // The name carries the baseline; the dot only centres on it.
        <Group gap={7} wrap="nowrap" align="baseline" style={{ minWidth: 0 }}>
          <Box style={{ alignSelf: "center" }}>
            <BikeColorDot colorIndex={single.color_index} size={7} />
          </Box>
          <Text fz={13} c="text.7" truncate>
            {bikeTitle(single)}
          </Text>
        </Group>
      )}
    </Group>
  );
}

function DistanceChart({ distance, period }: { distance: Distance; period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const isDesktop = useIsDesktop();
  const line = runningDistance(distance, period);
  const lastIndex = line.starts.length - 1;
  const single = distance.bikes.length === 1;
  const ticks = yTicks(Math.max(...distance.bikes.map((bike) => bike.total_km)));

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
    <AreaChart
      h={CHART_HEIGHT}
      // The phone reads the totals off the line ends; a tap would only focus the surface and ring it.
      style={isDesktop ? undefined : { pointerEvents: "none" }}
      data={data}
      dataKey="start"
      series={series}
      curveType="linear"
      withDots={false}
      withGradient={false}
      fillOpacity={single ? SINGLE_FILL : 0}
      strokeDasharray="none"
      tickLine="none"
      textColor="text.8"
      gridColor="var(--color-border-subtle)"
      valueFormatter={(km) => formatKm(km, i18n.language)}
      xAxisProps={{ tick: X_TICK, ...xAxisOf(line, servedYear(distance)) }}
      // Sized to its longest label; Mantine's 10px tick shift is dropped, auto width cannot see it.
      yAxisProps={{
        width: "auto",
        ticks,
        domain: [0, ticks[ticks.length - 1]],
        tick: { fontSize: TICK_SIZE, fill: "currentColor" },
        tickFormatter: (km: number) => formatNumber(km, i18n.language),
      }}
      areaChartProps={{ margin: single ? SINGLE_MARGIN : MULTI_MARGIN }}
      areaProps={(item) => {
        const labelProps = { lastIndex, lineColor: item.color, language: i18n.language };
        return { label: single ? <EndMarker {...labelProps} /> : <EndLabel {...labelProps} /> };
      }}
      tooltipProps={{
        labelFormatter: (start: ReactNode) => pointLabel(line.step, String(start), i18n.language, t),
      }}
      styles={TOOLTIP_STYLES}
    />
  );
}

// The top tick sits at or just above the longest line's end; a whole step, so no tick reads 1.5 km.
function yTicks(topKm: number): number[] {
  const rough = Math.max(topKm / 2, 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.ceil((NICE_STEPS.find((nice) => nice * power >= rough) ?? 10) * power);
  return [0, step, step * 2];
}

// The year names each month under its first week, a month ticks weekly from the 1st, all time is the chart's.
function xAxisOf(line: RunningDistance, year: number): AreaChartProps["xAxisProps"] {
  if (line.step === "week") {
    return {
      ticks: monthTicks(year, line.starts),
      tickFormatter: (week: string) => weekMonth(year, line.starts, week).format("MMM"),
    };
  }
  if (line.step === "day") {
    return {
      ticks: line.starts.filter((_, index) => index % 7 === 0),
      tickFormatter: (start: string) => dayjs(start).format("D"),
    };
  }
  return { tickFormatter: (start: string) => dayjs(start).format("MMM YY") };
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

// Recharts clones these onto every point of a line; only the last one prints the Period's total.
interface EndLabelProps {
  lastIndex: number;
  lineColor: string;
  language: string;
  x?: number | string;
  y?: number | string;
  value?: number | string;
  index?: number;
}

function EndLabel({ lastIndex, lineColor, language, x, y, value, index }: EndLabelProps): ReactElement | null {
  if (index !== lastIndex || value === undefined) return null;

  return (
    <text x={Number(x) + 6} y={Number(y)} dy={4} fill={lineColor} fontSize={13} className="tabular-nums">
      {formatNumber(Number(value), language)}
    </text>
  );
}

// Raised above-left of its dot: a running line that ends flat would run through a label level with it.
function EndMarker({ lastIndex, lineColor, language, x, y, value, index }: EndLabelProps): ReactElement | null {
  if (index !== lastIndex || value === undefined) return null;

  return (
    <g>
      <circle
        cx={Number(x)}
        cy={Number(y)}
        r={END_DOT_RADIUS}
        fill={lineColor}
        strokeWidth={2}
        style={{ stroke: "var(--mantine-color-cards-6)" }}
      />
      <text
        x={Number(x) - 8}
        y={Number(y) - 6}
        textAnchor="end"
        fontSize={TICK_SIZE}
        className="tabular-nums"
        style={{ fill: "var(--mantine-color-text-6)" }}
      >
        {formatKm(Number(value), language)}
      </text>
    </g>
  );
}

// Desktop prints each total again: line ends that finish close together overlap.
function Legend({ bikes, withTotals }: { bikes: DistanceBike[]; withTotals: boolean }): ReactElement {
  const { i18n } = useTranslation();

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
              {formatNumber(bike.total_km, i18n.language)}
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
      <Stack gap={14}>{children}</Stack>
    </Paper>
  );
}
