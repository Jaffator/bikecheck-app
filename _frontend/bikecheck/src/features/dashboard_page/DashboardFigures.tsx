// Home's figures as one card: the Period's distance, time in the saddle and climb, and on desktop what is
// due now. Distance and climb read as a Comparison or an Equivalent, flipped by a press; terms in CONTEXT.md.
import { Fragment, type ReactElement, type ReactNode } from "react";
import { Box, SimpleGrid, Text, useMatches } from "@mantine/core";
import { Bike, Clock, Mountain, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FigureSection, type FigureSectionProps } from "@/components/FigureSection";
import { formatDuration } from "@/features/rides/rideDuration";
import { DUE_FROM, QUIET_COLOR, attentionColor } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { AttentionLevel, GarageTrackedAction } from "@/features/service_tracking/tracking.types";
import {
  CLIMBED,
  RIDDEN,
  SADDLE_TIME,
  cellSeries,
  periodSeries,
  totalMeters,
  type DailySeries,
  type PeriodSeries,
} from "@/features/stats/distanceDays";
import {
  EARTH,
  EVEREST,
  changeLabel,
  compared,
  comparedFigure,
  comparisonOf,
  equivalentLabel,
  equivalentOf,
  periodName,
  type Compared,
  type ComparedFigure,
  type Yardstick,
} from "@/features/stats/figureReadings";
import { homePeriodLabel } from "@/features/stats/homePeriod";
import { useNextReplacement } from "@/features/stats/nextReplacement";
import { useDistance } from "@/features/stats/stats.queries";
import type { HomePeriod } from "@/features/stats/stats.types";
import { PeriodArea } from "@/features/stats/ui/PeriodArea";
import { PeriodBars } from "@/features/stats/ui/PeriodBars";
import { PeriodCells } from "@/features/stats/ui/PeriodCells";
import { YardstickLine } from "@/features/stats/ui/YardstickLine";
import { YardstickMountain } from "@/features/stats/ui/YardstickMountain";
import { useFigureReading, type ReadingFigure } from "@/features/stats/useFigureReading";
import { useIsDesktop } from "@/layout/breakpoints";
import { formatNumber } from "@/utils/number";

// Worst first, and only the levels the app speaks at.
const DUE_LEVELS: { level: AttentionLevel; key: string }[] = [
  { level: "overdue", key: "dashboard.overdueCount" },
  { level: "critical", key: "dashboard.criticalCount" },
  { level: "warning", key: "dashboard.warningCount" },
];

const ICON_SIZE = 15;
// The phone stacks the sections; desktop puts four across once there is room.
const COLS = { base: 1, md: 2, lg: 4 };
const HAIRLINE = "1px solid var(--color-border)";

// Ridden and climbed read the same response the same way; only the series, the yardstick and the graphics differ.
const FLIPPED: Record<
  ReadingFigure,
  {
    series: DailySeries;
    yardstick: Yardstick;
    titleKey: string;
    icon: ReactNode;
    comparison: (series: PeriodSeries, label: string) => ReactNode;
  }
> = {
  distance: {
    series: RIDDEN,
    yardstick: EARTH,
    titleKey: "stats.distanceTitle",
    icon: <Bike size={ICON_SIZE} />,
    comparison: (series, label) => <PeriodBars series={series} label={label} />,
  },
  climb: {
    series: CLIMBED,
    yardstick: EVEREST,
    titleKey: "dashboard.climbTitle",
    icon: <Mountain size={ICON_SIZE} />,
    comparison: (series, label) => <PeriodArea series={series} label={label} />,
  },
};

// Due looks at now, so only the Period's readings take it; the phone leaves it to the attention card.
export function DashboardFigures({ period }: { period: HomePeriod }): ReactElement {
  const desktop = useIsDesktop();
  const cols = useMatches(COLS, { getInitialValueInEffect: false });
  const sections = [
    <FlippedFigure key="distance" period={period} figure="distance" />,
    <TimeFigure key="time" period={period} />,
    <FlippedFigure key="climb" period={period} figure="climb" />,
    ...(desktop ? [<DueFigure key="due" />] : []),
  ];

  return (
    // Hairlines, not gaps, so the sections read as one card at any column count.
    <SimpleGrid
      cols={cols}
      spacing={0}
      verticalSpacing={0}
      style={{
        borderRadius: "var(--mantine-radius-lg)",
        backgroundColor: "var(--mantine-color-cards-6)",
        boxShadow: "var(--elev-panel)",
        // Clips the corner sections' hover veil to the card's radius.
        overflow: "hidden",
      }}
    >
      {sections.map((section, index) => (
        <Box
          key={section.key}
          style={{
            borderLeft: index % cols === 0 ? undefined : HAIRLINE,
            borderTop: index < cols ? undefined : HAIRLINE,
          }}
        >
          {section}
        </Box>
      ))}
    </SimpleGrid>
  );
}

// What a figure says under its value and draws along the bottom.
type Readout = Pick<FigureSectionProps, "chip" | "detail" | "graphic">;

interface Readouts {
  comparison: (figure: ComparedFigure) => Readout;
  equivalent: (meters: number, series: DailySeries, yardstick: Yardstick) => Readout;
}

