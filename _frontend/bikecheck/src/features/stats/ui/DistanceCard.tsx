// Home's distance card; which rides count is decided in StatsService.
import { useState, type ReactElement, type ReactNode } from "react";
import { Box, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { AreaChart, type AreaChartProps } from "@mantine/charts";
import dayjs from "dayjs";
import { useYAxisScale } from "recharts";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { bikeColor } from "@/features/bikes/bikeColors";
import { bikeTitle } from "@/features/bikes/bikeTitle";
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
import { useDistance } from "../stats.queries";
import type { Distance, DistanceBike, HomePeriod } from "../stats.types";
import { HOME_FIGURE_SIZE, HomeCardHeader, HomeFigure } from "./HomeCardHeader";

const CHART_HEIGHT = 160;
const DESKTOP_CHART_HEIGHT = 250;
const TICK_SIZE = 11;
const LINE_WIDTH = 2.2;
// Peak of the fill under each line; it fades out towards the zero line, so several lines stay readable.
const FILL_OPACITY = 0.16;
const END_DOT_RADIUS = 4.5;
const CARD_COLOR = "var(--mantine-color-cards-6)";
// One bike's label sits above its dot, room the top needs; several print right of their ends.
const SINGLE_MARGIN = { top: 16, right: 8 };
const MULTI_TOP = 8;
// Into the card's padding, so the plot takes the width the axis and the end labels leave.
const CHART_BLEED = 8;
const END_LABEL_OFFSET = 6;
// One tabular digit of the 13px end label, rounded up.
const END_LABEL_CHAR = 8;
// Line ends closer than one 13px label line are pushed apart.
const END_LABEL_GAP = 15;
const TICK_STYLE = { fontVariantNumeric: "tabular-nums" };
const X_TICK = { transform: "translate(0, 10)", fontSize: TICK_SIZE, fill: "currentColor", style: TICK_STYLE };
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
        <Skeleton h={HOME_FIGURE_SIZE} w="35%" />
        <Skeleton h={isDesktop ? DESKTOP_CHART_HEIGHT : CHART_HEIGHT} />
      </DistancePaper>
    );
  }

  // The phone keeps drawing only bikes that covered a km, as before rides without distance were served.
  const drawn = isDesktop ? distance : { ...distance, bikes: distance.bikes.filter((bike) => bike.total_km > 0) };

  return (
    <DistancePaper>
      <Stack gap={10}>
        <HomeCardHeader title={t("stats.distance")} period={shown} />
        {drawn.bikes.length > 0 && <DistanceTotal distance={drawn} withTotals={isDesktop} />}
      </Stack>

      {drawn.bikes.length === 0 ? (
        <Text fz={13} c="text.8">
          {t("stats.distanceEmptyPeriod")}
        </Text>
      ) : (
        <DistanceChart distance={drawn} period={shown} />
      )}
    </DistancePaper>
  );
}

