// One part's wear: solid as ridden, dotted to the projected date, dashed at the service limit, each named on the chart.
import type { ReactElement } from "react";
import { LineChart } from "@mantine/charts";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { ReferenceDot } from "recharts";
import { formatLongDate } from "@/features/service/serviceDates";
import { attentionColor } from "@/features/service_tracking/attentionLevel";
import type { WearForecastItem } from "../stats.types";

export const CHART_HEIGHT = 160;
const DUE = 100;
// Room under 0 % for today's label when the reading itself sits on the floor.
const FLOOR = -18;
// The limit and the floor only; the inline labels say the rest.
const Y_TICKS = [0, DUE];
const PROJECTION_DASH = "3 5";
const LIMIT_DASH = "4 4";
const LIMIT_COLOR = "var(--mantine-color-text-8)";
const CARD_COLOR = "var(--mantine-color-cards-6)";
const LABEL_SIZE = 11;
// Keeps a label clear of the line or the dot it names.
const LABEL_GAP = 9;

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
  const side = labelSide(today.at, first, last);
  // Today in the left half leaves the projection long enough to name and the right end free.
  const roomy = side === "below-right";
  const projected = item.projected_date !== null;

  return (
    <LineChart
      h={CHART_HEIGHT}
      // The reading around it is the button; a touch here would only focus the surface and ring it.
      style={{ pointerEvents: "none" }}
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
        // Recharts would shift both dates inwards again, as if centred; EdgeTick already anchors them.
        interval: 0,
        tick: <EdgeTick language={i18n.language} emphasizeLast={projected} />,
      }}
      yAxisProps={{
        width: "auto",
        ticks: Y_TICKS,
        domain: [FLOOR, (max: number) => Math.max(DUE, max)],
        tick: { fontSize: LABEL_SIZE, fill: "currentColor", style: { fontVariantNumeric: "tabular-nums" } },
        tickFormatter: (percentage: number) => t("tracking.percentage", { value: percentage }),
      }}
      lineChartProps={{ margin: { top: 18, right: 8 } }}
    >
      {/* Over the end dot, or at the left when today's label takes the right. */}
      <ReferenceDot
        x={roomy ? last : first}
        y={DUE}
        shape={(dot) => (
          <InlineLabel
            x={Number(dot.cx)}
            y={Number(dot.cy) - LABEL_GAP}
            anchor={roomy ? "end" : "start"}
            label={t("stats.forecastLimit")}
          />
        )}
      />
      {projected && roomy && (
        // Under the projection's midpoint, where neither line nor today's label runs.
        <ReferenceDot
          x={(today.at + last) / 2}
          y={(today.wear + DUE) / 2}
          shape={(dot) => (
            <InlineLabel
              x={Number(dot.cx) + LABEL_GAP}
              y={Number(dot.cy) + LABEL_GAP + LABEL_SIZE / 2}
              anchor="start"
              label={t("stats.forecastProjection")}
            />
          )}
        />
      )}
      {projected && <ReferenceDot x={last} y={DUE} r={4} fill={CARD_COLOR} stroke={color} strokeWidth={2} />}
      <ReferenceDot
        x={today.at}
        y={today.wear}
        shape={(dot) => (
          <TodayDot
            cx={Number(dot.cx)}
            cy={Number(dot.cy)}
            color={color}
            label={todayLabel}
            side={side}
          />
        )}
      />
    </LineChart>
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
        // A halo in the card's colour, so the limit line never runs through the figure.
        stroke={CARD_COLOR}
        strokeWidth={4}
        strokeLinejoin="round"
        style={{ fontVariantNumeric: "tabular-nums", paintOrder: "stroke" }}
      >
        {label}
      </text>
    </g>
  );
}

interface InlineLabelProps {
  x: number;
  y: number;
  anchor: "start" | "end";
  label: string;
}

// Names a line in place of a legend, as quiet as the axis.
function InlineLabel({ x, y, anchor, label }: InlineLabelProps): ReactElement<SVGElement> {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={LABEL_SIZE} fontWeight={400} fill={LIMIT_COLOR}>
      {label}
    </text>
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
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {formatLongDate(dayjs(payload.value).format("YYYY-MM-DD"), language)}
    </text>
  );
}
