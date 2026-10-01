// Home's forecast card; the pace, the date and the curve are decided in StatsService.
import { useState, type ReactElement, type ReactNode } from "react";
import { Box, Group, Paper, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeFilterChip } from "@/features/bikes/ui/BikeFilterChip";
import { formatServiceDate } from "@/features/service/serviceDates";
import { attentionColor } from "@/features/service_tracking/attentionLevel";
import { remainingLabel } from "@/features/service_tracking/intervalFigures";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { TrackedActionDrawer } from "@/features/service_tracking/ui/TrackedActionDrawer";
import { useWearForecast } from "../stats.queries";
import type { WearForecastItem } from "../stats.types";
import { forecastBikes, forecastFigure, forecastNote, forecastSelection, hasRides } from "../wearForecast";
import { CHART_HEIGHT, ForecastChart } from "./ForecastChart";
import { ForecastPicker } from "./ForecastPicker";

export function WearForecastCard(): ReactElement {
  const { t } = useTranslation();
  const { data: forecast } = useWearForecast();
  const { data: garage } = useBikes();
  const [chosenBikeId, setChosenBikeId] = useState<number | null>(null);
  const [chosenKey, setChosenKey] = useState<string | null>(null);
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
  const selection = forecastSelection(items, chosenBikeId, chosenKey);
  const bikes = forecastBikes(garage ?? [], items);
  const bikeId = selection?.selected.bike_id;

  return (
    <>
      <ForecastPaper>
        <ForecastTitle />

        {selection === null || !items.some(hasRides) ? (
          <Text fz={13} c="var(--color-text-dim)">
            {t("stats.forecastEmpty")}
          </Text>
        ) : (
          <>
            {/* One bike is not a choice worth offering. */}
            {bikes.length > 1 && (
              <Group gap={8} wrap="wrap">
                {bikes.map((bike) => (
                  <BikeFilterChip
                    key={bike.id}
                    label={bikeTitle(bike)}
                    colorIndex={bike.color_index}
                    active={bike.id === bikeId}
                    onClick={() => {
                      if (bike.id === bikeId) return;
                      setChosenBikeId(bike.id);
                      setChosenKey(null);
                    }}
                  />
                ))}
              </Group>
            )}
            <ForecastPicker
              options={selection.options}
              selected={selection.selected}
              // The bike goes with the pick, so a refetch that moves the opening bike keeps it.
              onPick={(key) => {
                setChosenBikeId(selection.selected.bike_id);
                setChosenKey(key);
              }}
            />
            <ForecastHeader
              item={selection.selected}
              onOpen={() => {
                setOpened(selection.selected);
              }}
            />
            <ForecastChart item={selection.selected} />
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

function ForecastTitle(): ReactElement {
  const { t } = useTranslation();

  return (
    <Group justify="space-between" align="baseline" wrap="nowrap" gap="sm">
      <Text fz={16} fw={600} c="text.6" lineClamp={1}>
        {t("stats.forecastTitle")}
      </Text>
      <Text fz={11} c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
        {t("stats.forecastSubtitle")}
      </Text>
    </Group>
  );
}

// Opens the same drawer the Attention card does. Without a date the figure is the percentage.
function ForecastHeader({ item, onOpen }: { item: WearForecastItem; onOpen: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const color = attentionColor(item.percentage);
  const percentage = t("tracking.percentage", { value: item.percentage });
  const figure = forecastFigure(item, t, (date) => formatServiceDate(date, i18n.language));

  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil active:scale-[0.985]"
      style={{ display: "block", width: "100%", transition: "transform 0.12s ease" }}
    >
      <Stack gap={6}>
        <Group gap={10} wrap="nowrap">
          <Text
            className="tabular-nums"
            fz={22}
            fw={700}
            lh="28px"
            lts="var(--tracking-title)"
            c="text.6"
            style={{ flexShrink: 0 }}
          >
            {figure}
          </Text>
          <ForecastTag color={color} label={forecastNote(item, t, { brief: false })} />
        </Group>
        <Text className="tabular-nums" fz={12} lh="16px" c="var(--color-text-dim)" lineClamp={1}>
          {`${t("stats.forecastWear")} `}
          <Text span inherit fw={600} c="text.6">
            {percentage}
          </Text>
          {` · ${remainingLabel(item, i18n.language, t)}`}
        </Text>
      </Stack>
    </UnstyledButton>
  );
}

// The state is carried by this tag and the curve's colour, never by the date's.
function ForecastTag({ color, label }: { color: string; label: string }): ReactElement {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      px={9}
      py={4}
      style={{
        minWidth: 0,
        borderRadius: 9999,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <Box w={6} h={6} style={{ flexShrink: 0, borderRadius: 9999, backgroundColor: color }} />
      <Text
        className="tabular-nums"
        fz={10}
        fw={600}
        lh="12px"
        tt="uppercase"
        lts="var(--tracking-label)"
        c={color}
        lineClamp={1}
        style={{ minWidth: 0 }}
      >
        {label}
      </Text>
    </Group>
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
      <Stack gap="sm">{children}</Stack>
    </Paper>
  );
}
