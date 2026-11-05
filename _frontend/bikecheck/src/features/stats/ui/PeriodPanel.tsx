// Picks a custom Period by days, month or year: a bottom sheet on a phone, a popover under its anchor on desktop.
import { useState, type ReactElement, type ReactNode } from "react";
import { Box, Button, Group, Popover, SegmentedControl, Stack } from "@mantine/core";
import { DatePicker, DatesProvider, MonthPicker, YearPicker, type DatesRangeValue } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import type { DayRange } from "@/features/rides/ridesTable";
import { localToday } from "@/features/service_tracking/plannedDay";
import { useOpeningCount } from "@/hooks/useOpeningCount";
import { useIsDesktop } from "@/layout/breakpoints";
import { choosePeriod, spanKind, wholeSpan, type SpanKind } from "../homePeriod";
import { useEarliestDay } from "../stats.queries";
import type { HomePeriod } from "../stats.types";

const SHEET_Z_INDEX = 320;

// The picker's bounds: nothing before the garage's first year, nothing after today.
interface PickerBounds {
  minDate: string;
  maxDate: string;
}

export interface PeriodPanelProps {
  opened: boolean;
  onClose: () => void;
  // The custom Period it reopens on; null starts empty.
  value: DayRange | null;
  // A tap on a month or year, or Apply on days; the panel closes itself after.
  onChange: (period: HomePeriod) => void;
  // Under the tabs' content, for an action of the caller's own. It closes the panel itself.
  action?: ReactNode;
  // What the desktop popover hangs under; a phone draws it unchanged.
  children: ReactNode;
}

export function PeriodPanel({ opened, onClose, value, onChange, action, children }: PeriodPanelProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  // Remounted per opening, so a day picked and left without Apply is dropped.
  const opening = useOpeningCount(opened);
  const body = (
    <PeriodPanelBody
      key={opening}
      value={value}
      onPick={(period) => {
        onChange(period);
        onClose();
      }}
      action={action}
    />
  );

  if (isDesktop) {
    return (
      <Popover opened={opened} onDismiss={onClose} position="bottom-end" offset={8}>
        <Popover.Target>
          <Box>{children}</Box>
        </Popover.Target>
        <Popover.Dropdown>{body}</Popover.Dropdown>
      </Popover>
    );
  }

  return (
    <>
      {children}
      <ResponsiveSheet
        opened={opened}
        onClose={onClose}
        desktop="modal"
        title={t("stats.periodCustomTitle")}
        zIndex={SHEET_Z_INDEX}
        styles={{
          content: { height: "auto", maxHeight: "88dvh" },
          title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
        }}
      >
        {body}
      </ResponsiveSheet>
    </>
  );
}

interface PeriodPanelBodyProps {
  value: DayRange | null;
  onPick: (period: HomePeriod) => void;
  action?: ReactNode;
}

function PeriodPanelBody({ value, onPick, action }: PeriodPanelBodyProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: earliest } = useEarliestDay();
  // A whole month or year reopens on its own tab.
  const shape = value === null ? "days" : spanKind(value);
  const [tab, setTab] = useState<SpanKind>(shape);

  const today = localToday();
  // Until the earliest day loads, the current year stands alone.
  const bounds: PickerBounds = { minDate: wholeSpan(earliest?.day ?? today, "year").from, maxDate: today };
  const pickWhole = (day: string | null, unit: "month" | "year"): void => {
    if (day !== null) onPick(choosePeriod(wholeSpan(day, unit)));
  };
  const chosen = (unit: SpanKind): string | null => (shape === unit && value !== null ? value.from : null);

  return (
    // The calendar names its months in the app's language, not the browser's.
    <DatesProvider settings={{ locale: i18n.language.split("-")[0] }}>
      <Stack gap="md">
        <SegmentedControl
          fullWidth
          withItemsBorders={false}
          value={tab}
          onChange={setTab}
          aria-label={t("stats.periodCustomTitle")}
          data={[
            { value: "days", label: t("stats.periodTabDays") },
            { value: "month", label: t("stats.periodTabMonth") },
            { value: "year", label: t("stats.periodTabYear") },
          ]}
        />
        <Group justify="center">
          {tab === "days" && <DaysPicker value={value} bounds={bounds} onPick={onPick} />}
          {tab === "month" && (
            <MonthPicker
              {...bounds}
              maxLevel="year"
              value={chosen("month")}
              defaultDate={value?.from ?? today}
              onChange={(day) => pickWhole(day, "month")}
            />
          )}
          {tab === "year" && (
            <YearPicker
              {...bounds}
              value={chosen("year")}
              defaultDate={value?.from ?? today}
              onChange={(day) => pickWhole(day, "year")}
            />
          )}
        </Group>
        {action}
      </Stack>
    </DatesProvider>
  );
}

interface DaysPickerProps {
  value: DayRange | null;
  bounds: PickerBounds;
  onPick: (period: HomePeriod) => void;
}

// First day, last day, Apply; one day tapped twice is a span of one.
function DaysPicker({ value, bounds, onPick }: DaysPickerProps): ReactElement {
  const { t } = useTranslation();
  const [days, setDays] = useState<DatesRangeValue<string>>([value?.from ?? null, value?.to ?? null]);
  const [from, to] = days;
  const ready = from !== null && to !== null;

  return (
    <Stack gap="md">
      <DatePicker
        {...bounds}
        type="range"
        allowSingleDateInRange
        value={days}
        onChange={setDays}
        defaultDate={value?.from ?? bounds.maxDate}
        weekendDays={[]}
        highlightToday
      />
      <Button
        fullWidth
        radius="md"
        color="primary.6"
        // Left off while disabled, so the disabled colour shows.
        c={ready ? "textDark.6" : undefined}
        disabled={!ready}
        styles={disabledButtonStyles}
        onClick={() => {
          if (ready) onPick(choosePeriod({ from, to }));
        }}
      >
        {t("stats.periodApply")}
      </Button>
    </Stack>
  );
}
