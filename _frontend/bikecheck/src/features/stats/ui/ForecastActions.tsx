// One bike's Tracked Actions as chips, soonest first, over the chosen one's reading; a sideways swipe on the reading steps through them.
// Keyed by the bike, so a new bike opens on its first.
import { useCallback, useState, type CSSProperties, type ReactElement } from "react";
import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSwipePanels } from "@/hooks/useSwipePanels";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor, QUIET_BELOW, trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { remainingLabel } from "@/features/service_tracking/intervalFigures";
import type { WearForecastItem } from "../stats.types";
import { forecastNote, missingEstimate } from "../wearForecast";
import { ForecastChart } from "./ForecastChart";
import { ForecastChipRail } from "./ForecastChipRail";
import { HOME_FIGURE_SIZE } from "./HomeCardHeader";

// Room around the body, so its hover veil does not end flush with the chart.
const VEIL_ROOM = 8;
// Vertical scroll stays the page's; a sideways drag must not reach the browser's back swipe.
// Flex, because a button in a plain block shrinks to its content and the chart with it.
const SWIPE_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  touchAction: "pan-y",
  overscrollBehaviorX: "contain",
};

interface ForecastActionsProps {
  items: WearForecastItem[];
  onOpen: (item: WearForecastItem) => void;
}

export function ForecastActions({ items, onOpen }: ForecastActionsProps): ReactElement {
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  // A refetch can drop the chosen action, so the soonest stands in.
  const chosen = items.find((item) => trackedActionKey(item) === chosenKey) ?? items[0];
  const pick = useCallback((item: WearForecastItem): void => setChosenKey(trackedActionKey(item)), []);
  const swipe = useSwipePanels(items.indexOf(chosen), items.length, (next) => {
    if (next >= 0 && next < items.length) pick(items[next]);
  });

  return (
    <Stack gap="md">
      <ActionChips items={items} chosen={chosen} onPick={pick} />
      <Box style={SWIPE_STYLE} {...swipe.handlers}>
        <ForecastReading
          item={chosen}
          onOpen={() => {
            // The lift that ends a swipe also clicks, and must not open the drawer.
            if (!swipe.moving) onOpen(chosen);
          }}
        />
      </Box>
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
  const chosenKey = trackedActionKey(chosen);
  const index = items.indexOf(chosen);

  return (
    <ForecastChipRail
      chosenKey={chosenKey}
      canStepBack={index > 0}
      canStepAhead={index < items.length - 1}
      onStep={(direction) => onPick(items[index + direction])}
    >
      {items.map((item) => (
        <ActionChip
          key={trackedActionKey(item)}
          label={catalogueLabel(item.action_i18n_key, item.action_name, t)}
          dotColor={warningColor(item)}
          active={trackedActionKey(item) === chosenKey}
          onClick={() => onPick(item)}
        />
      ))}
    </ForecastChipRail>
  );
}

interface ActionChipProps {
  label: string;
  dotColor: string | undefined;
  active: boolean;
  onClick: () => void;
}

// Borderless tab: fill alone tells the chosen one apart.
function ActionChip({ label, dotColor, active, onClick }: ActionChipProps): ReactElement {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={active}
      className="hover-veil"
      h={34}
      px={12}
      fz={13}
      fw={500}
      c={active ? "primary.6" : "var(--color-text-dim)"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        borderRadius: "var(--mantine-radius-md)",
        whiteSpace: "nowrap",
        backgroundColor: active
          ? "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)"
          : "var(--color-surface-raised)",
      }}
    >
      {dotColor !== undefined && (
        <Box
          w={7}
          h={7}
          // A dark ring on the chosen chip, so a yellow warning dot does not melt into the yellow accent.
          style={{
            borderRadius: "50%",
            backgroundColor: dotColor,
            flexShrink: 0,
            boxShadow: active ? "0 0 0 2px var(--mantine-color-cards-6)" : undefined,
          }}
        />
      )}
      {label}
    </UnstyledButton>
  );
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
      {/* The answer first, what it leaves beside it: the same two ends as the title and the bike above. */}
      <Group justify="space-between" align="baseline" wrap="nowrap" gap={12}>
        <Text
          className="tabular-nums"
          fz={HOME_FIGURE_SIZE}
          fw={600}
          lh={1.1}
          c={missing ? "text.6" : (warning ?? "text.6")}
          style={{ flexShrink: 0, letterSpacing: "var(--tracking-display)" }}
        >
          {forecastNote(item, t)}
        </Text>
        <Text
          className="tabular-nums"
          fz={13}
          c={warning ?? "text.8"}
          fw={warning === undefined ? 400 : 500}
          lineClamp={1}
        >
          {remainingLabel(item, i18n.language, t)}
        </Text>
      </Group>
      {missing && (
        <Text fz={13} mt={4} c="text.8">
          {t("stats.forecastNoRides")}
        </Text>
      )}
      <Box mt={12}>
        <ForecastChart item={item} />
      </Box>
    </UnstyledButton>
  );
}
