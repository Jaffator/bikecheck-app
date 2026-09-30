// Desktop Přiřazené's three figures for the filter: distance against the month before, time, climbing.
import type { ReactElement, ReactNode } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Figure } from "@/components/Figure";
import { formatKm } from "@/features/profile/profileFormat";
import { formatDuration } from "@/features/rides/rideDuration";
import type { RideFigures } from "@/features/rides/rides.types";
import { ALL_MONTHS, distanceChange, monthLabel, previousMonthNumber } from "@/features/rides/ridesTable";

interface RideFiguresRowProps {
  // Undefined while the first page loads.
  figures: RideFigures | undefined;
  month: string;
}

export function RideFiguresRow({ figures, month }: RideFiguresRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const number = (value: number): string => new Intl.NumberFormat(i18n.language).format(value);
  const distanceTitle =
    month === ALL_MONTHS ? t("rides.statDistance") : `${monthLabel(month, i18n.language)} · ${t("rides.statDistance")}`;

  return (
    <SimpleGrid cols={3} spacing="md">
      <Figure
        title={distanceTitle}
        value={figures === undefined ? null : formatKm(Math.round(figures.distance_m / 1000), i18n.language)}
        detail={figures === undefined || month === ALL_MONTHS ? "" : <DistanceChange figures={figures} month={month} />}
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

// "+12 % proti srpnu"; a month before with no distance leaves nothing to compare.
function DistanceChange({ figures, month }: { figures: RideFigures; month: string }): ReactNode {
  const { t } = useTranslation();
  const change = distanceChange(figures.distance_m, figures.previous_distance_m);
  if (change === null) return t("ridesTable.noComparison");

  return (
    <>
      <Text span inherit c="text.6" fw={600}>
        {t("tracking.percentage", {
          value: change > 0 ? `+${String(change)}` : String(change),
        })}
      </Text>
      {` ${t(`ridesTable.vsMonth.${String(previousMonthNumber(month))}`)}`}
    </>
  );
}
