// What the whole garage needs doing: every Tracked Action at 80% or above, on any bike in
// use, in one flat list worst first. A place the owner goes rather than something that
// interrupts them — nothing here notifies. A component only talks to hooks.
import { useState, type ReactElement } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Wrench } from "lucide-react";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { trackedActionKey } from "./attentionLevel";
import { TrackedActionRow } from "./TrackedActionRow";
import { useGarageTrackedActions } from "./tracking.queries";

// What the dashboard asks the server for. 80 is the band the server calls warning — the
// point at which a reading becomes worth showing, not worth interrupting for.
const DASHBOARD_CUTOFF = 80;

// How many rows the dashboard leads with. A neglected fleet must not bury everything below
// it, so the rest waits behind one tap.
const LEAD_ROWS = 3;

export function AttentionDashCard(): ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: actions } = useGarageTrackedActions(DASHBOARD_CUTOFF);
  const [expanded, setExpanded] = useState(false);

  // Nothing to answer for, nothing to render: no empty shell on a dashboard that is
  // otherwise telling the owner something.
  if (!actions || actions.length === 0) return null;

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
            // The list is flat across the garage, so every row names the bike it belongs
            // to and opening it lands there.
            <TrackedActionRow
              key={trackedActionKey(action)}
              action={action}
              prefix={bikeTitle(action)}
              onOpen={() => {
                navigate(`/bikes/${String(action.bike_id)}`);
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
