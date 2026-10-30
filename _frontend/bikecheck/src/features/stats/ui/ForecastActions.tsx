// One bike's Tracked Actions as chips, soonest first, over the chosen one's reading; keyed by the bike, so a new bike opens on its first.
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { Box, Group, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { BikeFilterChip } from "@/features/bikes/ui/BikeFilterChip";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor, QUIET_BELOW, trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { remainingLabel } from "@/features/service_tracking/intervalFigures";
import type { WearForecastItem } from "../stats.types";
import { forecastNote, missingEstimate } from "../wearForecast";
import { ForecastChart } from "./ForecastChart";
import { HOME_FIGURE_SIZE } from "./HomeCardHeader";

// The card's md padding: the chip row runs into it and fades there, so a cut chip says there are more.
const EDGE = 16;
const EDGE_FADE = `linear-gradient(to right, black calc(100% - ${String(EDGE)}px), transparent)`;
const EDGE_FADE_STYLE: CSSProperties = { maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE };
// Room around the body, so its hover veil does not end flush with the chart.
const VEIL_ROOM = 8;

interface ForecastActionsProps {
  items: WearForecastItem[];
  onOpen: (item: WearForecastItem) => void;
}

export function ForecastActions({ items, onOpen }: ForecastActionsProps): ReactElement {
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  // A refetch can drop the chosen action, so the soonest stands in.
  const chosen = items.find((item) => trackedActionKey(item) === chosenKey) ?? items[0];

  return (
    <Stack gap="md">
      <ActionChips items={items} chosen={chosen} onPick={(item) => setChosenKey(trackedActionKey(item))} />
      <ForecastReading item={chosen} onOpen={() => onOpen(chosen)} />
    </Stack>
  );
}

// A very good reading warns of nothing, so it gets no dot and neutral words; the chart still draws it green.
function warningColor(item: WearForecastItem): string | undefined {
  return item.percentage < QUIET_BELOW ? undefined : attentionColor(item.percentage);
}

interface ActionChipsProps {
  items: WearForecastItem[];
  chosen: WearForecastItem;
  onPick: (item: WearForecastItem) => void;
}

function ActionChips({ items, chosen, onPick }: ActionChipsProps): ReactElement {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const chosenKey = trackedActionKey(chosen);

  // A chip half behind the edge would read as nothing chosen.
  useEffect(() => {
    revealChosen(viewportRef.current);
  }, [chosenKey]);

  return (
    <ScrollArea type="never" offsetScrollbars={false} viewportRef={viewportRef} mx={-EDGE} style={EDGE_FADE_STYLE}>
      <Group gap={8} wrap="nowrap" px={EDGE}>
        {items.map((item) => (
          <BikeFilterChip
            key={trackedActionKey(item)}
            label={catalogueLabel(item.action_i18n_key, item.action_name, t)}
            dotColor={warningColor(item)}
            active={trackedActionKey(item) === chosenKey}
            onClick={() => onPick(item)}
          />
        ))}
      </Group>
    </ScrollArea>
  );
}

// Sideways only, so a pick never scrolls the page; clears the faded edge too.
function revealChosen(viewport: HTMLDivElement | null): void {
  const chip = viewport?.querySelector('[aria-pressed="true"]');
  if (viewport === null || chip === null || chip === undefined) return;

  const frame = viewport.getBoundingClientRect();
  const box = chip.getBoundingClientRect();
  const pastLeft = box.left - (frame.left + EDGE);
  const pastRight = box.right - (frame.right - EDGE);
  const shift = pastLeft < 0 ? pastLeft : Math.max(pastRight, 0);
  if (shift === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  viewport.scrollBy({ left: shift, behavior: reduced ? "auto" : "smooth" });
}

// Opens the same drawer the Attention card does.
function ForecastReading({ item, onOpen }: { item: WearForecastItem; onOpen: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const warning = warningColor(item);
  const missing = missingEstimate(item);

  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil"
      m={-VEIL_ROOM}
      p={VEIL_ROOM}
      style={{ display: "block", borderRadius: "var(--mantine-radius-md)" }}
    >
      <Text
        className="tabular-nums"
        fz={HOME_FIGURE_SIZE}
        fw={600}
        lh={1.1}
        c={missing ? "text.6" : (warning ?? "text.6")}
        style={{ letterSpacing: "var(--tracking-display)" }}
      >
        {forecastNote(item, t)}
      </Text>
      {missing && (
        <Text fz={13} mt={4} c="var(--color-text-dim)">
          {t("stats.forecastNoRides")}
        </Text>
      )}
      <Box mt={14}>
        <ForecastChart item={item} />
      </Box>
      <Group justify="space-between" wrap="nowrap" gap={12} mt={12} className="tabular-nums" fz={12} lh="16px">
        <Text span inherit c="text.7" style={{ flexShrink: 0 }}>
          {`${t("stats.forecastWear")} ${t("tracking.percentage", { value: item.percentage })}`}
        </Text>
        <Text span inherit c={warning ?? "text.7"} fw={warning === undefined ? 400 : 500} lineClamp={1}>
          {remainingLabel(item, i18n.language, t)}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
