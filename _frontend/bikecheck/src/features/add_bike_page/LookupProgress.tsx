// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useState, type ReactElement } from "react";
import { Paper, Progress, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { LookupPhase } from "./useLookupPhase";

type LookupKind = "search" | "collection" | "components";

interface LookupStage {
  fromMs: number;
  labelKey: string;
}

// The status line moves on with time; the last one keeps a slow lookup company.
const LOOKUPS: Record<LookupKind, { titleKey: string; stages: LookupStage[] }> = {
  search: {
    titleKey: "addBike.lookupSearchTitle",
    stages: [
      { fromMs: 0, labelKey: "addBike.lookupSearchConnecting" },
      { fromMs: 5_000, labelKey: "addBike.lookupSearchCatalogue" },
      { fromMs: 10_000, labelKey: "addBike.lookupSearchMatching" },
      { fromMs: 14_000, labelKey: "addBike.lookupSearchMore" },
      { fromMs: 18_000, labelKey: "addBike.lookupSearchSlow" },
    ],
  },
  collection: {
    titleKey: "addBike.lookupCollectionTitle",
    stages: [
      { fromMs: 0, labelKey: "addBike.lookupCollectionModels" },
      { fromMs: 5_000, labelKey: "addBike.lookupCollectionPhotos" },
      { fromMs: 18_000, labelKey: "addBike.lookupSlow" },
    ],
  },
  components: {
    titleKey: "addBike.lookupComponentsTitle",
    stages: [
      { fromMs: 0, labelKey: "addBike.lookupComponentsSpec" },
      { fromMs: 5_000, labelKey: "addBike.lookupComponentsMatching" },
      { fromMs: 18_000, labelKey: "addBike.lookupSlow" },
    ],
  },
};

// The lookup reports no progress, so the bar is a guess: ~90 % by 20 s, then it waits for the data.
const CEILING_PERCENT = 90;
const CEILING_MS = 20_000;
const TICK_MS = 200;

// Eased so the bar moves most in the first seconds, while the user decides whether to wait.
function estimatedPercent(elapsedMs: number): number {
  const remaining = 1 - Math.min(elapsedMs / CEILING_MS, 1);
  return CEILING_PERCENT * (1 - remaining ** 3);
}

function stageLabelKey(stages: LookupStage[], elapsedMs: number): string {
  return stages.findLast((stage) => stage.fromMs <= elapsedMs)?.labelKey ?? stages[0].labelKey;
}

// Counts from the panel's mount, not the request's start: the bar may finish early, never late.
function useElapsedMs(running: boolean): number {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), TICK_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  return elapsedMs;
}

interface LookupProgressProps {
  kind: LookupKind;
  // The searched bike or the opened collection, for the title.
  name?: string;
  phase: LookupPhase;
}

export function LookupProgress(props: LookupProgressProps): ReactElement {
  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <LookupProgressContent {...props} />
    </Paper>
  );
}

// Without the card, for a surface that already is one (the desktop modal).
export function LookupProgressContent({ kind, name, phase }: LookupProgressProps): ReactElement {
  const { t } = useTranslation();
  const { titleKey, stages } = LOOKUPS[kind];
  // The data is in: the bar runs to the end before the results take its place.
  const finished = phase === "finished";
  const elapsedMs = useElapsedMs(!finished);

  return (
    <Stack gap="sm">
      <Text fz={16} fw={600} c="text.6" ta="center">
        {t(titleKey, { name })}
      </Text>
      <Progress
        value={finished ? 100 : estimatedPercent(elapsedMs)}
        size="sm"
        radius="xl"
        transitionDuration={TICK_MS}
      />
      <Text fz={13} c="text.7" ta="center" aria-live="polite">
        {t(stageLabelKey(stages, elapsedMs))}
      </Text>
    </Stack>
  );
}
