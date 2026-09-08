// What the bike still owes: every Tracked Action on it, worst first, the quiet ones
// included — work that is not urgent yet is what the owner plans around. A component only
// talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Group, Paper, Progress, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { positionLabel } from "@/features/components/componentLabels";
import { ATTENTION_COLORS, axisReading, barFill } from "@/features/service_tracking/attentionLevel";
import { useBikeTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

// How many rows stand in for the list while it is arriving.
const SKELETON_ROWS = 3;

interface TrackedActionsSectionProps {
  bikeId: number;
}

export function TrackedActionsSection({ bikeId }: TrackedActionsSectionProps): ReactElement | null {
  const { t } = useTranslation();
  const { data: actions, isLoading, isError } = useBikeTrackedActions(bikeId);

  if (isLoading) {
    return (
      <SectionShell>
        <Stack gap="md">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} h={34} radius="sm" />
          ))}
        </Stack>
      </SectionShell>
    );
  }

  if (isError) {
    return (
      <SectionShell>
        <Text fz={12} c="red.5">
          {t("tracking.loadFailed")}
        </Text>
      </SectionShell>
    );
  }

  // A bike the app can say nothing about gets no empty shell: an Archived Bike, a bike with
  // no parts on it, or one whose plan covers nothing it carries.
  if (!actions || actions.length === 0) return null;

  return (
    <SectionShell>
      <Stack gap="md">
        {actions.map((action) => (
          <TrackedActionRow key={`${String(action.component_mounted_id)}-${String(action.event_action_id)}`} action={action} />
        ))}
      </Stack>
    </SectionShell>
  );
}

// The section's own surface and heading, which every state of it wears.
function SectionShell({ children }: { children: ReactElement }): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        boxShadow: "var(--elev-row)",
      }}
    >
      <Stack gap="md">
        <Group gap={8} wrap="nowrap">
          <Wrench size={16} color="var(--color-text-dim)" />
          <Text fz={13} fw={600} c="text.6">
            {t("tracking.title")}
          </Text>
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}

// One Tracked Action: the part and the job on top, the percentage beside them, and the
// figures the percentage came from underneath.
function TrackedActionRow({ action }: { action: TrackedAction }): ReactElement {
  const { t, i18n } = useTranslation();
  const color = ATTENTION_COLORS[action.level];
  const side = positionLabel(action.position, t);
  const part = catalogueLabel(action.component_type_i18n_key, action.component_type, t);

  return (
    <Stack gap={6}>
      <Group gap="sm" wrap="nowrap" align="baseline">
        <Text fz={13} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0 }}>
          {side === null ? part : `${part} (${side})`}
        </Text>
        <Text
          className="font-mono"
          fz={12}
          c={color}
          ml="auto"
          style={{ whiteSpace: "nowrap" }}
        >
          {t("tracking.percentage", { value: action.percentage })}
        </Text>
      </Group>

      <Progress
        value={barFill(action) * 100}
        size={5}
        radius="xl"
        styles={{
          root: { backgroundColor: "var(--color-decor)" },
          section: { backgroundColor: color },
        }}
      />

      <Group gap="sm" wrap="nowrap" align="baseline">
        <Text
          className="font-mono"
          fz={11}
          tt="uppercase"
          c="var(--color-text-dim)"
          lts="0.08em"
          lineClamp={1}
          style={{ minWidth: 0 }}
        >
          {catalogueLabel(action.action_i18n_key, action.action_name, t)}
        </Text>
        <Text
          className="font-mono"
          fz={11}
          tt="uppercase"
          c="var(--color-text-dim)"
          lts="0.08em"
          ml="auto"
          style={{ whiteSpace: "nowrap" }}
        >
          {axisReading(action, i18n.language)}
        </Text>
      </Group>
    </Stack>
  );
}
