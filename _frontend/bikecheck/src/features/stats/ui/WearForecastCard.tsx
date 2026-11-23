// Home's forecast card; the pace, the date and the curve are decided in StatsService.
import { useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExplanationModal } from "@/components/ExplanationModal";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { TrackedActionDrawer } from "@/features/service_tracking/ui/TrackedActionDrawer";
import { useWearForecast } from "../stats.queries";
import { forecastBikes, chosenBikeActions, hasRides } from "../wearForecast";
import { ForecastActions } from "./ForecastActions";
import { ForecastBikePicker } from "./ForecastBikePicker";
import { CHART_HEIGHT } from "./ForecastChart";

export function WearForecastCard(): ReactElement {
  const { t } = useTranslation();
  const { data: forecast } = useWearForecast();
  const { data: garage } = useBikes();
  const [chosenBikeId, setChosenBikeId] = useState<number | null>(null);
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
  const actions = chosenBikeActions(items, chosenBikeId);

  if (actions.length === 0 || !items.some(hasRides)) {
    return (
      <ForecastPaper>
        <ForecastTitle />
        <Text fz={13} c="text.8">
          {t("stats.forecastEmpty")}
        </Text>
      </ForecastPaper>
    );
  }

  const bikeId = actions[0].bike_id;
  // Held once shown, so a refetch that moves the garage's pick never swaps the bike being read.
  if (chosenBikeId !== bikeId) setChosenBikeId(bikeId);

  return (
    <>
      <ForecastPaper>
        <Group justify="space-between" wrap="nowrap" gap={8}>
          <ForecastTitle />
          <ForecastBikePicker
            item={actions[0]}
            bikes={forecastBikes(garage ?? [], items)}
            items={items}
            onPick={setChosenBikeId}
          />
        </Group>
        <ForecastActions key={bikeId} items={actions} onOpen={setOpened} />
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

// How the date is reached sits behind the icon, so the title stands alone.
function ForecastTitle(): ReactElement {
  const { t } = useTranslation();
  const [explained, setExplained] = useState(false);
  const title = t("stats.forecastTitle");

  return (
    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
      <Text fz={17} fw={600} c="text.6">
        {title}
      </Text>
      <ActionIcon
        variant="transparent"
        color="gray"
        size="sm"
        aria-label={t("stats.forecastInfo")}
        onClick={() => setExplained(true)}
        style={{ flexShrink: 0 }}
      >
        <Info size={14} color="var(--mantine-color-text-8)" />
      </ActionIcon>
      <ExplanationModal
        explained={explained ? { title, body: t("stats.forecastSubtitle") } : null}
        onClose={() => setExplained(false)}
      />
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
      <Stack gap="lg">{children}</Stack>
    </Paper>
  );
}
