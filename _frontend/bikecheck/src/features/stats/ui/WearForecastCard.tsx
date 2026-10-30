// Home's forecast card; the pace, the date and the curve are decided in StatsService.
import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Group, Menu, Paper, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { Check, ChevronDown, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExplanationModal } from "@/components/ExplanationModal";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { TrackedActionDrawer } from "@/features/service_tracking/ui/TrackedActionDrawer";
import { useWearForecast } from "../stats.queries";
import type { WearForecastItem } from "../stats.types";
import { forecastBikes, forecastSlides, hasRides } from "../wearForecast";
import { CHART_HEIGHT } from "./ForecastChart";
import { ForecastCarousel } from "./ForecastCarousel";

const CHIP_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 32,
  padding: "0 10px",
  minWidth: 0,
  borderRadius: 9999,
  backgroundColor: "var(--color-surface-raised)",
};

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
  const slides = forecastSlides(items, chosenBikeId);

  if (slides.length === 0 || !items.some(hasRides)) {
    return (
      <ForecastPaper>
        <ForecastTitle />
        <Text fz={13} c="var(--color-text-dim)">
          {t("stats.forecastEmpty")}
        </Text>
      </ForecastPaper>
    );
  }

  const bikeId = slides[0].bike_id;
  // Held once shown, so a refetch that moves the garage's pick never swaps the bike being read.
  if (chosenBikeId !== bikeId) setChosenBikeId(bikeId);

  return (
    <>
      <ForecastCarousel
        key={bikeId}
        slides={slides}
        title={<ForecastTitle />}
        bikeChip={
          <ForecastBikeChip item={slides[0]} bikes={forecastBikes(garage ?? [], items)} onPick={setChosenBikeId} />
        }
        onOpen={setOpened}
      />

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
        <Info size={14} color="var(--color-text-dim)" />
      </ActionIcon>
      <ExplanationModal
        explained={explained ? { title, body: t("stats.forecastSubtitle") } : null}
        onClose={() => setExplained(false)}
      />
    </Group>
  );
}

interface ForecastBikeChipProps {
  // Names the bike shown; the garage list only adds its colour and the others.
  item: WearForecastItem;
  bikes: ListedBike[];
  onPick: (bikeId: number) => void;
}

// One bike is not a choice worth offering, so its chip opens nothing.
function ForecastBikeChip({ item, bikes, onPick }: ForecastBikeChipProps): ReactElement {
  const label = <ChipLabel item={item} colorIndex={colorIndexOf(bikes, item.bike_id)} />;
  if (bikes.length < 2) return <Box style={CHIP_STYLE}>{label}</Box>;

  // In place, not portalled: a portalled list flickers in the Capacitor webview.
  return (
    <Menu position="bottom-end" radius="md" shadow="md" withinPortal={false}>
      <Menu.Target>
        <UnstyledButton className="hover-veil" style={CHIP_STYLE}>
          {label}
          <ChevronDown size={12} strokeWidth={2.4} color="var(--mantine-color-text-6)" style={{ flexShrink: 0 }} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown
        bg="cards.6"
        p={8}
        style={{ border: "1px solid var(--mantine-color-cards-6)", boxShadow: "var(--elev-panel)" }}
      >
        {bikes.map((bike) => (
          <Menu.Item
            key={bike.id}
            color="text"
            fw={600}
            leftSection={<BikeColorDot colorIndex={bike.color_index} />}
            rightSection={bike.id === item.bike_id ? <Check size={14} /> : undefined}
            onClick={() => onPick(bike.id)}
          >
            {bikeTitle(bike)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function ChipLabel({ item, colorIndex }: { item: WearForecastItem; colorIndex: number | null }): ReactElement {
  return (
    <>
      <BikeColorDot colorIndex={colorIndex} size={7} />
      <Text fz={13} fw={500} c="text.6" truncate>
        {bikeTitle(item)}
      </Text>
    </>
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
