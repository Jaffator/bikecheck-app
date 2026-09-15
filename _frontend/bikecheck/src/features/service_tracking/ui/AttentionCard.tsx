// What needs doing: every Tracked Action at 70% or above, in one flat list worst first —
// across the garage, or on the one bike the page is narrowed to. A place the owner goes
// rather than something that interrupts them — nothing here notifies. A component only
// talks to hooks.
import { useState, type ReactElement, type ReactNode } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Wrench } from "lucide-react";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { trackedActionServiceLink } from "@/features/service_tracking/serviceLink";
import { TrackedActionRow } from "./TrackedActionRow";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";

// What the card asks the server for. 70 is the band the server calls warning — the point
// at which a job is on the horizon, and the first the owner hears of it.
const CUTOFF = 70;

// How many rows the card leads with. A neglected fleet must not bury everything below it,
// so the rest waits behind one tap.
const LEAD_ROWS = 3;

interface AttentionCardProps {
  // Null reads as every bike. One garage read serves both, narrowed here rather than on
  // the server, so the dashboard and a bike's page share one cache entry.
  bikeId: number | null;
  // What stands in when nothing needs doing. Left off, the card simply is not there.
  whenEmpty?: ReactNode;
}

export function AttentionCard({ bikeId, whenEmpty }: AttentionCardProps): ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: garage } = useGarageTrackedActions(CUTOFF);
  const [expanded, setExpanded] = useState(false);

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

        <Stack gap="md">
          {shown.map((action) => (
            // The garage list is flat, so every row names the bike it belongs to; a list
            // narrowed to one bike already says which. Opening a row records the job, not
            // the bike: the wizard opens with this very job ticked (ADR 0030).
            <TrackedActionRow
              key={trackedActionKey(action)}
              action={action}
              prefix={bikeId === null ? bikeTitle(action) : null}
              onOpen={() => {
                navigate(trackedActionServiceLink(action));
              }}
            />
          ))}
        </Stack>

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
      </Stack>
    </Paper>
  );
}
