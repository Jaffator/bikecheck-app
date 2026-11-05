// Home's Period: this month, the current year by its number, all time, or days the rider picks.
import { useState, type MouseEvent, type ReactElement } from "react";
import { Group, SegmentedControl, Text, UnstyledButton } from "@mantine/core";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { customPeriodLabel, homePeriodLabel, isCustomPeriod, parseNamedPeriod } from "../homePeriod";
import type { HomePeriod } from "../stats.types";
import { PeriodPanel } from "./PeriodPanel";

// The phone's pill track: as wide as the figures under it, one segment each. The height is the
// label's line: a height set on the track itself squeezes the indicator off centre.
const PILL_LABEL_LINE = 26;
// Desktop's track matches the 38px status chips beside it: 24 + 2×3 label + 2×4 track padding.
const HEADER_LABEL_LINE = 24;
// A step lighter than the cards, so the switcher reads as a control beside them.
const TRACK_BG = "var(--mantine-color-cards-5)";
const INDICATOR_BG = "var(--mantine-color-primary-6)";
const CUSTOM_SEGMENT = "custom";

interface HomePeriodSwitcherProps {
  value: HomePeriod;
  onChange: (period: HomePeriod) => void;
  // The phone runs it across the page as a pill bound to the figures; desktop hangs it in the header.
  fullWidth?: boolean;
  // Off where the page does not read a custom Period yet, so it offers no dead option.
  withCustom?: boolean;
}

export function HomePeriodSwitcher({
  value,
  onChange,
  fullWidth = false,
  withCustom = false,
}: HomePeriodSwitcherProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [panelOpened, setPanelOpened] = useState(false);
  const customDays = isCustomPeriod(value) ? customPeriodLabel(value, i18n.language) : null;
  const customLabel = fullWidth ? null : customDays;

  const segments = (
    <SegmentedControl
      value={isCustomPeriod(value) ? CUSTOM_SEGMENT : value}
      onChange={(next) => {
        if (next === CUSTOM_SEGMENT) return;
        setPanelOpened(false);
        onChange(parseNamedPeriod(next));
      }}
      // The radio fires no change once Custom is chosen, and a click on it must still reopen the panel.
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        if (isCustomSegment(event.target)) setPanelOpened(true);
      }}
      fullWidth={fullWidth}
      radius={fullWidth ? "xl" : "lg"}
      withItemsBorders={false}
      // Dark on the yellow indicator; the rest darker than the theme's dim, so the chosen Period stands out.
      classNames={{
        label:
          "tabular-nums !text-[var(--mantine-color-text-8)] data-[active]:!text-[var(--mantine-color-textDark-6)] data-[active]:font-bold",
      }}
      styles={
        fullWidth
          ? {
              // Drawn as a card, like the figures under it.
              root: { backgroundColor: TRACK_BG, boxShadow: "var(--elev-panel)" },
              indicator: { backgroundColor: INDICATOR_BG, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.4)" },
              label: { lineHeight: `${String(PILL_LABEL_LINE)}px` },
            }
          : {
              root: { backgroundColor: TRACK_BG },
              indicator: { backgroundColor: INDICATOR_BG },
              label: { lineHeight: `${String(HEADER_LABEL_LINE)}px` },
            }
      }
      aria-label={t("stats.period")}
      data={[
        { value: "month", label: t(fullWidth ? "stats.periodMonthShort" : "stats.periodMonth") },
        { value: "year", label: homePeriodLabel("year", i18n.language, t) },
        { value: "all", label: t(fullWidth ? "stats.periodAllLong" : "stats.periodAll") },
        ...(withCustom ? [{ value: CUSTOM_SEGMENT, label: customLabel ?? t("stats.periodCustom") }] : []),
      ]}
    />
  );

  if (!withCustom) return segments;

  return (
    <>
      <PeriodPanel
        opened={panelOpened}
        onClose={() => setPanelOpened(false)}
        value={isCustomPeriod(value) ? value : null}
        onChange={onChange}
      >
        {segments}
      </PeriodPanel>
      {/* The phone's segment has no room for days, so they stand under it. */}
      {fullWidth && customDays !== null && <CustomDaysLine days={customDays} onEdit={() => setPanelOpened(true)} />}
    </>
  );
}

function isCustomSegment(target: EventTarget): boolean {
  return target instanceof HTMLInputElement && target.value === CUSTOM_SEGMENT;
}

function CustomDaysLine({ days, onEdit }: { days: string; onEdit: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onEdit} aria-label={t("stats.periodEdit")}>
      <Group gap={6} justify="center" wrap="nowrap">
        <Text className="tabular-nums" fz={13} c="text.6">
          {days}
        </Text>
        <Pencil size={14} color="var(--mantine-color-primary-5)" />
      </Group>
    </UnstyledButton>
  );
}
