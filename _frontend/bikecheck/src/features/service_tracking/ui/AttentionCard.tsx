// What needs doing: every Tracked Action at 75% or above in one card, worst first, the
// phone's twin of the desktop JobsPanel. Nothing here notifies; a component only talks to hooks.
import { Fragment, useState, type ReactElement, type ReactNode } from "react";
import { Divider, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { DUE_FROM, trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { AttentionCount } from "./AttentionCount";
import { AttentionRow } from "./AttentionRow";
import { PlanSheet } from "./PlanSheet";
import { TrackedActionDrawer } from "./TrackedActionDrawer";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

// A long list must not push the rest of the page out of reach, so the tail waits behind one tap.
const LEAD_ROWS = 5;

interface AttentionCardProps {
  // Null reads as every bike. One garage read serves both, so Home and Service share a cache entry.
  bikeId: number | null;
  // What stands in when nothing needs doing. Left off, the card simply is not there.
  whenEmpty?: ReactNode;
}

export function AttentionCard({ bikeId, whenEmpty }: AttentionCardProps): ReactElement | null {
  const { t } = useTranslation();
  const { data: garage } = useGarageTrackedActions(DUE_FROM);
  const [opened, setOpened] = useState<TrackedAction | null>(null);
  const [planning, setPlanning] = useState<TrackedAction | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Not loaded yet says nothing either way, so neither the list nor the all-clear shows.
  if (!garage) return null;

  const actions = garage
    .filter((action) => bikeId === null || action.bike_id === bikeId)
    .sort((left, right) => right.percentage - left.percentage);
  if (actions.length === 0) return <>{whenEmpty ?? null}</>;

  const shown = expanded ? actions : actions.slice(0, LEAD_ROWS);
  const hidden = actions.length - shown.length;

  return (
    <>
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
            <Text fz={16} fw={600} c="text.6" lineClamp={1}>
              {t("tracking.needsAttention")}
            </Text>
            <AttentionCount count={actions.length} />
          </Group>

          {/* Each row opens the job's drawer (ADR 0032); the hairline keeps two jobs from reading as one. */}
          <Stack gap="sm">
            {shown.map((action, index) => (
              <Fragment key={trackedActionKey(action)}>
                {index > 0 && <Divider color="var(--mantine-color-inputs-5)" />}
                <AttentionRow
                  action={action}
                  onOpen={() => {
                    setOpened(action);
                  }}
                  onPlan={() => {
                    setPlanning(action);
                  }}
                />
              </Fragment>
            ))}
          </Stack>

          {actions.length > LEAD_ROWS && (
            <UnstyledButton
              onClick={() => {
                setExpanded(!expanded);
              }}
            >
              <Text className="tabular-nums" fz={11} tt="uppercase" c="primary.6" lts="var(--tracking-label)">
                {expanded ? t("tracking.showLess") : t("tracking.showRemaining", { value: hidden })}
              </Text>
            </UnstyledButton>
          )}
        </Stack>
      </Paper>

      <TrackedActionDrawer
        action={opened}
        onClose={() => {
          setOpened(null);
        }}
      />
      <PlanSheet
        action={planning}
        onClose={() => {
          setPlanning(null);
        }}
      />
    </>
  );
}
