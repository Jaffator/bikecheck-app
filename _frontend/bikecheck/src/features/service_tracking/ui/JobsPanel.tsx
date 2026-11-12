// Desktop Home's Needs attention, worst first; a row opens the Tracked Action drawer, its buttons log or plan the Action.
import { useState, type ReactElement } from "react";
import { Box, Button, Center, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelSkeletonRows } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, onPanelRowKey } from "@/components/panelRows";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { catalogueLabel } from "@/features/service/serviceLabels";
import {
  DUE_FROM,
  QUIET_COLOR,
  attentionColor,
  attentionInk,
  trackedActionKey,
} from "@/features/service_tracking/attentionLevel";
import { attentionFigure, readingFigure } from "@/features/service_tracking/intervalFigures";
import { PASSED_PLAN_COLOR, isPlanPassed, planDayLabel } from "@/features/service_tracking/plannedDay";
import { trackedActionServiceLink } from "@/features/service_tracking/serviceLink";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";
import { useNextReplacement, type NextReplacementView } from "@/features/stats/nextReplacement";
import { AttentionCount } from "./AttentionCount";
import { BulletBar } from "./BulletBar";
import { PlanSheet } from "./PlanSheet";
import { TrackedActionDrawer } from "./TrackedActionDrawer";

// A fixed button column, so every row's line ends at the same place whatever its labels say.
const JOB_COLUMNS = "minmax(0, 1fr) 264px";

interface JobsPanelProps {
  // Set on the Service page, where null is every bike; Home passes none and links to Service.
  bikeId?: number | null;
}

export function JobsPanel({ bikeId }: JobsPanelProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: due } = useGarageTrackedActions(DUE_FROM);
  const [opened, setOpened] = useState<TrackedAction | null>(null);
  const [planning, setPlanning] = useState<TrackedAction | null>(null);

  const rows = (due ?? [])
    .filter((action) => bikeId === undefined || bikeId === null || action.bike_id === bikeId)
    .sort((left, right) => right.percentage - left.percentage);

  return (
    <Panel
      title={t("tracking.needsAttention")}
      badge={due === undefined ? undefined : <AttentionCount count={rows.length} />}
      link={bikeId === undefined ? { label: t("page.service"), onClick: () => navigate("/service") } : undefined}
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
  const ink = attentionInk(action);

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
        columnGap: 40,
        padding: PANEL_ROW_PADDING,
        borderTop: PANEL_HAIRLINE,
      }}
    >
      <Stack gap={8} style={{ minWidth: 0 }}>
        <Group gap={16} justify="space-between" wrap="nowrap" align="baseline">
          <Text fz={14} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0 }}>
            {catalogueLabel(action.action_i18n_key, action.action_name, t)}
          </Text>
          <Text className="tabular-nums" fz={13} fw={600} c={ink} style={{ whiteSpace: "nowrap" }}>
            {attentionFigure(action, i18n.language, t)}
          </Text>
        </Group>
        <BulletBar percentage={action.percentage} color={attentionColor(action.percentage)} />
        {/* The part is the drawer's to name; the row says only which bike. */}
        <Text className="tabular-nums" fz={12} c="text.8" lineClamp={1}>
          {`${bikeTitle(action)} · ${readingFigure(action, i18n.language)}`}
        </Text>
      </Stack>
      <Group gap={8} wrap="nowrap" justify="flex-end">
        <Button
          size="xs"
          radius="md"
          variant="outline"
          // Quiet until pointed at, so no row shouts before the owner reaches it.
          vars={() => ({
            root: { "--button-hover": "var(--mantine-color-primary-6)", "--button-hover-color": "var(--mantine-color-textDark-6)" },
          })}
          onClick={(event) => {
            event.stopPropagation();
            navigate(trackedActionServiceLink(action));
          }}
        >
          {t(action.replace_action ? "tracking.logReplacement" : "tracking.logService")}
        </Button>
        <PlanButton planned={action.planned_for} onPlan={onPlan} />
      </Group>
    </Box>
  );
}

// Plan, or the planned day in the same frame - the date is also the control.
function PlanButton({ planned, onPlan }: { planned: string | null; onPlan: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const passed = planned !== null && isPlanPassed(planned);

  return (
    <Button
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
        <Text fz={13} c="text.8" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
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
