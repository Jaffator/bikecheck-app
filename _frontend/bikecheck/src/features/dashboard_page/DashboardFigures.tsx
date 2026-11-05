// Home's figures as one card: the Period's distance, climb, time in the saddle and energy. Distance, climb
// and energy read as an Equivalent; the terms are in CONTEXT.md.
import type { ReactElement } from "react";
import { Box, SimpleGrid, useMatches } from "@mantine/core";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { FigureSection } from "@/components/FigureSection";
import { formatDuration } from "@/features/rides/rideDuration";
import {
  CLIMBED,
  ENERGY,
  RIDDEN,
  SADDLE_TIME,
  totalMeters,
  weekdayMinutes,
  type DailySeries,
} from "@/features/stats/distanceDays";
import {
  EARTH,
  EVEREST,
  MARATHON,
  equivalentLabel,
  equivalentOf,
  type Yardstick,
} from "@/features/stats/figureReadings";
import { homePeriodLabel } from "@/features/stats/homePeriod";
import { useDistance } from "@/features/stats/stats.queries";
import type { Distance, HomePeriod } from "@/features/stats/stats.types";
import { WeekdayBars } from "@/features/stats/ui/WeekdayBars";
import { YardstickFlame } from "@/features/stats/ui/YardstickFlame";
import { YardstickMountain } from "@/features/stats/ui/YardstickMountain";
import { YardstickRing } from "@/features/stats/ui/YardstickRing";
import { useIsDesktop } from "@/layout/breakpoints";

// The phone stacks the sections; desktop puts four across once there is room.
const COLS = { base: 1, md: 2, lg: 4 };
const HAIRLINE = "1px solid var(--color-border)";

type FigureKind = "distance" | "climb" | "energy";

// The Equivalents read the same response the same way; only the series and the yardstick differ.
const EQUIVALENT_FIGURES: Record<FigureKind, { series: DailySeries; yardstick: Yardstick; titleKey: string }> = {
  distance: { series: RIDDEN, yardstick: EARTH, titleKey: "stats.distanceTitle" },
  climb: { series: CLIMBED, yardstick: EVEREST, titleKey: "dashboard.climbTitle" },
  energy: { series: ENERGY, yardstick: MARATHON, titleKey: "dashboard.energyTitle" },
};

// Desktop puts time third, so distance and climb sit side by side; the phone keeps it second. What is due
// is the attention card's, on both.
export function DashboardFigures({ period }: { period: HomePeriod }): ReactElement {
  const desktop = useIsDesktop();
  const cols = useMatches(COLS, { getInitialValueInEffect: false });
  const distance = <EquivalentFigure key="distance" period={period} figure="distance" />;
  const time = <TimeFigure key="time" period={period} />;
  const climb = <EquivalentFigure key="climb" period={period} figure="climb" />;
  const energy = <EquivalentFigure key="energy" period={period} figure="energy" />;
  const sections = desktop ? [distance, climb, time, energy] : [distance, time, climb, energy];

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

// The graphic carries the whole reading: the figure in or over it, the yardstick's name under it.
function YardstickGraphic({ meters, yardstick }: { meters: number; yardstick: Yardstick }): ReactElement {
  const { t, i18n } = useTranslation();
  const equivalent = equivalentOf(meters, yardstick);
  const figure = equivalentLabel(equivalent, i18n.language, t);
  const name = t(equivalent.times > 0 ? yardstick.timesKey : yardstick.shareKey);
  const label = `${figure} ${name}`;

  if (yardstick.graphic === "ring") {
    return <YardstickRing equivalent={equivalent} figure={figure} name={name} label={label} />;
  }
  if (yardstick.graphic === "flame") return <YardstickFlame equivalent={equivalent} label={label} />;
  return <YardstickMountain equivalent={equivalent} label={label} />;
}

interface EquivalentFigureProps {
  period: HomePeriod;
  figure: FigureKind;
}

function EquivalentFigure({ period, figure }: EquivalentFigureProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const { series, yardstick, titleKey } = EQUIVALENT_FIGURES[figure];
  const head = { title: t(titleKey, { period: homePeriodLabel(period, i18n.language, t) }), unit: series.unit };

  if (distance === undefined) return <FigureSection {...head} value={null} />;
  const meters = totalMeters(distance, series);
  const value = series.figure(meters, i18n.language);
  // The last Period's data holds the value, but read against the new Period it would say the wrong thing.
  if (isPlaceholderData) return <FigureSection {...head} value={value} />;

  return (
    <FigureSection
      {...head}
      value={value}
      detail={perRide(distance, meters, series, i18n.language, t)}
      detailFigure
      graphic={<YardstickGraphic meters={meters} yardstick={yardstick} />}
    />
  );
}

// "ø 678 m / jízda"; a Period without a ride has no average.
function perRide(distance: Distance, meters: number, series: DailySeries, language: string, t: TFunction): string {
  const rides = distance.bikes.reduce((sum, bike) => sum + bike.ride_count, 0);
  return t("dashboard.perRide", { value: rides === 0 ? "—" : series.format(Math.round(meters / rides), language) });
}

// The rides started in the Period and their average length under the value; the bars say which weekday
// gets the most of it.
function TimeFigure({ period }: { period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: distance, isPlaceholderData } = useDistance(period);
  const head = {
    title: t("dashboard.timeTitle", { period: homePeriodLabel(period, i18n.language, t) }),
    unit: SADDLE_TIME.unit,
  };

  if (distance === undefined) return <FigureSection {...head} value={null} />;
  const minutes = totalMeters(distance, SADDLE_TIME);
  const value = SADDLE_TIME.figure(minutes, i18n.language);
  if (isPlaceholderData) return <FigureSection {...head} value={value} />;

  const rides = distance.bikes.reduce((sum, bike) => sum + bike.ride_count, 0);
  const average = rides === 0 ? "—" : formatDuration(minutes / rides);
  return (
    <FigureSection
      {...head}
      value={value}
      detail={`${t("dashboard.ridesCount", { count: rides })} · ${t("dashboard.perRide", { value: average })}`}
      detailFigure
      graphic={<WeekdayBars minutes={weekdayMinutes(distance)} label={head.title} />}
    />
  );
}
