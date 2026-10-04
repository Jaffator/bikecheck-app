// One Tracked Action as the phone lists it, the desktop row stacked: the job and its bike,
// how far it has come against the interval, and the plan the owner can set without opening it.
import type { ReactElement } from "react";
import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { onPanelRowKey } from "@/components/panelRows";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor } from "@/features/service_tracking/attentionLevel";
import { remainingLabel } from "@/features/service_tracking/intervalFigures";
import type { GarageTrackedAction } from "@/features/service_tracking/tracking.types";
import { BulletBar } from "./BulletBar";
import { PlanDayButton } from "./PlanDayButton";

interface AttentionRowProps {
  action: GarageTrackedAction;
  onOpen: () => void;
  onPlan: () => void;
}

export function AttentionRow({ action, onOpen, onPlan }: AttentionRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: bikes } = useBikes();
  const color = attentionColor(action.percentage);

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
        display: "block",
        width: "100%",
        transition: "transform 0.12s ease",
      }}
    >
      <Stack gap={8}>
        <Stack gap={2}>
          {/* The chevron says the row opens; the desktop row has the hover for that. */}
          <Group gap="sm" wrap="nowrap" align="center">
            <Text fz={13} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0, flex: 1 }}>
              {catalogueLabel(action.action_i18n_key, action.action_name, t)}
            </Text>
            <Text className="tabular-nums" fz={13} fw={600} c={color} style={{ whiteSpace: "nowrap" }}>
              {t("tracking.percentage", { value: action.percentage })}
            </Text>
            <ChevronRight size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
          </Group>

          <Group gap="sm" wrap="nowrap" align="center">
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
              <BikeColorDot colorIndex={colorIndexOf(bikes, action.bike_id)} size={6} />
              <Text fz={12} c="var(--color-text-dim)" lineClamp={1} style={{ minWidth: 0 }}>
                {bikeTitle(action)}
              </Text>
            </Group>
            <Text className="tabular-nums" fz={12} c="var(--color-text-dim)" style={{ whiteSpace: "nowrap" }}>
              {remainingLabel(action, i18n.language, t)}
            </Text>
          </Group>
        </Stack>

        <BulletBar percentage={action.percentage} color={color} />

        <Group>
          <PlanDayButton planned={action.planned_for} onPlan={onPlan} />
        </Group>
      </Stack>
    </UnstyledButton>
  );
}
