// One part's wear: solid as ridden, dotted to the projected date, dashed at the service limit.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { LineChart } from "@mantine/charts";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { ReferenceDot } from "recharts";
import { formatServiceDate } from "@/features/service/serviceDates";
import { attentionColor } from "@/features/service_tracking/attentionLevel";
import { useIsDesktop } from "@/layout/breakpoints";
import type { WearForecastItem } from "../stats.types";

export const CHART_HEIGHT = 160;
const DUE = 100;
// Room under 0 % for today's label when the reading itself sits on the floor.
const FLOOR = -18;
const Y_TICKS = [0, 50, DUE];
const PROJECTION_DASH = "3 5";
const LIMIT_DASH = "4 4";
const LIMIT_COLOR = "var(--mantine-color-text-8)";
const CARD_COLOR = "var(--mantine-color-cards-6)";

// One chart row: a curve point, the projection's far end, or today carrying both.
interface ChartRow {
  at: number;
  wear?: number;
  projection?: number;
}

interface TodayPoint {
  at: number;
  wear: number;
}

export function ForecastChart({ item }: { item: WearForecastItem }): ReactElement {
  const { t, i18n } = useTranslation();
  const color = attentionColor(item.percentage);
  const rows = chartRows(item);
  const today = todayPoint(item);
  const first = rows[0].at;
  const last = rows[rows.length - 1].at;
  const todayLabel = t("stats.forecastToday", { value: t("tracking.percentage", { value: item.percentage }) });
  const isDesktop = useIsDesktop();

  return (
    <Stack gap={10}>
      <LineChart
        h={CHART_HEIGHT}
        // Nothing here answers a touch; a tap would only focus the surface and ring it.
        style={isDesktop ? undefined : { pointerEvents: "none" }}
        data={rows}
        dataKey="at"
        series={[
          { name: "wear", color },
          { name: "projection", color, strokeDasharray: PROJECTION_DASH },
        ]}
        curveType="linear"
        withDots={false}
        withTooltip={false}
        tickLine="none"
        strokeDasharray="0"
        textColor="text.8"
        gridColor="var(--color-border-subtle)"
        lineProps={{ strokeLinecap: "round" }}
        referenceLines={[{ y: DUE, color: LIMIT_COLOR, strokeDasharray: LIMIT_DASH }]}
        // Time-scaled, so the projection is as long as the weeks it spans.
        xAxisProps={{
          type: "number",
          scale: "time",
          domain: ["dataMin", "dataMax"],
          ticks: [first, last],
          tick: <EdgeTick language={i18n.language} emphasizeLast={item.projected_date !== null} />,
        }}
        yAxisProps={{
          width: "auto",
          ticks: Y_TICKS,
          domain: [FLOOR, (max: number) => Math.max(DUE, max)],
          tick: { fontSize: 11, fill: "currentColor", style: { fontVariantNumeric: "tabular-nums" } },
          tickFormatter: (percentage: number) => t("tracking.percentage", { value: percentage }),
        }}
        lineChartProps={{ margin: { top: 18, right: 8 } }}
      >
        {item.projected_date !== null && (
          <ReferenceDot x={last} y={DUE} r={4} fill={CARD_COLOR} stroke={color} strokeWidth={2} />
        )}
        <ReferenceDot
          x={today.at}
          y={today.wear}
          shape={(dot) => (
            <TodayDot
              cx={Number(dot.cx)}
              cy={Number(dot.cy)}
              color={color}
              label={todayLabel}
              side={labelSide(today.at, first, last)}
            />
          )}
        />
      </LineChart>
      <ForecastLegend color={color} withProjection={item.projected_date !== null} />
    </Stack>
  );
}

// The curve up to today, then the projection from today's point to 100 % on its date.
function chartRows(item: WearForecastItem): ChartRow[] {
  const curve: ChartRow[] = item.points.map((point) => ({ at: dayjs(point.date).valueOf(), wear: point.percentage }));
  if (item.projected_date === null) return curve;

  const today = curve[curve.length - 1];
  return [
    ...curve.slice(0, -1),
    { ...today, projection: today.wear },
    { at: dayjs(item.projected_date).valueOf(), projection: DUE },
  ];
}

// The server ends the curve on today, at the reading itself.
function todayPoint(item: WearForecastItem): TodayPoint {
  const today = item.points[item.points.length - 1];
  return { at: dayjs(today.date).valueOf(), wear: today.percentage };
}

// Both lines climb to the right, so the free corners are under the projection and over the curve.
// The label takes the one away from the nearer edge, where it is never clipped.
type LabelSide = "below-right" | "above-left";

function labelSide(at: number, first: number, last: number): LabelSide {
  return last > first && (at - first) / (last - first) > 0.5 ? "above-left" : "below-right";
}

interface TodayDotProps {
  cx: number;
  cy: number;
  color: string;
  label: string;
  side: LabelSide;
}

function TodayDot({ cx, cy, color, label, side }: TodayDotProps): ReactElement<SVGElement> {
  const aboveLeft = side === "above-left";

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} stroke={CARD_COLOR} strokeWidth={2} />
      <text
        x={aboveLeft ? cx - 8 : cx + 8}
        y={aboveLeft ? cy - 9 : cy + 14}
        textAnchor={aboveLeft ? "end" : "start"}
        fontSize={11}
        fontWeight={400}
        fill="var(--mantine-color-text-6)"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {label}
      </text>
    </g>
  );
}

// Recharts clones this onto both ticks; each is anchored inwards so neither date is clipped.
interface EdgeTickProps {
  language: string;
  // The projected date is the answer the card is for, so it reads brighter than the start.
  emphasizeLast: boolean;
  x?: number | string;
  y?: number | string;
  index?: number;
  payload?: { value: number };
}

function EdgeTick({ language, emphasizeLast, x, y, index, payload }: EdgeTickProps): ReactElement | null {
  if (payload === undefined) return null;
  const emphasized = emphasizeLast && index !== 0;

  return (
    <text
      x={Number(x)}
      y={Number(y)}
      dy={14}
      textAnchor={index === 0 ? "start" : "end"}
      fontSize={11}
      fontWeight={400}
      fill={emphasized ? "var(--mantine-color-text-6)" : "currentColor"}
      // The date is uppercase, so it takes the label tracking.
      style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "var(--tracking-label)" }}
    >
      {formatServiceDate(dayjs(payload.value).format("YYYY-MM-DD"), language)}
    </text>
  );
}

function ForecastLegend({ color, withProjection }: { color: string; withProjection: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap={14} wrap="wrap">
      <LegendItem label={t("stats.forecastActual")} swatch={{ borderTop: `2px solid ${color}` }} />
      {withProjection && (
        <LegendItem label={t("stats.forecastProjection")} swatch={{ borderTop: `2px dotted ${color}` }} />
      )}
      <LegendItem label={t("stats.forecastLimit")} swatch={{ borderTop: `1px dashed ${LIMIT_COLOR}` }} />
    </Group>
  );
}

function LegendItem({ label, swatch }: { label: string; swatch: { borderTop: string } }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap">
      <Box w={14} style={swatch} />
      <Text fz={12} lh="16px" c="var(--color-text-dim)">
        {label}
      </Text>
    </Group>
  );
}
