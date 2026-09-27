// Desktop Home's table of work waiting, worst first; a row opens the Tracked Action drawer.
import { useState, type ReactElement } from "react";
import { Box, Button, Center, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, Check, OctagonAlert, Wrench } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelSkeletonRows, PanelTableHead } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, onPanelRowKey } from "@/components/panelRows";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { positionLabel } from "@/features/components/componentLabels";
import { catalogueLabel } from "@/features/service/serviceLabels";
import {
  DUE_FROM,
  QUIET_COLOR,
  attentionColor,
  trackedActionKey,
} from "@/features/service_tracking/attentionLevel";
import { axisUnit, axisValue, remainingWear } from "@/features/service_tracking/intervalFigures";
import { trackedActionServiceLink } from "@/features/service_tracking/serviceLink";
import { useGarageTrackedActions, usePostponeTrackedAction } from "@/features/service_tracking/tracking.queries";
import type { AttentionLevel, GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";
import { TrackedActionDrawer } from "./TrackedActionDrawer";

const JOB_COLUMNS = "minmax(0, 1.7fr) minmax(0, 1fr) 150px 52px 96px";

// The bar runs past the interval, so an overdue job reads beyond the mark rather than stopping at it.
const BULLET_MAX = 125;

const LEVEL_ICON: Record<AttentionLevel, typeof AlertCircle> = {
  very_good: AlertCircle,
  good: AlertCircle,
  warning: AlertCircle,
  critical: AlertTriangle,
  overdue: OctagonAlert,
};

export function JobsPanel(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: due } = useGarageTrackedActions(DUE_FROM);
  const [opened, setOpened] = useState<TrackedAction | null>(null);

  const rows = [...(due ?? [])].sort((left, right) => right.percentage - left.percentage);

  return (
    <Panel
      title={t("tracking.needsAttention")}
      count={due?.length}
      link={{ label: t("page.service"), onClick: () => navigate("/service") }}
    >
      {due === undefined && <PanelSkeletonRows count={4} />}
      {due !== undefined && rows.length === 0 && <AllGood />}
      {rows.length > 0 && (
        <>
          <PanelTableHead
            columns={JOB_COLUMNS}
            cells={[
              t("tracking.columnJob"),
              t("tracking.columnBike"),
              t("tracking.columnStatus"),
              "%",
              t("tracking.remaining"),
            ]}
            rightAligned={[3, 4]}
          />
          {rows.map((action) => (
            <JobRow key={trackedActionKey(action)} action={action} onOpen={() => setOpened(action)} />
          ))}
        </>
      )}
      <TrackedActionDrawer action={opened} onClose={() => setOpened(null)} />
    </Panel>
  );
}

// Carries its own buttons, so it does not press - docs/ui/card-surface.md.
function JobRow({ action, onOpen }: { action: GarageTrackedAction; onOpen: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const postpone = usePostponeTrackedAction();
  const color = attentionColor(action.percentage);
  const Icon = LEVEL_ICON[action.level];

  const job = catalogueLabel(action.action_i18n_key, action.action_name, t);
  const type = catalogueLabel(action.component_type_i18n_key, action.component_type, t);
  const side = positionLabel(action.position, t);
  const part = side === null ? type : `${type} (${side})`;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onPanelRowKey(event, onOpen)}
      className="group hover-veil"
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: JOB_COLUMNS,
        alignItems: "center",
        gap: 16,
        padding: PANEL_ROW_PADDING,
        borderTop: PANEL_HAIRLINE,
      }}
    >
      <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
        <Icon size={15} color={color} style={{ flexShrink: 0 }} />
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={13} fw={600} c="text.6" lineClamp={1}>
            {job}
          </Text>
          <Eyebrow>{part}</Eyebrow>
        </Stack>
      </Group>
      <Text fz={13} c="text.7" lineClamp={1}>
        {bikeTitle(action)}
      </Text>
      <BulletBar percentage={action.percentage} color={color} />
      <Text className="font-mono" fz={13} fw={600} c={color} ta="right">
        {t("tracking.percentage", { value: action.percentage })}
      </Text>
      <Text className="font-mono" fz={13} c="var(--color-text-dim)" ta="right" lineClamp={1}>
        {postpone.isError ? t("tracking.postponeFailed") : remainingLabel(action, i18n.language)}
      </Text>

      {/* Row actions over the last column, the way a mail list shows them on hover; the row
          itself still opens the drawer, which is how a finger reaches both. */}
      <Group
        gap={6}
        wrap="nowrap"
        className="invisible group-hover:visible group-focus-within:visible"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 16,
          paddingLeft: 28,
          background: "linear-gradient(to right, transparent, var(--mantine-color-cards-6) 22px)",
        }}
      >
        <Button
          variant="outline"
          size="compact-xs"
          radius="sm"
          loading={postpone.isPending}
          onClick={(event) => {
            event.stopPropagation();
            postpone.mutate({
              component_mounted_id: action.component_mounted_id,
              event_action_id: action.event_action_id,
            });
          }}
        >
          {t("tracking.postpone")}
        </Button>
        <Button
          variant="outline"
          size="compact-xs"
          radius="sm"
          leftSection={<Wrench size={12} color="var(--mantine-color-primary-5)" />}
          onClick={(event) => {
            event.stopPropagation();
            navigate(trackedActionServiceLink(action));
          }}
        >
          {t("tracking.log")}
        </Button>
      </Group>
    </Box>
  );
}

// A job read against its interval: the mark is the interval, the fill how far the part has come.
function BulletBar({ percentage, color }: { percentage: number; color: string }): ReactElement {
  const fill = (Math.min(percentage, BULLET_MAX) / BULLET_MAX) * 100;
  const mark = (100 / BULLET_MAX) * 100;

  return (
    <Box aria-hidden pos="relative" h={6} style={{ borderRadius: 9999, backgroundColor: "var(--color-decor-sunk)" }}>
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

// What is left before the job is due, or how far past it the part has run.
function remainingLabel(action: TrackedAction, language: string): string {
  if (action.axis === "health_index") return "";
  const unit = axisUnit(action.axis);
  const over = action.current - action.interval;
  if (over > 0) return `+${axisValue(action.axis, over, language)} ${unit}`;
  return `${axisValue(action.axis, remainingWear(action), language)} ${unit}`;
}

function AllGood(): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap="sm" wrap="nowrap" p="md" style={{ borderTop: PANEL_HAIRLINE }}>
      <Center w={32} h={32} style={{ flexShrink: 0, borderRadius: 9999, backgroundColor: `${QUIET_COLOR}1A` }}>
        <Check size={16} color={QUIET_COLOR} strokeWidth={2.5} />
      </Center>
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text fz={13} fw={600} c="text.6">
          {t("tracking.allGoodTitle")}
        </Text>
        <Text fz={13} c="var(--color-text-dim)">
          {t("tracking.allGoodBody")}
        </Text>
      </Stack>
    </Group>
  );
}
