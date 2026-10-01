// Desktop Service's three figures: services and costs for the filter, and what waits on the chosen bike.
import { Fragment, type ReactElement, type ReactNode } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Figure } from "@/components/Figure";
import { useHistoryTotals } from "@/features/service/service.queries";
import { EVERY_READING, attentionColor } from "@/features/service_tracking/attentionLevel";
import { planDayLabel } from "@/features/service_tracking/plannedDay";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction } from "@/features/service_tracking/tracking.types";
import { homePeriodLabel, homePeriodServices } from "@/features/stats/homePeriod";
import type { HomePeriod } from "@/features/stats/stats.types";
import { useCurrentUser } from "@/features/users/users.queries";
import { formatCost } from "@/utils/money";

interface ServiceFiguresRowProps {
  // Null is every bike.
  bikeId: number | null;
  period: HomePeriod;
}

export function ServiceFiguresRow({ bikeId, period }: ServiceFiguresRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: totals } = useHistoryTotals(bikeId ?? undefined, homePeriodServices(period));
  const periodName = homePeriodLabel(period, i18n.language, t);
  const number = (value: number): string => new Intl.NumberFormat(i18n.language).format(value);
  const cost = (value: number): string => formatCost(value, user?.currency ?? null, i18n.language);

  return (
    <SimpleGrid cols={3} spacing="md">
      <Figure
        title={t("service.tileServices", { period: periodName })}
        value={totals === undefined ? null : number(totals.service_count)}
        detail={totals === undefined ? "" : t("service.replacementCount", { count: totals.replacement_count })}
        detailFigure
      />
      <Figure
        title={t("service.tileCosts", { period: periodName })}
        value={totals === undefined ? null : cost(totals.total_cost)}
        detail={
          totals === undefined
            ? ""
            : t("service.averageCost", {
                value: totals.service_count === 0 ? "—" : cost(Math.round(totals.total_cost / totals.service_count)),
              })
        }
        detailFigure
      />
      <WaitingFigure bikeId={bikeId} />
    </SimpleGrid>
  );
}

// Follows the bike only: what is due and booked is now, not in the period.
function WaitingFigure({ bikeId }: { bikeId: number | null }): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: garage } = useGarageTrackedActions(EVERY_READING);

  const actions = (garage ?? []).filter((action) => bikeId === null || action.bike_id === bikeId);
  // Overdue counts as critical: the tile has two words, not the five levels.
  const critical = actions.filter((action) => action.level === "critical" || action.level === "overdue");
  const soon = actions.filter((action) => action.level === "warning");
  const plannedDays = actions
    .map((action) => action.planned_for)
    .filter((day): day is string => day !== null)
    .sort();

  return (
    <Figure
      title={t("service.tileWaiting")}
      value={garage === undefined ? null : <DueCounts critical={critical} soon={soon} />}
      valueFigure={critical.length + soon.length > 0}
      detail={
        plannedDays.length === 0
          ? t("tracking.notPlanned")
          : `${t("service.plannedCount", { count: plannedDays.length })} · ${planDayLabel(plannedDays[0], i18n.language)}`
      }
      detailFigure={plannedDays.length > 0}
    />
  );
}

// Each non-zero count in its own level's colour; nothing due reads as words.
function DueCounts({ critical, soon }: { critical: GarageTrackedAction[]; soon: GarageTrackedAction[] }): ReactNode {
  const { t } = useTranslation();
  const parts = [
    { key: "dashboard.criticalCount", actions: critical },
    { key: "service.soonCount", actions: soon },
  ].filter(({ actions }) => actions.length > 0);

  if (parts.length === 0) return t("tracking.allGoodTitle");
  return parts.map(({ key, actions }, index) => (
    <Fragment key={key}>
      {index > 0 && " · "}
      <Text span inherit c={attentionColor(Math.max(...actions.map((action) => action.percentage)))}>
        {t(key, { count: actions.length })}
      </Text>
    </Fragment>
  ));
}
