// Desktop Home's Needs attention, worst first; a row opens the Tracked Action drawer, its buttons log or plan the Action.
import { useState, type ReactElement } from "react";
import { Box, Button, Center, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelSkeletonRows } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, onPanelRowKey } from "@/components/panelRows";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { useGarageComponents } from "@/features/components/components.queries";
import { catalogueLabel } from "@/features/service/serviceLabels";
import {
  DUE_FROM,
  QUIET_COLOR,
  attentionColor,
  fineParts,
  trackedActionKey,
  trackedPartLabel,
} from "@/features/service_tracking/attentionLevel";
import { readingFigure, remainingFigure } from "@/features/service_tracking/intervalFigures";
import { PASSED_PLAN_COLOR, isPlanPassed, planDayLabel } from "@/features/service_tracking/plannedDay";
import { trackedActionServiceLink } from "@/features/service_tracking/serviceLink";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";
import { useNextReplacement, type NextReplacementView } from "@/features/stats/nextReplacement";
import { PlanSheet } from "./PlanSheet";
import { TrackedActionDrawer } from "./TrackedActionDrawer";

const JOB_COLUMNS = "minmax(0, 1fr) 130px 104px 136px";

// The bar runs past the interval, so an overdue job reads beyond the mark rather than stopping at it.
const BULLET_MAX = 125;

export function JobsPanel(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: due } = useGarageTrackedActions(DUE_FROM);
  const { data: bikes } = useBikes();
  const parts = useGarageComponents((bikes ?? []).map((bike) => bike.id));
  const [opened, setOpened] = useState<TrackedAction | null>(null);
  const [planning, setPlanning] = useState<TrackedAction | null>(null);

  const rows = [...(due ?? [])].sort((left, right) => right.percentage - left.percentage);
  const fine = due === undefined || parts === undefined ? 0 : fineParts(parts, due);

  return (
    <Panel
      title={t("tracking.needsAttention")}
      count={due?.length}
      link={{ label: t("page.service"), onClick: () => navigate("/service") }}
    >
      {due === undefined && <PanelSkeletonRows count={4} />}
      {due !== undefined && rows.length === 0 && <NothingDue onOpen={setOpened} />}
      {rows.map((action) => (
        <JobRow
          key={trackedActionKey(action)}
          action={action}
          onOpen={() => setOpened(action)}
          onPlan={() => setPlanning(action)}
        />
      ))}
      {rows.length > 0 && fine > 0 && (
        <Text fz={13} c="var(--color-text-dim)" px="md" py={10} style={{ borderTop: PANEL_HAIRLINE }}>
          {t("tracking.moreFine", { count: fine })}
        </Text>
      )}
      <TrackedActionDrawer action={opened} onClose={() => setOpened(null)} />
      <PlanSheet action={planning} onClose={() => setPlanning(null)} />
    </Panel>
  );
}

// Carries its own buttons, so it does not press - docs/ui/card-surface.md.
function JobRow({
  action,
  onOpen,
  onPlan,
}: {
  action: GarageTrackedAction;
  onOpen: () => void;
  onPlan: () => void;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes } = useBikes();
  const color = attentionColor(action.percentage);
  // Critical and overdue pull the eye; a warning waits its turn.
  const urgent = action.level === "critical" || action.level === "overdue";
  const bike = [bikeTitle(action), action.component_desc].filter((part) => part !== null && part !== "").join(" · ");

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onPanelRowKey(event, onOpen)}
      className="hover-veil"
      style={{
        display: "grid",
        gridTemplateColumns: JOB_COLUMNS,
        alignItems: "center",
        gap: 12,
        padding: PANEL_ROW_PADDING,
        borderTop: PANEL_HAIRLINE,
      }}
    >
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Text fz={13} fw={600} c="text.6" lineClamp={1}>
          {catalogueLabel(action.action_i18n_key, action.action_name, t)}
        </Text>
        <Eyebrow>{trackedPartLabel(action, t)}</Eyebrow>
        {/* The bike's name gives way first; the reading behind the percentage stays whole. */}
        <Group gap={6} wrap="nowrap" fz={13} c="var(--color-text-dim)" style={{ minWidth: 0 }}>
          <BikeColorDot colorIndex={colorIndexOf(bikes, action.bike_id)} size={6} />
          <Text inherit lineClamp={1} style={{ minWidth: 0 }}>
            {bike}
          </Text>
          <Text inherit style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
            ·{" "}
            <Text span inherit className="tabular-nums">
              {readingFigure(action, i18n.language)}
            </Text>
          </Text>
        </Group>
      </Stack>
      <Group gap={10} wrap="nowrap">
        <BulletBar percentage={action.percentage} color={color} />
        <Text className="tabular-nums" fz={13} fw={600} c={color} ta="right" w={48} style={{ flexShrink: 0 }}>
          {t("tracking.percentage", { value: action.percentage })}
        </Text>
      </Group>
      <Text className="tabular-nums" fz={13} c="var(--color-text-dim)" ta="right" lineClamp={1}>
        {remainingLabel(action, i18n.language, t)}
      </Text>
      {/* Stacked rather than side by side: a second column would squeeze the Action's name to nothing at lg. */}
      <Stack gap={6}>
        <Button
          fullWidth
          size="xs"
          radius="md"
          variant={urgent ? "filled" : "outline"}
          color={urgent ? "primary.6" : undefined}
          c={urgent ? "textDark.6" : undefined}
          onClick={(event) => {
            event.stopPropagation();
            navigate(trackedActionServiceLink(action));
          }}
        >
          {t(action.replace_action ? "tracking.logReplacement" : "tracking.logService")}
        </Button>
        <PlanButton planned={action.planned_for} onPlan={onPlan} />
      </Stack>
    </Box>
  );
}