function useReadouts(): Readouts {
  const { t, i18n } = useTranslation();

  return {
    // The chip only when the Period before had something to set it against.
    comparison: (figure) => {
      const { change, text } = comparisonOf(figure, i18n.language, t);
      return { chip: change === null ? undefined : changeLabel(change, i18n.language, t), detail: text };
    },
    equivalent: (meters, series, yardstick) => {
      const equivalent = equivalentOf(meters, yardstick);
      const chip = equivalentLabel(equivalent, i18n.language, t);
      const detail = t(equivalent.times > 0 ? yardstick.timesKey : yardstick.shareKey);
      const name = t(yardstick.labelKey, { value: series.format(yardstick.meters, i18n.language) });
      const label = `${chip} ${detail}`;
      const graphic =
        yardstick.graphic === "line" ? (
          <YardstickLine
            equivalent={equivalent}
            start={equivalent.times > 0 ? `×${formatNumber(equivalent.times, i18n.language)}` : `0 ${series.unit}`}
            end={name}
            label={label}
          />
        ) : (
          <YardstickMountain equivalent={equivalent} name={name} label={label} />
        );
      return { chip, detail, graphic };
    },
  };
}

interface FlippedFigureProps {
  period: HomePeriod;
  figure: ReadingFigure;
}

function FlippedFigure({ period, figure }: FlippedFigureProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const { reading, flip } = useFigureReading(figure);
  const readouts = useReadouts();
  const { series, yardstick, titleKey, icon, comparison } = FLIPPED[figure];
  const title = t(titleKey, { period: homePeriodLabel(period, i18n.language, t) });
  const head = { icon, title, unit: series.unit };

  if (distance === undefined) return <FigureSection {...head} value={null} />;
  const meters = totalMeters(distance, series);
  const value = series.figure(meters, i18n.language);
  // The last Period's data holds the value, but read against the new Period it would say the wrong thing.
  if (isPlaceholderData) return <FigureSection {...head} value={value} />;

  // All time has no Period before it, so it reads only as the Equivalent and ignores a press.
  const against = compared(distance, period);
  if (against === null || reading === "equivalent") {
    const readout = readouts.equivalent(meters, series, yardstick);
    return <FigureSection {...head} value={value} {...readout} onOpen={against === null ? undefined : flip} />;
  }
  const readout = readouts.comparison(comparedFigure(against, series));
  return (
    <FigureSection
      {...head}
      value={value}
      {...readout}
      detailFigure
      graphic={comparison(periodSeries(against.distance, against.period, series), title)}
      onOpen={flip}
    />
  );
}

// Only ever a Comparison; all time keeps the rides started in it and their average, and draws nothing.
function TimeFigure({ period }: { period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const readouts = useReadouts();
  const head = {
    icon: <Clock size={ICON_SIZE} />,
    title: t("dashboard.timeTitle", { period: homePeriodLabel(period, i18n.language, t) }),
    unit: SADDLE_TIME.unit,
  };

  if (distance === undefined) return <FigureSection {...head} value={null} />;
  const minutes = totalMeters(distance, SADDLE_TIME);
  const value = SADDLE_TIME.figure(minutes, i18n.language);
  if (isPlaceholderData) return <FigureSection {...head} value={value} />;

  const against = compared(distance, period);
  if (against === null) {
    const rides = distance.bikes.reduce((sum, bike) => sum + bike.ride_count, 0);
    const average = rides === 0 ? "—" : formatDuration(minutes / rides);
    return (
      <FigureSection
        {...head}
        value={value}
        detail={`${t("dashboard.ridesCount", { count: rides })} · ø ${average}`}
        detailFigure
      />
    );
  }
  return (
    <FigureSection
      {...head}
      value={value}
      {...readouts.comparison(comparedFigure(against, SADDLE_TIME))}
      detailFigure
      graphic={<TimeCells against={against} label={head.title} />}
    />
  );
}

function TimeCells({ against, label }: { against: Compared; label: string }): ReactElement {
  const { i18n } = useTranslation();
  const { distance, period } = against;
  return (
    <PeriodCells
      series={cellSeries(distance, period, SADDLE_TIME)}
      labels={[
        periodName(distance.previous.from, period, i18n.language),
        periodName(distance.from, period, i18n.language),
      ]}
      label={label}
    />
  );
}

function DueFigure(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: due } = useGarageTrackedActions(DUE_FROM);

  return (
    <FigureSection
      icon={<Wrench size={ICON_SIZE} />}
      title={t("dashboard.dueTitle")}
      value={due === undefined ? null : formatNumber(due.length, i18n.language)}
      unit={t("dashboard.partsUnit", { count: due?.length ?? 0 })}
      detail={due === undefined ? "" : due.length === 0 ? <AllGood /> : <DueLevels due={due} />}
      // The counts are figures; "All good" is words.
      detailFigure={due !== undefined && due.length > 0}
      onOpen={() => navigate("/service")}
    />
  );
}

function AllGood(): ReactNode {
  const { t } = useTranslation();
  const next = useNextReplacement();
  const text =
    next === null || next === undefined
      ? t("dashboard.dueAllGood")
      : t("dashboard.dueAllGoodNext", { part: next.part, left: next.left });

  return (
    <Text span inherit c={QUIET_COLOR}>
      {text}
    </Text>
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
