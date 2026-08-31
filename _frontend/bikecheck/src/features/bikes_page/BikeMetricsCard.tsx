// The four readings a bike carries, on one card. One card and not four, because they are
// one set of facts about the machine - see docs/ui/card-surface.md for the surface.
import type { ReactElement } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Clock, Gauge, Mountain, Weight } from "lucide-react";
import type { Bike } from "../bikes/bikes.types";

interface BikeMetricsCardProps {
  bike: Bike;
  // The weight is the one reading its owner types in, so the card can lead them to it.
  onEditWeight: () => void;
}

// Only the weight can be missing: it is the one reading nobody measures for the owner. A
// dash there says "not filled in", which is a different thing from having ridden nothing.
const MISSING = "—";

export function BikeMetricsCard({ bike, onEditWeight }: BikeMetricsCardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Group gap="xs" wrap="nowrap" align="flex-start" grow>
        <Metric
          icon={<Gauge size={15} color="var(--color-text-dim)" />}
          value={t("bikes.kilometres", { count: bike.total_km ?? 0 })}
          label={t("bikes.metricDistance")}
        />
        <Metric
          icon={<Mountain size={15} color="var(--color-text-dim)" />}
          value={t("bikes.metres", { count: bike.total_elevation_m ?? 0 })}
          label={t("bikes.metricElevation")}
        />
        <Metric
          icon={<Clock size={15} color="var(--color-text-dim)" />}
          value={t("bikes.hours", { count: Math.round((bike.total_time_min ?? 0) / 60) })}
          label={t("bikes.metricRideTime")}
        />
        <Metric
          icon={<Weight size={15} color="var(--color-text-dim)" />}
          value={bike.bike_weight_kg === null ? MISSING : t("bikes.kilograms", { weight: bike.bike_weight_kg })}
          label={t("bikes.metricWeight")}
          // A dash is the card asking to be filled in, so it leads to where that is done.
          onClick={bike.bike_weight_kg === null ? onEditWeight : undefined}
        />
      </Group>
    </Paper>
  );
}

// One reading: what it is, what it says, and what it is called.
function Metric({
  icon,
  value,
  label,
  onClick,
}: {
  icon: ReactElement;
  value: string;
  label: string;
  onClick?: () => void;
}): ReactElement {
  return (
    <Stack
      gap={6}
      style={{ minWidth: 0, cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {icon}
      <Text className="font-mono" fz={15} fw={600} c="text.6" lineClamp={1}>
        {value}
      </Text>
      <Text fz={11} c="var(--color-text-dim)" lh={1.25}>
        {label}
      </Text>
    </Stack>
  );
}