// Plan, or the planned day in the same frame - the date is also the control.
function PlanButton({ planned, onPlan }: { planned: string | null; onPlan: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const passed = planned !== null && isPlanPassed(planned);

  return (
    <Button
      fullWidth
      size="xs"
      radius="md"
      variant="outline"
      c={passed ? PASSED_PLAN_COLOR : undefined}
      className={planned === null ? undefined : "tabular-nums"}
      leftSection={<CalendarDays size={14} color={passed ? PASSED_PLAN_COLOR : "var(--mantine-color-primary-6)"} />}
      onClick={(event) => {
        event.stopPropagation();
        onPlan();
      }}
    >
      {planned === null ? t("tracking.plan") : planDayLabel(planned, i18n.language)}
    </Button>
  );
}

// Past due the figure already says "+X"; before it, it says what is left.
function remainingLabel(
  action: TrackedAction,
  language: string,
  translate: (key: string, options: { value: string }) => string,
): string {
  const figure = remainingFigure(action, language);
  return action.current > action.interval ? figure : translate("tracking.leftValue", { value: figure });
}

// A job read against its interval: the mark is the interval, the fill how far the part has come.
function BulletBar({ percentage, color }: { percentage: number; color: string }): ReactElement {
  const fill = (Math.min(percentage, BULLET_MAX) / BULLET_MAX) * 100;
  const mark = (100 / BULLET_MAX) * 100;

  return (
    <Box
      aria-hidden
      pos="relative"
      h={6}
      style={{ flex: 1, minWidth: 0, borderRadius: 9999, backgroundColor: "var(--color-decor-sunk)" }}
    >
      <Box h="100%" w={`${String(fill)}%`} style={{ borderRadius: 9999, backgroundColor: color }} />
      <Box
        pos="absolute"
        top={-4}
        bottom={-4}
        left={`${String(mark)}%`}
        w={2}
        style={{ borderRadius: 1, backgroundColor: "var(--mantine-color-text-6)", opacity: 0.55 }}
      />
    </Box>
  );
}

// One sentence, and the part that will need the owner next, so an empty card is still worth reading.
function NothingDue({ onOpen }: { onOpen: (action: TrackedAction) => void }): ReactElement {
  const { t } = useTranslation();
  const next = useNextReplacement();

  return (
    <Stack gap={4} p="md" style={{ borderTop: PANEL_HAIRLINE }}>
      <Group gap="sm" wrap="nowrap">
        <Center w={24} h={24} style={{ flexShrink: 0, borderRadius: 9999, backgroundColor: `${QUIET_COLOR}1A` }}>
          <Check size={14} color={QUIET_COLOR} strokeWidth={2.5} />
        </Center>
        <Text fz={13} c="text.7">
          {t("tracking.allGoodBody")}
        </Text>
      </Group>
      {next !== undefined && next !== null && <NextReplacementLine next={next} onOpen={() => onOpen(next.item)} />}
    </Stack>
  );
}

function NextReplacementLine({ next, onOpen }: { next: NextReplacementView; onOpen: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil"
      // The tick and its gap are 36px; the veil's own 6px padding is taken back, so the words line up.
      ml={30}
      px={6}
      py={2}
      style={{ borderRadius: "var(--mantine-radius-sm)", alignSelf: "flex-start", maxWidth: "calc(100% - 30px)" }}
    >
      <Group gap={8} wrap="nowrap">
        <Eyebrow>{t("stats.nextReplacement")}</Eyebrow>
        <Text fz={13} c="text.7" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          <Text span inherit c={attentionColor(next.item.percentage)}>
            {`${next.part} · `}
            <Text span inherit className="tabular-nums">
              {next.left}
            </Text>
          </Text>
          {` · ${next.bike} · `}
          <Text span inherit className="tabular-nums">
            {next.weeks}
          </Text>
        </Text>
      </Group>
    </UnstyledButton>
  );
}
