// One Tracked Action as the phone lists it: the job and what is left of it, the line, which bike,
// and the plan the owner can set without opening it.
import type { ReactElement } from "react";
import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { onPanelRowKey } from "@/components/panelRows";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor, attentionInk } from "@/features/service_tracking/attentionLevel";
import { attentionFigure } from "@/features/service_tracking/intervalFigures";
import type { GarageTrackedAction } from "@/features/service_tracking/tracking.types";
import { BulletBar } from "./BulletBar";
import { PlanDayButton } from "./PlanDayButton";

// Fits the Czech "Naplánovat", so every row's line ends at the same place.
const PLAN_WIDTH = 84;

interface AttentionRowProps {
  action: GarageTrackedAction;
  onOpen: () => void;
  onPlan: () => void;
}

export function AttentionRow({ action, onOpen, onPlan }: AttentionRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const ink = attentionInk(action);

  // A div rather than a <button>: the plan button sits inside, and buttons cannot nest.
  return (
    <UnstyledButton
      component="div"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onPanelRowKey(event, onOpen)}
      className="hover-veil active:scale-[0.985]"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        columnGap: 16,
        width: "100%",
        transition: "transform 0.12s ease",
      }}
    >
      <Stack gap={7} style={{ minWidth: 0 }}>
        <Group gap="sm" wrap="nowrap" align="baseline">
          <Text fz={14} fw={600} c="text.6" lineClamp={2} style={{ minWidth: 0, flex: 1 }}>
            {catalogueLabel(action.action_i18n_key, action.action_name, t)}
          </Text>
          <Text className="tabular-nums" fz={13} fw={600} c={ink} style={{ whiteSpace: "nowrap" }}>
            {attentionFigure(action, i18n.language, t)}
          </Text>
        </Group>

        <BulletBar percentage={action.percentage} color={attentionColor(action.percentage)} />

        <Text fz={12} c="text.8" lineClamp={1}>
          {bikeTitle(action)}
        </Text>
      </Stack>

      <PlanDayButton planned={action.planned_for} onPlan={onPlan} width={PLAN_WIDTH} />
    </UnstyledButton>
  );
}
