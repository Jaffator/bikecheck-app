// One Tracked Action as the dashboard reads it: the job, how far it has come, and the one
// thing the owner can do about it without opening anything. Shorter than the row on a
// bike's own page on purpose — the dashboard lists work across the garage, so what it owes
// each row is a glance, not the figures behind the reading.
import type { ReactElement } from "react";
import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AlertCircle, AlertTriangle, ChevronRight, OctagonAlert } from "lucide-react";
import { onPanelRowKey } from "@/components/panelRows";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor } from "@/features/service_tracking/attentionLevel";
import { axisUnit, axisValue, remainingWear } from "@/features/service_tracking/intervalFigures";
import type { AttentionLevel, TrackedAction } from "@/features/service_tracking/tracking.types";
import { PlanDayButton } from "./PlanDayButton";

// The level said again in a shape, so a row is readable without its colour. Only the three
// levels the dashboard lists are drawn; nothing quieter ever reaches this row.
const LEVEL_ICON: Record<AttentionLevel, typeof AlertCircle> = {
  very_good: AlertCircle,
  good: AlertCircle,
  warning: AlertCircle,
  critical: AlertTriangle,
  overdue: OctagonAlert,
};

interface AttentionRowProps {
  action: TrackedAction;
  onOpen: () => void;
  onPlan: () => void;
}

export function AttentionRow({ action, onOpen, onPlan }: AttentionRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const color = attentionColor(action.percentage);
  const Icon = LEVEL_ICON[action.level];

  const job = catalogueLabel(action.action_i18n_key, action.action_name, t);
  const remaining = remainingLabel(action, i18n.language, t);

  // The row carries the tap as a div rather than as a <button>, since the plan button
  // sits inside it and a button within a button is not valid markup. It keeps the keyboard
  // by declaring what it is: a control that answers to Enter and to Space.
  return (
    <UnstyledButton
      component="div"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onPanelRowKey(event, onOpen)}
      className="hover-veil active:scale-[0.985]"
      style={{ display: "block", width: "100%", transition: "transform 0.12s ease" }}
    >
      <Stack gap={8}>
        {/* What the job is and how far it has come, with the way into it. */}
        <Group gap="sm" wrap="nowrap" align="center">
          <Icon size={14} color={color} style={{ flexShrink: 0 }} />
          <Text fz={13} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0, flex: 1 }}>
            {job}
          </Text>
          <Text className="tabular-nums" fz={12} c={color} style={{ whiteSpace: "nowrap" }}>
            {t("tracking.percentage", { value: action.percentage })}
          </Text>
          <ChevronRight size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
        </Group>

        {/* The plan the row carries, and what the reading leaves. A wear index has no
            unit an owner could hold, so it says nothing rather than a figure that means
            nothing. */}
        <Group gap="sm" wrap="nowrap" align="center">
          <PlanDayButton planned={action.planned_for} onPlan={onPlan} />
          <Text
            className="tabular-nums"
            fz={11}
            tt="uppercase"
            c="text.8"
            lts="var(--tracking-label)"
            lineClamp={1}
            ml="auto"
            style={{ minWidth: 0 }}
          >
            {remaining}
          </Text>
        </Group>
      </Stack>
    </UnstyledButton>
  );
}

// What is left before the job is due, in the unit the reading is taken in. Past due there
// is nothing left, so the figure turns around and says how far over instead — "Zbývá 0 km"
// would be true and useless. Empty on a wear index, which has no unit to say it in.
function remainingLabel(action: TrackedAction, language: string, translate: (key: string) => string): string {
  if (action.axis === "health_index") return "";

  const unit = axisUnit(action.axis);
  const over = action.current - action.interval;
  if (over > 0) return `+${axisValue(action.axis, over, language)} ${unit}`.trim();

  return `${translate("tracking.remaining")} ${axisValue(action.axis, remainingWear(action), language)} ${unit}`.trim();
}
