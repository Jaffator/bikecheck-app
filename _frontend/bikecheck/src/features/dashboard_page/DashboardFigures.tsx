// Home's figures: the Period's distance, time in the saddle and climb, and on desktop what is due now.
// Distance and climb read as a Comparison or an Equivalent, flipped by a press; terms in CONTEXT.md.
import { Fragment, type ReactElement, type ReactNode } from "react";
import { Box, SimpleGrid, Text, useMatches } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Figure } from "@/components/Figure";
import { FigureSection } from "@/components/FigureSection";
import { formatDuration } from "@/features/rides/rideDuration";
import { DUE_FROM, QUIET_COLOR, attentionColor } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { AttentionLevel, GarageTrackedAction } from "@/features/service_tracking/tracking.types";
import { CLIMBED, RIDDEN, periodBars, totalMeters, type DailySeries } from "@/features/stats/distanceDays";
import {
  EARTH,
  EVEREST,
  changeLabel,
  comparisonOf,
  equivalentLabel,
  equivalentOf,
  trendOf,
  type ComparedFigure,
  type Yardstick,
} from "@/features/stats/figureReadings";
import { homePeriodLabel } from "@/features/stats/homePeriod";
import { useNextReplacement } from "@/features/stats/nextReplacement";
import { useDistance } from "@/features/stats/stats.queries";
import type { Distance, HomePeriod } from "@/features/stats/stats.types";
import { PeriodBars } from "@/features/stats/ui/PeriodBars";
import { ReadingChip } from "@/features/stats/ui/ReadingChip";
import { YardstickGraphic } from "@/features/stats/ui/YardstickGraphic";
import { useFigureReading, type ReadFigure } from "@/features/stats/useFigureReading";
import { useIsDesktop } from "@/layout/breakpoints";
import { formatNumber } from "@/utils/number";

// Worst first, and only the levels the app speaks at.
const DUE_LEVELS: { level: AttentionLevel; key: string }[] = [
  { level: "overdue", key: "dashboard.overdueCount" },
  { level: "critical", key: "dashboard.criticalCount" },
  { level: "warning", key: "dashboard.warningCount" },
];

const PHONE_GAP = 8;
const DESKTOP_COLS = { base: 2, lg: 4 };
const HAIRLINE = "1px solid var(--color-border)";

// Ridden and climbed read the same response the same way; only the series and the yardstick differ.
const METERS: Record<ReadFigure, { series: DailySeries; yardstick: Yardstick; titleKey: string; shortKey: string }> = {
  distance: { series: RIDDEN, yardstick: EARTH, titleKey: "stats.distanceTitle", shortKey: "dashboard.riddenShort" },
  climb: { series: CLIMBED, yardstick: EVEREST, titleKey: "dashboard.climbTitle", shortKey: "dashboard.climbShort" },
};

// Due looks at now, so only the Period's readings take it. The phone leaves it to the attention card
// and fits three tiles across; the switcher above names the Period, so their titles drop it.
export function DashboardFigures({ period }: { period: HomePeriod }): ReactElement {
  const compact = !useIsDesktop();
  const figures = [
    <MetersFigure key="distance" period={period} compact={compact} figure="distance" />,
    <TimeFigure key="time" period={period} compact={compact} />,
    <MetersFigure key="climb" period={period} compact={compact} figure="climb" />,
  ];

  if (compact) {
    return (
      // Phone gaps stay narrow, so each third keeps the width for its figure.
      <SimpleGrid cols={3} spacing={PHONE_GAP}>
        {figures}
      </SimpleGrid>
    );
  }
  return <FiguresCard sections={[...figures, <DueFigure key="due" />]} />;
}

