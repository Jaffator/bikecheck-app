// What the bike still owes: every Tracked Action on it, worst first, the quiet ones
// included — work that is not urgent yet is what the owner plans around. Collapsed, only
// the quiet ones fall behind the fade. A component only talks to hooks — no fetch, no URL,
// no manual loading state.
import { useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { Box, Group, Paper, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import Bikecheck from "@/assets/icons/bikecheck/bikecheck.svg?react";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { TrackedActionRow } from "./TrackedActionRow";
import { useBikeTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

// How many rows stand in for the list while it is arriving.
const SKELETON_ROWS = 3;

// The fewest rows a collapsed card shows, whatever their levels say.
const MIN_VISIBLE_ROWS = 3;

// How much of the next row is left showing beneath them: its heading, and none of its
// figures — enough to say the list goes on, not enough to read.
const PEEK_HEIGHT = 28;

// How long the list takes to unroll.
const EXPAND_MS = 250;

// Dissolves the peeked row into the card rather than cutting it off.
const FADE_MASK = "linear-gradient(to bottom, black 0%, black 25%, transparent 100%)";

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

  // Keyed on the bike, so walking to the next one opens its list collapsed rather than
  // however the last one was left — the route keeps this component mounted across bikes.
  return (
    <SectionShell>
      <TrackedActionsList key={bikeId} actions={actions} />
    </SectionShell>
  );
}

// How much of the list a collapsed card shows: every row asking for something, and at least
// the first three. Only a reading the server calls good is worth putting behind a tap.
function visibleCount(actions: TrackedAction[]): number {
  const asking = actions.filter((action) => action.level !== "good").length;
  return Math.max(MIN_VISIBLE_ROWS, asking);
}

// The list, and how much of it the owner has asked to see.
function TrackedActionsList({ actions }: { actions: TrackedAction[] }): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [restHeight, setRestHeight] = useState(0);
  const restRef = useRef<HTMLDivElement>(null);

  const shown = visibleCount(actions);
  const rest = actions.slice(shown);

  // A max-height has to run to a number, and only the rows' own height is the right one.
  // Measured on every change to the list, since clipping them does not hide it.
  useLayoutEffect(() => {
    if (restRef.current === null) return;
    setRestHeight(restRef.current.scrollHeight);
  }, [actions]);

  // Nothing is being held back, so there is nothing to open.
  if (rest.length === 0) return <Stack gap="md">{actions.map(renderRow)}</Stack>;

  return (
    <Stack gap="md">
      <Stack gap="md">{actions.slice(0, shown).map(renderRow)}</Stack>

      <Box
        ref={restRef}
        style={{
          overflow: "hidden",
          maxHeight: open ? restHeight : PEEK_HEIGHT,
          transition: `max-height ${String(EXPAND_MS)}ms ease`,
          maskImage: open ? undefined : FADE_MASK,
          WebkitMaskImage: open ? undefined : FADE_MASK,
          // Half a row is not something to tap into — the strip below it is.
          pointerEvents: open ? undefined : "none",
        }}
      >
        <Stack gap="md">{rest.map(renderRow)}</Stack>
      </Box>

      <UnstyledButton
        onClick={() => {
          setOpen((opened) => !opened);
        }}
        aria-expanded={open}
        // Open, the arrow stands alone and has no text to be named by.
        aria-label={open ? t("tracking.showLess") : undefined}
        py={10}
        style={{ width: "100%" }}
      >
        <Group gap={6} justify="center" wrap="nowrap">
          <ChevronDown
            size={16}
            color="var(--color-text-dim)"
            style={{
              transform: open ? "rotate(180deg)" : undefined,
              transition: `transform ${String(EXPAND_MS)}ms ease`,
            }}
          />
          {!open && (
            <Text className="font-mono" fz={11} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
              {t("tracking.moreCount", { count: rest.length })}
            </Text>
          )}
        </Group>
      </UnstyledButton>
    </Stack>
  );
}

// Every row is about this bike, and it is already open - so no prefix, and nowhere to go.
function renderRow(action: TrackedAction): ReactElement {
  return <TrackedActionRow key={trackedActionKey(action)} action={action} prefix={null} onOpen={null} />;
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
          <Bikecheck width={16} height={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
          <Text fz={15} fw={600} c="text.6">
            {t("tracking.title")}
          </Text>
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}
