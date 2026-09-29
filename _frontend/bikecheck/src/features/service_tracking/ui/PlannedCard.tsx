// What is booked: every planned Tracked Action, soonest day first, so a missed one leads (ADR 0038).
// Follows the bike chips and is not there when nothing is planned.
import { Fragment, useState, type ReactElement } from "react";
import { Divider, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { onPanelRowKey } from "@/components/panelRows";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { catalogueLabel } from "@/features/service/serviceLabels";
import {
  EVERY_READING,
  attentionColor,
  trackedActionKey,
  trackedPartLabel,
} from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";
import { PlanDayButton } from "./PlanDayButton";
import { PlanSheet } from "./PlanSheet";
import { TrackedActionDrawer } from "./TrackedActionDrawer";

// Wide enough for the longest day label, so the Actions beside the days line up.
const DAY_WIDTH = 96;

type PlannedAction = GarageTrackedAction & { planned_for: string };

interface PlannedCardProps {
  // Null reads as every bike.
  bikeId: number | null;
}

export function PlannedCard({ bikeId }: PlannedCardProps): ReactElement {
  const { t } = useTranslation();
  const { data: garage } = useGarageTrackedActions(EVERY_READING);
  const [opened, setOpened] = useState<TrackedAction | null>(null);
  const [planning, setPlanning] = useState<TrackedAction | null>(null);

  const planned = soonestFirst((garage ?? []).filter((action) => bikeId === null || action.bike_id === bikeId));

  // The drawer and the sheet outlive the card, so removing the last plan does not snatch them away.
  return (
    <>
      {planned.length > 0 && (
        <Paper
          radius="lg"
          p="md"
          style={{
            overflow: "hidden",
            backgroundColor: "var(--mantine-color-cards-6)",
            backgroundImage: "var(--card-glow)",
            border: "none",
            boxShadow: "var(--elev-panel)",
          }}
        >
          <Stack gap="md">
            <Group gap={8} wrap="nowrap">
              <CalendarDays size={16} color="var(--color-text-dim)" />
              <Text fz={13} fw={600} c="text.6">
                {t("tracking.planned")} ({planned.length})
              </Text>
            </Group>

            <Stack gap="sm">
              {planned.map((action, index) => (
                <Fragment key={trackedActionKey(action)}>
                  {index > 0 && <Divider color="var(--mantine-color-inputs-5)" />}
                  <PlannedRow action={action} onOpen={() => setOpened(action)} onPlan={() => setPlanning(action)} />
                </Fragment>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      <TrackedActionDrawer action={opened} onClose={() => setOpened(null)} />
      <PlanSheet action={planning} onClose={() => setPlanning(null)} />
    </>
  );
}

// By day, so passed plans lead; on one day the more worn one first.
function soonestFirst(actions: GarageTrackedAction[]): PlannedAction[] {
  return actions
    .filter((action): action is PlannedAction => action.planned_for !== null)
    .sort((one, other) => one.planned_for.localeCompare(other.planned_for) || other.percentage - one.percentage);
}

// A div rather than a <button>, since the day inside it is a button of its own - and so it does not press.
function PlannedRow({
  action,
  onOpen,
  onPlan,
}: {
  action: PlannedAction;
  onOpen: () => void;
  onPlan: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();

  return (
    <UnstyledButton
      component="div"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onPanelRowKey(event, onOpen)}
      className="hover-veil"
      style={{ display: "block", width: "100%" }}
    >
      <Group gap="sm" wrap="nowrap" align="center">
        <PlanDayButton planned={action.planned_for} onPlan={onPlan} width={DAY_WIDTH} />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
            <Text span inherit fw={600} c="text.6">
              {catalogueLabel(action.action_i18n_key, action.action_name, t)}
            </Text>
            {` · ${trackedPartLabel(action, t)}`}
          </Text>
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <BikeColorDot colorIndex={colorIndexOf(bikes, action.bike_id)} size={6} />
            <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
              {bikeTitle(action)}
            </Text>
          </Group>
        </Stack>
        <Text className="font-mono" fz={13} c={attentionColor(action.percentage)} style={{ whiteSpace: "nowrap" }}>
          {t("tracking.percentage", { value: action.percentage })}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
