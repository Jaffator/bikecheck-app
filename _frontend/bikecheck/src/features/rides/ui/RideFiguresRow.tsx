// Desktop Přiřazené's three figures for the filter: distance against the period before, time, climbing.
import type { ReactElement, ReactNode } from "react";
import dayjs from "dayjs";
import { SimpleGrid, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Figure } from "@/components/Figure";
import { formatKm } from "@/features/profile/profileFormat";
import { formatDuration } from "@/features/rides/rideDuration";
import type { RideFigures } from "@/features/rides/rides.types";
import { distanceChange, periodLabel, previousMonthNumber } from "@/features/rides/ridesTable";
import type { HomePeriod } from "@/features/stats/stats.types";

interface RideFiguresRowProps {
  // Undefined while the first page loads.
  figures: RideFigures | undefined;
  period: HomePeriod;
}

export function RideFiguresRow({ figures, period }: RideFiguresRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const number = (value: number): string => new Intl.NumberFormat(i18n.language).format(value);
  const label = periodLabel(period, i18n.language);
  const distanceTitle = label === null ? t("rides.statDistance") : `${label} · ${t("rides.statDistance")}`;

  return (
    <SimpleGrid cols={3} spacing="md">
      <Figure
        title={distanceTitle}
        value={figures === undefined ? null : formatKm(Math.round(figures.distance_m / 1000), i18n.language)}
        detail={figures === undefined || period === "all" ? "" : <DistanceChange figures={figures} period={period} />}
        detailFigure
      />
      <Figure
        title={t("rides.statDuration")}
        value={figures === undefined ? null : formatDuration(figures.time_min)}
        detail={
          figures === undefined
            ? ""
            : `${t("dashboard.ridesCount", { count: figures.count })} · ø ${
                figures.count === 0 ? "—" : formatDuration(figures.time_min / figures.count)
              }`
        }
        detailFigure
      />
      <Figure
        title={t("rides.statElevation")}
        value={figures === undefined ? null : `${number(figures.elevation_up_m)} m`}
        detail={
          figures === undefined
            ? ""
            : t("ridesTable.descent", {
                value: number(figures.elevation_down_m),
              })
        }
        detailFigure
      />
    </SimpleGrid>
  );
}

// "+12 % proti srpnu" or "proti roku 2025"; a period before with no distance leaves nothing to compare.
function DistanceChange({ figures, period }: { figures: RideFigures; period: HomePeriod }): ReactNode {
  const { t } = useTranslation();
  const change = distanceChange(figures.distance_m, figures.previous_distance_m);
  if (change === null) return t(period === "year" ? "ridesTable.noComparisonYear" : "ridesTable.noComparison");
  const versus =
    period === "year"
      ? t("ridesTable.vsYear", { year: dayjs().year() - 1 })
      : t(`ridesTable.vsMonth.${String(previousMonthNumber())}`);

  return (
    <>
      <Text span inherit c="text.6" fw={600}>
        {t("tracking.percentage", {
          value: change > 0 ? `+${String(change)}` : String(change),
        })}
      </Text>
      {` ${versus}`}
    </>
  );
}