// Summed in metres and rounded once, as every distance figure on Home is.
function DistanceTotal({ distance, withTotals }: { distance: Distance; withTotals: boolean }): ReactElement {
  const { i18n } = useTranslation();

  return (
    <Group justify="space-between" align="flex-end" gap="md" style={{ rowGap: 10 }}>
      <HomeFigure>{RIDDEN.format(totalMeters(distance, RIDDEN), i18n.language)}</HomeFigure>
      {/* One bike's total is the figure beside it. */}
      <Legend bikes={distance.bikes} withTotals={withTotals && distance.bikes.length > 1} />
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
  const ends = distance.bikes.map((_, row) => Math.round(line.meters[row][lastIndex] / 1000));

  return (
    <Box mx={-CHART_BLEED}>
      <AreaChart
        h={isDesktop ? DESKTOP_CHART_HEIGHT : CHART_HEIGHT}
        // The phone reads the totals off the line ends; a tap would only focus the surface and ring it.
        style={isDesktop ? undefined : { pointerEvents: "none" }}
        data={data}
        dataKey="start"
        series={series}
        curveType="monotone"
        withDots={false}
        withGradient
        fillOpacity={FILL_OPACITY}
        strokeWidth={LINE_WIDTH}
        strokeDasharray="none"
        referenceLines={[{ y: 0, color: "var(--color-border-strong)" }]}
        tickLine="none"
        textColor="text.8"
        gridColor="var(--color-border-subtle)"
        valueFormatter={(km) => formatKm(km, i18n.language)}
        xAxisProps={{ tick: X_TICK, ...xAxisOf(line, servedYear(distance), i18n.language) }}
        // Sized to its longest label; Mantine's 10px tick shift is dropped, auto width cannot see it.
        yAxisProps={{
          width: "auto",
          ticks,
          domain: [0, ticks[ticks.length - 1]],
          tick: { fontSize: TICK_SIZE, fill: "currentColor", style: TICK_STYLE },
          tickFormatter: (km: number) => formatNumber(km, i18n.language),
        }}
        areaChartProps={{
          margin: single ? SINGLE_MARGIN : { top: MULTI_TOP, right: endLabelRoom(ends, i18n.language) },
        }}
        areaProps={(item) => {
          const labelProps = { lastIndex, lineColor: item.color, language: i18n.language };
          const row = series.findIndex((line) => line.name === item.name);
          return {
            // Set here: Mantine's activeDotProps only work with withDots, which marks every point.
            activeDot: { r: END_DOT_RADIUS, fill: CARD_COLOR, stroke: item.color, strokeWidth: LINE_WIDTH },
            label: single ? <EndMarker {...labelProps} /> : <EndLabel {...labelProps} ends={ends} row={row} />,
          };
        }}
        tooltipProps={{
          labelFormatter: (start: ReactNode) => pointLabel(line.step, String(start), i18n.language, t),
        }}
        styles={TOOLTIP_STYLES}
      />
    </Box>
  );
}

// As wide as the longest total printed, so a month's short labels do not hold all time's six digits of room.
function endLabelRoom(ends: number[], language: string): number {
  const longest = Math.max(...ends.map((km) => formatNumber(km, language).length));
  return END_LABEL_OFFSET + longest * END_LABEL_CHAR;
}

// The top tick sits at or just above the longest line's end; a whole step, so no tick reads 1.5 km.
function yTicks(topKm: number): number[] {
  const rough = Math.max(topKm / 2, 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.ceil((NICE_STEPS.find((nice) => nice * power >= rough) ?? 10) * power);
  return [0, step, step * 2];
}

// The year names each month under its first week, a month ticks weekly from the 1st, a custom span's weeks
// name the day they start, all time is the chart's.
function xAxisOf(line: RunningDistance, year: number, language: string): AreaChartProps["xAxisProps"] {
  if (line.step === "week") {
    return { ticks: line.starts, tickFormatter: (start: string) => formatServiceDateShort(start, language) };
  }
  if (line.step === "yearWeek") {
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
  if (step === "week" || step === "yearWeek") {
    return t("stats.distanceWeek", { date: formatServiceDateShort(start, language) });
  }
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

// Every line's end km and this line's row in them, so each label knows where the others sit.
interface SpreadProps {
  ends: number[];
  row: number;
}

function EndLabel(props: EndLabelProps & SpreadProps): ReactElement | null {
  const { lastIndex, lineColor, language, x, y, value, index, ends, row } = props;
  const yScale = useYAxisScale();
  if (index !== lastIndex || value === undefined) return null;

  const spread = yScale === undefined ? undefined : spreadEnds(ends.map((km) => yScale(km) ?? 0), yScale(0) ?? 0);
  return (
    <text x={Number(x) + END_LABEL_OFFSET} y={spread?.[row] ?? Number(y)} dy={4} fill={lineColor} fontSize={13} className="tabular-nums">
      {formatNumber(Number(value), language)}
    </text>
  );
}

// Pushes the end labels a gap apart downwards, then back up so none drops under the zero line.
function spreadEnds(ys: number[], bottom: number): number[] {
  const order = ys.map((_, row) => row).sort((a, b) => ys[a] - ys[b]);
  const placed = [...ys];
  for (let rank = 1; rank < order.length; rank++) {
    placed[order[rank]] = Math.max(placed[order[rank]], placed[order[rank - 1]] + END_LABEL_GAP);
  }
  for (let rank = order.length - 1; rank >= 0; rank--) {
    const limit = rank === order.length - 1 ? bottom : placed[order[rank + 1]] - END_LABEL_GAP;
    placed[order[rank]] = Math.min(placed[order[rank]], limit);
  }
  return placed;
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
        style={{ stroke: CARD_COLOR }}
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
    <Group gap={6}>
      {bikes.map((bike) => (
        <Group
          key={bike.bike_id}
          h={28}
          pl={9}
          pr={10}
          gap={8}
          wrap="nowrap"
          maw="100%"
          style={{ borderRadius: 8, border: "1px solid var(--color-border-subtle)" }}
        >
          <Box
            w={14}
            h={2.5}
            style={{ flexShrink: 0, borderRadius: 2, backgroundColor: bikeColor(bike.color_index) }}
          />
          <Text fz={13} c="text.7" truncate style={{ minWidth: 0 }}>
            {bikeTitle(bike)}
          </Text>
          {withTotals && (
            <Text className="tabular-nums" fz={13} fw={600} c="text.6">
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
