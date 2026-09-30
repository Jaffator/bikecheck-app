// Desktop Home's row of figures: the Period's distance and time in the saddle, what is due now
// and the next replacement. Spend is the spend card's; Strava's problems are the banner's.
import { Fragment, useState, type ReactElement, type ReactNode } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Figure } from "@/components/Figure";
import { formatKm } from "@/features/profile/profileFormat";
import { formatDuration } from "@/features/rides/rideDuration";
import { DUE_FROM, attentionColor } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { AttentionLevel, GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";
import { TrackedActionDrawer } from "@/features/service_tracking/ui/TrackedActionDrawer";
import { periodGain, totalMeters } from "@/features/stats/distanceDays";
import { homePeriodLabel } from "@/features/stats/homePeriod";
import { useNextReplacement } from "@/features/stats/nextReplacement";
import { useDistance } from "@/features/stats/stats.queries";
import type { HomePeriod } from "@/features/stats/stats.types";

// Worst first, and only the levels the app speaks at.
const DUE_LEVELS: { level: AttentionLevel; key: string }[] = [
  { level: "overdue", key: "dashboard.overdueCount" },
  { level: "critical", key: "dashboard.criticalCount" },
  { level: "warning", key: "dashboard.warningCount" },
];

// Due and the next replacement look at now, so only the Period's readings take it.
export function DashboardFigures({ period }: { period: HomePeriod }): ReactElement {
  return (
    <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="md">
      <DistanceFigure period={period} />
      <TimeFigure period={period} />
      <DueFigure />
      <NextReplacementFigure />
    </SimpleGrid>
  );
}

function DistanceFigure({ period }: { period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: distance } = useDistance(period);

  return (
    <Figure
      title={t("stats.distanceTitle", { period: homePeriodLabel(period, i18n.language, t) })}
      value={distance === undefined ? null : formatKm(Math.round(totalMeters(distance) / 1000), i18n.language)}
      detail={distance === undefined ? "" : periodGain(distance, period, i18n.language, t)}
      detailFigure
      onOpen={() => navigate("/bikes")}
    />
  );
}

// The rides started in the Period, beside the distance they covered.
function TimeFigure({ period }: { period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: distance } = useDistance(period);

  const rides = (distance?.bikes ?? []).reduce((sum, bike) => sum + bike.ride_count, 0);
  const minutes = (distance?.bikes ?? []).reduce((sum, bike) => sum + bike.time_min, 0);
  const hours = new Intl.NumberFormat(i18n.language).format(Math.round(minutes / 60));
  const average = rides === 0 ? "—" : formatDuration(minutes / rides);

  return (
    <Figure
      title={t("dashboard.timeTitle", { period: homePeriodLabel(period, i18n.language, t) })}
      value={distance === undefined ? null : `${hours} h`}
      detail={`${t("dashboard.ridesCount", { count: rides })} · ø ${average}`}
      detailFigure
      onOpen={() => navigate("/rides")}
    />
  );
}

function DueFigure(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: due } = useGarageTrackedActions(DUE_FROM);

  return (
    <Figure
      title={t("dashboard.dueTitle")}
      value={due === undefined ? null : new Intl.NumberFormat(i18n.language).format(due.length)}
      detail={due === undefined ? "" : <DueLevels due={due} />}
      // The counts are figures; "All good" is words.
      detailFigure={due !== undefined && due.length > 0}
      onOpen={() => navigate("/service")}
    />
  );
}

// Each level that is not zero, in its own colour; any reading at a level wears that level's colour.
function DueLevels({ due }: { due: GarageTrackedAction[] }): ReactNode {
  const { t } = useTranslation();
  const levels = DUE_LEVELS.map(({ level, key }) => ({
    key,
    actions: due.filter((action) => action.level === level),
  })).filter(({ actions }) => actions.length > 0);

  if (levels.length === 0) return t("tracking.allGoodTitle");
  return levels.map(({ key, actions }, index) => (
    <Fragment key={key}>
      {index > 0 && " · "}
      <Text span inherit c={attentionColor(actions[0].percentage)}>
        {t(key, { count: actions.length })}
      </Text>
    </Fragment>
  ));
}

function NextReplacementFigure(): ReactElement {
  const { t } = useTranslation();
  const next = useNextReplacement();
  const [opened, setOpened] = useState<TrackedAction | null>(null);

  return (
    <>
      {next === undefined || next === null ? (
        <Figure highlighted title={t("stats.nextReplacement")} value={next === undefined ? null : "—"} detail="" />
      ) : (
        <Figure
          highlighted
          title={t("stats.nextReplacement")}
          value={<NameAndFigure name={next.part} figure={next.left} />}
          valueFigure={false}
          valueColor={attentionColor(next.item.percentage)}
          detail={<NameAndFigure name={next.bike} figure={next.weeks} />}
          onOpen={() => setOpened(next.item)}
        />
      )}
      {/* Mounted either way, so logging the part from it does not tear the drawer down mid-close. */}
      <TrackedActionDrawer action={opened} onClose={() => setOpened(null)} />
    </>
  );
}

// A name, then its figure in tabular numerals.
function NameAndFigure({ name, figure }: { name: string; figure: string }): ReactElement {
  return (
    <>
      {`${name} · `}
      <Text span inherit className="tabular-nums">
        {figure}
      </Text>
    </>
  );
}
