// The ride's six figures, three across: a quiet label over each value, no icons.
import type { ReactElement } from "react";
import { Box, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { RideDetailFigures } from "@/features/rides/rideDetail";
import { formatDuration } from "@/features/rides/rideDuration";

const NO_FIGURE = "—";

interface FigureCell {
  label: string;
  value: string;
}

export function RideFigureGrid({ figures }: { figures: RideDetailFigures }): ReactElement {
  const { t } = useTranslation();
  const km = (value: number): string => t("pendingRides.distance", { count: value });
  const metres = (value: number): string => t("pendingRides.elevation", { count: value });
  const speed = (value: number): string => `${String(value)} km/h`;
  const cells: FigureCell[] = [
    { label: t("rides.statDistance"), value: shown(figures.distance_km, km) },
    { label: t("rides.statDuration"), value: shown(figures.duration_min, formatDuration) },
    { label: t("rides.statElevation"), value: shown(figures.elevation_up_m, metres) },
    { label: t("rides.statDescent"), value: shown(figures.elevation_down_m, metres) },
    { label: t("rides.statAvgSpeed"), value: shown(figures.speed_avg, speed) },
    { label: t("rides.statMaxSpeed"), value: shown(figures.max_speed_kmh, speed) },
  ];

  return (
    <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px 12px" }}>
      {cells.map((cell) => (
        <Figure key={cell.label} cell={cell} />
      ))}
    </Box>
  );
}

function Figure({ cell }: { cell: FigureCell }): ReactElement {
  return (
    <Stack gap={3} style={{ minWidth: 0 }}>
      <Text fz={12} c="text.8" lineClamp={1}>
        {cell.label}
      </Text>
      <Text className="tabular-nums" fz={20} fw={600} lh={1.2} lts="var(--tracking-title)" c="text.6" lineClamp={1}>
        {cell.value}
      </Text>
    </Stack>
  );
}

// A figure the ride arrived without reads as a dash, not a zero.
function shown(value: number | null, format: (value: number) => string): string {
  return value === null ? NO_FIGURE : format(value);
}