// Hairlines, not gaps, so the four read as one card at either column count.
function FiguresCard({ sections }: { sections: ReactElement[] }): ReactElement {
  const cols = useMatches(DESKTOP_COLS, { getInitialValueInEffect: false });

  return (
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

// What a figure says under its value; the phone keeps only the chip.
interface Readout {
  chip: ReactNode;
  detail: ReactNode;
  graphic?: ReactNode;
}

interface HomeFigureProps {
  title: string;
  value: string | null;
  readout?: Readout;
  compact: boolean;
  onOpen?: () => void;
}

function HomeFigure({ title, value, readout, compact, onOpen }: HomeFigureProps): ReactElement {
  if (compact) {
    return <Figure title={title} value={value} detail={readout?.chip ?? undefined} compact onOpen={onOpen} />;
  }
  return (
    <FigureSection
      title={title}
      value={value}
      chip={readout?.chip}
      detail={readout?.detail ?? ""}
      detailFigure
      graphic={readout?.graphic}
      onOpen={onOpen}
    />
  );
}

interface Readouts {
  comparison: (figure: ComparedFigure) => Readout;
  equivalent: (meters: number, yardstick: Yardstick) => Readout;
}

function useReadouts(): Readouts {
  const { t, i18n } = useTranslation();

  return {
    // The chip only when the Period before had something to set it against.
    comparison: (figure) => {
      const { change, text } = comparisonOf(figure, i18n.language, t);
      const chip =
        change === null ? null : <ReadingChip icon={trendOf(change)} label={changeLabel(change, i18n.language, t)} />;
      return { chip, detail: text };
    },
    equivalent: (meters, yardstick) => {
      const equivalent = equivalentOf(meters, yardstick);
      const label = equivalentLabel(equivalent, i18n.language, t);
      const text = t(equivalent.times > 0 ? yardstick.timesKey : yardstick.shareKey);
      return {
        chip: <ReadingChip icon={yardstick.graphic} label={label} />,
        detail: text,
        graphic: <YardstickGraphic equivalent={equivalent} yardstick={yardstick} label={`${label} ${text}`} />,
      };
    },
  };
}

interface PeriodFigureProps {
  period: HomePeriod;
  compact: boolean;
}

interface MetersFigureProps extends PeriodFigureProps {
  figure: ReadFigure;
}

function MetersFigure({ period, compact, figure }: MetersFigureProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const { reading, flip } = useFigureReading(figure);
  const readouts = useReadouts();
  const { series, yardstick, titleKey, shortKey } = METERS[figure];
  const title = t(compact ? shortKey : titleKey, { period: homePeriodLabel(period, i18n.language, t) });

  if (distance === undefined) return <HomeFigure title={title} value={null} compact={compact} />;

  const meters = totalMeters(distance, series);
  // The last Period's data holds the value, but read against the new Period it would say the wrong thing.
  if (isPlaceholderData) {
    return <HomeFigure title={title} value={series.format(meters, i18n.language)} compact={compact} />;
  }
  const compared = comparedMeters(distance, period, series);
  const readout =
    compared !== null && reading === "comparison"
      ? {
          ...readouts.comparison(compared),
          graphic: <PeriodBars bars={periodBars(distance, compared.period, series)} label={title} />,
        }
      : readouts.equivalent(meters, yardstick);

  return (
    <HomeFigure
      title={title}
      value={series.format(meters, i18n.language)}
      readout={readout}
      compact={compact}
      // All time has no Period before it, so it reads only as the Equivalent and ignores a press.
      onOpen={compared === null ? undefined : flip}
    />
  );
}

function comparedMeters(distance: Distance, period: HomePeriod, series: DailySeries): ComparedFigure | null {
  if (period === "all" || distance.previous === null) return null;
  return {
    current: totalMeters(distance, series),
    previous: series.previous(distance.previous),
    period,
    to: distance.to,
  };
}

// Only ever a Comparison; all time keeps the rides started in it and their average.
function TimeFigure({ period, compact }: PeriodFigureProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const readouts = useReadouts();
  const title = t(compact ? "dashboard.timeShort" : "dashboard.timeTitle", {
    period: homePeriodLabel(period, i18n.language, t),
  });

  if (distance === undefined) return <HomeFigure title={title} value={null} compact={compact} />;

  const rides = distance.bikes.reduce((sum, bike) => sum + bike.ride_count, 0);
  const minutes = distance.bikes.reduce((sum, bike) => sum + bike.time_min, 0);
  const average = rides === 0 ? "—" : formatDuration(minutes / rides);
  const readout =
    period === "all" || distance.previous === null
      ? { chip: null, detail: `${t("dashboard.ridesCount", { count: rides })} · ø ${average}` }
      : readouts.comparison({ current: minutes, previous: distance.previous.time_min, period, to: distance.to });

  return (
    <HomeFigure
      title={title}
      value={`${formatNumber(Math.round(minutes / 60), i18n.language)} h`}
      // As the distance: no reading off the last Period's data.
      readout={isPlaceholderData ? undefined : readout}
      compact={compact}
    />
  );
}

function DueFigure(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: due } = useGarageTrackedActions(DUE_FROM);

  return (
    <FigureSection
      title={t("dashboard.dueTitle")}
      value={due === undefined ? null : t("dashboard.partsCount", { count: due.length })}
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
