// Home's forecast card; the pace, the date and the curve are decided in StatsService.
import { useState, type ReactElement, type ReactNode } from "react";
import { Chip, Group, Paper, ScrollArea, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { LineChart } from "@mantine/charts";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { chipStyles } from "@/features/add_bike_page/formStyles";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { positionLabel } from "@/features/components/componentLabels";
import { formatServiceDate } from "@/features/service/serviceDates";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor, trackedActionKey } from "@/features/service_tracking/attentionLevel";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { TrackedActionDrawer } from "@/features/service_tracking/ui/TrackedActionDrawer";
import { weeksUntil } from "../nextReplacement";
import { useWearForecast } from "../stats.queries";
import type { WearForecastItem } from "../stats.types";

const CHART_HEIGHT = 160;
const DUE = 100;

// One chart row: a curve point, the projection's far end, or today carrying both.
interface ChartRow {
  at: number;
  wear?: number;
  projection?: number;
}

export function WearForecastCard(): ReactElement {
  const { t } = useTranslation();
  const { data: forecast } = useWearForecast();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [opened, setOpened] = useState<TrackedAction | null>(null);

  if (forecast === undefined) {
    return (
      <ForecastPaper>
        <Skeleton h={14} w="60%" />
        <Skeleton h={CHART_HEIGHT} />
      </ForecastPaper>
    );
  }

  const { items } = forecast;
  const selected = items.find((item) => trackedActionKey(item) === selectedKey) ?? preselected(items);

  return (
    <>
      <ForecastPaper>
        <Text fz={16} fw={600} c="text.6">
          {t("stats.forecastTitle")}
        </Text>

        {selected === undefined || !items.some(hasRides) ? (
          <Text fz={13} c="var(--color-text-dim)">
            {t("stats.forecastEmpty")}
          </Text>
        ) : (
          <>
            <ForecastChips items={items} selected={selected} onSelect={setSelectedKey} />
            <ForecastHeader
              item={selected}
              onOpen={() => {
                setOpened(selected);
              }}
            />
            <ForecastChart item={selected} />
          </>
        )}
      </ForecastPaper>

      <TrackedActionDrawer
        action={opened}
        onClose={() => {
          setOpened(null);
        }}
      />
    </>
  );
}

// The soonest real projection, so the first chart shown is not an overdue part.
function preselected(items: WearForecastItem[]): WearForecastItem | undefined {
  return items.find((item) => item.level !== "overdue" && item.projected_date !== null) ?? items[0];
}

// A curve that never moved and has no pace was never ridden.
function hasRides(item: WearForecastItem): boolean {
  return item.pace_per_week !== null || item.points.some((point) => point.percentage !== item.percentage);
}

function ForecastChips({
  items,
  selected,
  onSelect,
}: {
  items: WearForecastItem[];
  selected: WearForecastItem;
  onSelect: (key: string) => void;
}): ReactElement {
  const { t } = useTranslation();
  const selectedKey = trackedActionKey(selected);

  return (
    <ScrollArea type="never" offsetScrollbars={false}>
      <Chip.Group multiple={false} value={selectedKey} onChange={onSelect}>
        <Group gap="xs" wrap="nowrap">
          {items.map((item) => {
            const key = trackedActionKey(item);
            return (
              <Chip
                key={key}
                value={key}
                radius="xl"
                size="sm"
                color="primary.6"
                styles={chipStyles(key === selectedKey, { wrap: false })}
              >
                {`${partLabel(item, t)} · ${bikeTitle(item)}`}
              </Chip>
            );
          })}
        </Group>
      </Chip.Group>
    </ScrollArea>
  );
}

function partLabel(item: WearForecastItem, translate: (key: string) => string): string {
  const type = catalogueLabel(item.component_type_i18n_key, item.component_type, translate);
  const side = positionLabel(item.position, translate);
  return side === null ? type : `${type} (${side})`;
}

// Opens the same drawer the Attention card does.
function ForecastHeader({ item, onOpen }: { item: WearForecastItem; onOpen: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const figure =
    item.projected_date === null
      ? t("tracking.percentage", { value: item.percentage })
      : formatServiceDate(item.projected_date, i18n.language);

  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil active:scale-[0.985]"
      style={{ display: "block", width: "100%", transition: "transform 0.12s ease" }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-end" gap="sm">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fz={14} fw={600} c="text.6" lineClamp={1}>
            {catalogueLabel(item.action_i18n_key, item.action_name, t)}
          </Text>
          <Text className="tabular-nums" fz={11} tt="uppercase" lts="var(--tracking-label)" c="var(--color-text-dim)" lineClamp={1}>
            {forecastNote(item, t)}
          </Text>
        </Stack>
        <Text className="tabular-nums" fz={20} c={attentionColor(item.percentage)} lh={1} style={{ flexShrink: 0 }}>
          {figure}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

function forecastNote(item: WearForecastItem, translate: (key: string, options?: { count: number }) => string): string {
  if (item.level === "overdue") return translate("bikes.health.overdue");
  if (item.projected_date === null) return translate("stats.forecastNoRides");
  return translate("stats.forecastInWeeks", { count: weeksUntil(item.projected_date) });
}

function ForecastChart({ item }: { item: WearForecastItem }): ReactElement {
  const { i18n } = useTranslation();
  const color = attentionColor(item.percentage);
  const rows = chartRows(item);

  return (
    <LineChart
      h={CHART_HEIGHT}
      data={rows}
      dataKey="at"
      series={[
        { name: "wear", color },
        { name: "projection", color, strokeDasharray: "5 5" },
      ]}
      curveType="linear"
      withDots={false}
      withTooltip={false}
      tickLine="none"
      textColor="text.8"
      gridColor="var(--color-border-subtle)"
      referenceLines={[{ y: DUE, color: attentionColor(DUE), strokeDasharray: "4 4" }]}
      // Time-scaled, so the projection is as long as the weeks it spans.
      xAxisProps={{
        type: "number",
        scale: "time",
        domain: ["dataMin", "dataMax"],
        ticks: [rows[0].at, rows[rows.length - 1].at],
        tick: <EdgeTick language={i18n.language} />,
      }}
      yAxisProps={{
        width: "auto",
        domain: [0, (max: number) => Math.max(DUE, max)],
        tick: { fontSize: 12, fill: "currentColor" },
        tickFormatter: (percentage: number) => `${String(percentage)} %`,
      }}
      lineChartProps={{ margin: { top: 8, right: 8 } }}
    />
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

// Recharts clones this onto both ticks; each is anchored inwards so neither date is clipped.
interface EdgeTickProps {
  language: string;
  x?: number | string;
  y?: number | string;
  index?: number;
  payload?: { value: number };
}

function EdgeTick({ language, x, y, index, payload }: EdgeTickProps): ReactElement | null {
  if (payload === undefined) return null;

  return (
    <text x={Number(x)} y={Number(y)} dy={14} textAnchor={index === 0 ? "start" : "end"} fontSize={12} fill="currentColor">
      {formatServiceDate(dayjs(payload.value).format("YYYY-MM-DD"), language)}
    </text>
  );
}

function ForecastPaper({ children }: { children: ReactNode }): ReactElement {
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
