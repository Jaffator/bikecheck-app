// What needs doing: every Tracked Action at 75% or above, one card per bike, worst bike
// first. A place the owner goes rather than something that interrupts them — nothing here
// notifies. A component only talks to hooks.
//
// One card per bike rather than one list under bike headings: the garage's work only reads
// as an overview when each machine has an edge of its own.
import { Fragment, useState, type ReactElement, type ReactNode } from "react";
import { Divider, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { AttentionRow } from "./AttentionRow";
import { TrackedActionDrawer } from "./TrackedActionDrawer";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction, TrackedAction } from "@/features/service_tracking/tracking.types";

// What the card asks the server for. 75 is the level the server calls warning — the point
// at which a job is on the horizon, and the first the owner hears of it.
const CUTOFF = 75;

// How many rows one card leads with. A neglected bike must not bury the ones below it, so
// the rest of its list waits behind one tap.
const LEAD_ROWS = 3;

// The garage list gathered under its bikes, in the order the bikes first appear — which is
// worst first, since the list is.
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
  // The reading the drawer is open on, or null while it is closed. Held here rather than
  // per card, so however many cards stand there is only ever one sheet.
  const [opened, setOpened] = useState<TrackedAction | null>(null);

  // Not loaded yet says nothing either way, so neither the list nor the all-clear shows.
  if (!garage) return null;

  const actions = bikeId === null ? garage : garage.filter((action) => action.bike_id === bikeId);
  if (actions.length === 0) return <>{whenEmpty ?? null}</>;

  const drawer = (
    <TrackedActionDrawer
      action={opened}
      onClose={() => {
        setOpened(null);
      }}
    />
  );

  // Narrowed to one bike, the page already says which — so the card keeps the heading it
  // has always worn and names no bike.
  if (bikeId !== null) {
    return (
      <>
        <AttentionPaper
          heading={
            <Group gap={8} wrap="nowrap">
              <Wrench size={16} color="var(--color-text-dim)" />
              <Text fz={13} fw={600} c="text.6">
                {t("tracking.needsAttention")} ({actions.length})
              </Text>
            </Group>
          }
          actions={actions}
          onOpen={setOpened}
        />
        {drawer}
      </>
    );
  }

  // The cards carry their own air between them, so a caller can drop the list anywhere
  // without knowing it is a list.
  return (
    <Stack gap="md">
      {groupByBike(actions).map((group) => (
        <AttentionPaper
          key={group.bikeId}
          heading={
            <Text fz={14} fw={600} c="text.6" lineClamp={1}>
              {group.title} ({group.actions.length})
            </Text>
          }
          actions={group.actions}
          onOpen={setOpened}
        />
      ))}
      {drawer}
    </Stack>
  );
}

// One card: its heading, the rows it leads with, and the way to the rest of them.
function AttentionPaper({
  heading,
  actions,
  onOpen,
}: {
  heading: ReactNode;
  actions: GarageTrackedAction[];
  onOpen: (action: TrackedAction) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

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
        {heading}

        {/* A row opens the drawer for the job it names, the same one the bike's own page
            opens (ADR 0032). A hairline between them is what keeps two jobs on one bike from
            reading as one — the air alone was not enough once the bar was gone. */}
        <Stack gap="sm">
          {shown.map((action, index) => (
            <Fragment key={trackedActionKey(action)}>
              {index > 0 && <Divider color="var(--mantine-color-inputs-5)" />}
              <AttentionRow
                action={action}
                onOpen={() => {
                  onOpen(action);
                }}
              />
            </Fragment>
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
