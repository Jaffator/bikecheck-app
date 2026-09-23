// What needs doing: every Tracked Action at 75% or above, in one flat list worst first —
// across the garage, or on the one bike the page is narrowed to. A place the owner goes
// rather than something that interrupts them — nothing here notifies. A component only
// talks to hooks.
import { useState, type ReactElement, type ReactNode } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { TrackedActionDrawer } from "./TrackedActionDrawer";
import { TrackedActionRow } from "./TrackedActionRow";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction } from "@/features/service_tracking/tracking.types";

// What the card asks the server for. 75 is the level the server calls warning — the point
// at which a job is on the horizon, and the first the owner hears of it.
const CUTOFF = 75;

// How many rows the card leads with. A neglected fleet must not bury everything below it,
// so the rest waits behind one tap.
const LEAD_ROWS = 3;

// The garage list gathered under its bikes, in the order the bikes first appear - which is
// worst first, since the list is. The bike is named once over its rows instead of on every
// meta line, which is what left no room for the part.
function groupByBike(
  actions: GarageTrackedAction[],
): { bikeId: number; title: string; actions: GarageTrackedAction[] }[] {
  const groups: { bikeId: number; title: string; actions: GarageTrackedAction[] }[] = [];
  for (const action of actions) {
    const group = groups.find((entry) => entry.bikeId === action.bike_id);
    if (group) group.actions.push(action);
    else groups.push({ bikeId: action.bike_id, title: bikeTitle(action), actions: [action] });
  }
  return groups;
}

interface AttentionCardProps {
  // Null reads as every bike. One garage read serves both, narrowed here rather than on
  // the server, so the dashboard and a bike's page share one cache entry.
  bikeId: number | null;
  // What stands in when nothing needs doing. Left off, the card simply is not there.
  whenEmpty?: ReactNode;
}

export function AttentionCard({ bikeId, whenEmpty }: AttentionCardProps): ReactElement | null {
  const { t } = useTranslation();
  const { data: garage } = useGarageTrackedActions(CUTOFF);
  const [expanded, setExpanded] = useState(false);
  // The reading the drawer is open on, or null while it is closed.
  const [opened, setOpened] = useState<GarageTrackedAction | null>(null);

  // Not loaded yet says nothing either way, so neither the list nor the all-clear shows.
  if (!garage) return null;

  const actions = bikeId === null ? garage : garage.filter((action) => action.bike_id === bikeId);
  if (actions.length === 0) return <>{whenEmpty ?? null}</>;

  const shown = expanded ? actions : actions.slice(0, LEAD_ROWS);
  const hidden = actions.length - shown.length;

  return (
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
          <Wrench size={16} color="var(--color-text-dim)" />
          <Text fz={13} fw={600} c="text.6">
            {t("tracking.needsAttention")} ({actions.length})
          </Text>
        </Group>

        {/* A list narrowed to one bike already says which; the garage list names each bike
            once, as an eyebrow over its rows. A row opens the drawer for the job it names,
            the same one the bike's own page opens (ADR 0032). */}
        {bikeId === null ? (
          <Stack gap="lg">
            {groupByBike(shown).map((group) => (
              <Stack key={group.bikeId} gap="sm">
                <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lts="0.08em" lineClamp={1}>
                  {group.title}
                </Text>
                <Stack gap="md">
                  {group.actions.map((action) => (
                    <TrackedActionRow
                      key={trackedActionKey(action)}
                      action={action}
                      prefix={null}
                      onOpen={() => {
                        setOpened(action);
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Stack gap="md">
            {shown.map((action) => (
              <TrackedActionRow
                key={trackedActionKey(action)}
                action={action}
                prefix={null}
                onOpen={() => {
                  setOpened(action);
                }}
              />
            ))}
          </Stack>
        )}

        {/* The way to the rest, and back. Only shown while there is a rest to reach. */}
        {actions.length > LEAD_ROWS && (
          <UnstyledButton
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            <Text className="font-mono" fz={11} tt="uppercase" c="primary.6" lts="0.08em">
              {expanded ? t("tracking.showLess") : t("tracking.showRemaining", { value: hidden })}
            </Text>
          </UnstyledButton>
        )}

        <TrackedActionDrawer
          action={opened}
          onClose={() => {
            setOpened(null);
          }}
        />
      </Stack>
    </Paper>
  );
}
