// What the bike still owes: every Tracked Action on it, worst first, the quiet ones
// included — work that is not urgent yet is what the owner plans around. A component only
// talks to hooks — no fetch, no URL, no manual loading state.
import { Fragment, type ReactElement } from "react";
import { Divider, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { TrackedActionRow } from "@/features/service_tracking/TrackedActionRow";
import { useBikeTrackedActions } from "@/features/service_tracking/tracking.queries";

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
      <Stack gap="sm">
        {actions.map((action, index) => (
          // Every row is about this bike, and it is already open - so no prefix, and
          // nowhere to go. A hairline between them, never after the last.
          <Fragment key={trackedActionKey(action)}>
            {index > 0 && <Divider color="var(--color-border-subtle)" />}
            <TrackedActionRow action={action} prefix={null} onOpen={null} />
          </Fragment>
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
