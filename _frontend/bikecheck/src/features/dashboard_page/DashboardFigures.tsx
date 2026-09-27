// Desktop Home's row of figures: the year's distance, time in the saddle, what is due, this year's spend
// and the next replacement. Strava's problems are the banner's, not a figure's.
import { Fragment, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, SimpleGrid, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Eyebrow } from "@/components/Eyebrow";
import { PRESS_TRANSITION } from "@/components/panelRows";
import { useBikes } from "@/features/bikes/bikes.queries";
import { formatKm } from "@/features/profile/profileFormat";
import { formatDuration } from "@/features/rides/rideDuration";
import { useHistoryTotals } from "@/features/service/service.queries";
import type { HistoryTotals } from "@/features/service/service.types";
import { DUE_FROM, attentionColor } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { AttentionLevel, GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";
import { TrackedActionDrawer } from "@/features/service_tracking/ui/TrackedActionDrawer";
import { monthGain, totalMeters } from "@/features/stats/distanceDays";
import { useNextReplacement } from "@/features/stats/nextReplacement";
import { useDistance } from "@/features/stats/stats.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { formatCost } from "@/utils/money";

// Worst first, and only the levels the app speaks at.
const DUE_LEVELS: { level: AttentionLevel; key: string }[] = [
  { level: "overdue", key: "dashboard.overdueCount" },
  { level: "critical", key: "dashboard.criticalCount" },
  { level: "warning", key: "dashboard.warningCount" },
];

const HIGHLIGHT_BORDER = "1px solid color-mix(in srgb, var(--mantine-color-primary-6) 40%, transparent)";

export function DashboardFigures(): ReactElement {
  return (
    <SimpleGrid cols={{ base: 3, lg: 5 }} spacing="md">
      <DistanceFigure />
      <TimeFigure />
      <DueFigure />
      <SpendFigure />
      <NextReplacementFigure />
    </SimpleGrid>
  );
}

function DistanceFigure(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: distance } = useDistance();

  return (
    <Figure
      // The served year, which in early January is still last year.
      title={t("stats.distanceTitle", { year: distance?.year ?? new Date().getUTCFullYear() })}
      value={distance === undefined ? null : formatKm(Math.round(totalMeters(distance) / 1000), i18n.language)}
      detail={distance === undefined ? "" : monthGain(distance, i18n.language, t)}
      detailMono
      onOpen={() => navigate("/bikes")}
    />
  );
}

function TimeFigure(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes } = useBikes();

  const rides = (bikes ?? []).reduce((sum, bike) => sum + bike.ride_count, 0);
  const minutes = (bikes ?? []).reduce((sum, bike) => sum + bike.ride_time_min, 0);
  const hours = new Intl.NumberFormat(i18n.language).format(Math.round(minutes / 60));
  const average = rides === 0 ? "" : formatDuration(minutes / rides);

  return (
    <Figure
      title={t("dashboard.timeTitle")}
      value={bikes === undefined ? null : rides === 0 ? "—" : `${hours} h`}
      detail={rides === 0 ? "" : `${t("dashboard.ridesCount", { count: rides })} · ø ${average}`}
      detailMono
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
      detailMono={due !== undefined && due.length > 0}
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

function SpendFigure(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const year = dayjs().year();
  const { data: totals } = useHistoryTotals(undefined, { from: `${String(year)}-01-01`, to: null });
  const cost = (amount: number): string => formatCost(amount, user?.currency ?? null, i18n.language);

  return (
    <Figure
      title={t("dashboard.spendTitle", { year })}
      value={totals === undefined ? null : cost(totals.total_cost)}
      detail={totals === undefined ? "" : spendDetail(totals, cost, t)}
      detailMono
      onOpen={() => navigate(`/service/history?from=${String(year)}-01-01`)}
    />
  );
}

function spendDetail(totals: HistoryTotals, cost: (amount: number) => string, t: TFunction): string {
  const count = t("dashboard.servicesCount", { count: totals.service_count });
  if (totals.service_count === 0) return count;
  return `${count} · ø ${cost(totals.total_cost / totals.service_count)}`;
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
          valueMono={false}
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

// A name in the body font, then its figure in mono.
function NameAndFigure({ name, figure }: { name: string; figure: string }): ReactElement {
  return (
    <>
      {`${name} · `}
      <Text span inherit className="font-mono">
        {figure}
      </Text>
    </>
  );
}

interface FigureProps {
  title: string;
  // Null while it loads.
  value: ReactNode | null;
  valueMono?: boolean;
  valueColor?: string;
  detail: ReactNode;
  // Numbers read in mono, words in the body font.
  detailMono?: boolean;
  // The one figure the eye should reach first.
  highlighted?: boolean;
  // Without it the figure is only read, never pressed.
  onOpen?: () => void;
}

function Figure({
  title,
  value,
  valueMono = true,
  valueColor,
  detail,
  detailMono = false,
  highlighted = false,
  onOpen,
}: FigureProps): ReactElement {
  const surface: CSSProperties = {
    borderRadius: "var(--mantine-radius-lg)",
    backgroundColor: "var(--mantine-color-cards-6)",
    border: highlighted ? HIGHLIGHT_BORDER : "none",
    boxShadow: "var(--elev-panel)",
  };
  const body = (
    <Stack gap={4}>
      <Eyebrow>{title}</Eyebrow>
      {value === null ? (
        <Skeleton h={20} w="50%" radius="sm" />
      ) : (
        <Text className={valueMono ? "font-mono" : undefined} fz={16} fw={600} c={valueColor ?? "text.6"} lineClamp={1}>
          {value}
        </Text>
      )}
      <Text className={detailMono ? "font-mono" : undefined} fz={13} c="var(--color-text-dim)" lineClamp={1}>
        {detail}
      </Text>
    </Stack>
  );

  if (onOpen === undefined) {
    return (
      <Box p="md" style={surface}>
        {body}
      </Box>
    );
  }
  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil active:scale-[0.985]"
      p="md"
      style={{ ...surface, transition: PRESS_TRANSITION }}
    >
      {body}
    </UnstyledButton>
  );
}
