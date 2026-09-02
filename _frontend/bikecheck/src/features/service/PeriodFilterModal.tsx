// The period filter behind the history header's control.
import { useState, type ReactElement } from "react";
import { Button, Chip, Group, Modal, Stack, Text } from "@mantine/core";
import { DatePickerInput, DatesProvider } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import { chipStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import { PERIOD_PRESETS, matchPreset } from "./servicePeriod";
import type { ServicePeriod } from "./service.types";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Above the service detail sheet, which the history can also have open.
const MODAL_Z_INDEX = 400;
// The calendar hangs off a field inside the modal, so it has to sit above it. Kept beside
// the modal's own value: the two only work as a pair.
const CALENDAR_Z_INDEX = MODAL_Z_INDEX + 1;

// Mantine draws its calendar in the light scheme this app never switches on, so the
// dropdown is dressed in the app's own tokens. Only the surface, the text and the states
// are stated - sizing and layout stay Mantine's. The field itself takes the same styles
// every other input in the app wears.
const CALENDAR_STYLES = {
  ...inputStyles,
  input: {
    ...inputStyles.input,
    // A date is taller than the wizard's one-line fields: two of these stand side by side,
    // so the text has half the width to sit in and needs the room.
    height: "3rem",
    display: "flex",
    alignItems: "center",
  },
  calendarHeaderControl: { color: "var(--mantine-color-text-6)" },
  calendarHeaderLevel: {
    color: "var(--mantine-color-text-6)",
    fontWeight: 600,
  },
  weekday: { color: "var(--color-text-dim)" },
  day: {
    color: "var(--mantine-color-text-6)",
    // The states Day.css takes from the grey ramp, which is light in either scheme.
    "--day-hover-bg": "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)",
    "--day-today-color": "var(--mantine-color-primary-6)",
  },
} as const;

// The dropdown is portalled out of the modal, so it carries its surface itself.
const CALENDAR_POPOVER_PROPS = {
  zIndex: CALENDAR_Z_INDEX,
  styles: {
    dropdown: {
      backgroundColor: "var(--mantine-color-cards-6)",
      border: "1px solid var(--mantine-color-inputs-5)",
    },
  },
} as const;

// Picks the period the History Totals and the list below them are read for. The presets
// fill the two dates in rather than standing beside them, so the user always sees the
// days that will actually be asked for. Nothing is applied until Apply: a half-typed date
// is a valid date, and reloading on every keystroke would show nonsense on the way.
export function PeriodFilterModal(props: PeriodFilterModalProps): ReactElement {
  // Remounting the body on each opening is what discards a cancelled edit: the draft is
  // born from the applied period rather than being reset back to it afterwards.
  return <PeriodFilterModalBody key={props.opened ? "open" : "closed"} {...props} />;
}

interface PeriodFilterModalProps {
  opened: boolean;
  onClose: () => void;
  period: ServicePeriod;
  onApply: (period: ServicePeriod) => void;
}

function PeriodFilterModalBody({ opened, onClose, period, onApply }: PeriodFilterModalProps): ReactElement {
  const { t, i18n } = useTranslation();
  // The period being edited, which is the applied one until the user touches it.
  const [draft, setDraft] = useState<ServicePeriod>(period);

  const selectedPreset = matchPreset(draft);

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="lg"
      zIndex={MODAL_Z_INDEX}
      title={
        <Text className="font-mono uppercase" fz={11} fw={400} c="var(--color-text-dim)" lts="0.08em">
          {t("service.periodTitle")}
        </Text>
      }
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)" },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
      }}
    >
      {/* Without this the calendar names its months in English while the card beside it
          reads Czech. The locale follows i18next rather than being fixed at startup,
          because the user can switch language without reloading. */}
      <DatesProvider settings={{ locale: i18n.language.split("-")[0] }}>
        <Stack gap="md">
          {/* A preset writes both dates; the fields below stay editable afterwards. */}
          <Chip.Group
            multiple={false}
            value={selectedPreset ?? ""}
            onChange={(value) => {
              const preset = PERIOD_PRESETS.find((candidate) => candidate.id === value);
              if (preset !== undefined) {
                setDraft(preset.period());
              }
            }}
          >
            <Group gap="xs">
              {PERIOD_PRESETS.map((preset) => (
                <Chip
                  key={preset.id}
                  value={preset.id}
                  radius="xl"
                  size="sm"
                  color="primary.6"
                  // The same chip the bike filter above the list wears, so two filters on
                  // one screen do not read as two different controls.
                  styles={chipStyles(preset.id === selectedPreset, {
                    wrap: false,
                  })}
                >
                  {t(preset.labelKey)}
                </Chip>
              ))}
            </Group>
          </Chip.Group>

          <Group grow align="flex-start" wrap="nowrap">
            {/* Mantine speaks the same YYYY-MM-DD day the API and the URL do, so the two
              ends travel from picker to query string without converting. */}
            <DatePickerInput
              label={t("service.periodFromLabel")}
              placeholder={t("service.periodOpen")}
              value={draft.from}
              onChange={(value) => setDraft((current) => ({ ...current, from: value }))}
              clearable
              // The period cannot start after it ends.
              maxDate={draft.to ?? undefined}
              styles={CALENDAR_STYLES}
              popoverProps={CALENDAR_POPOVER_PROPS}
            />
            <DatePickerInput
              label={t("service.periodToLabel")}
              placeholder={t("service.periodOpen")}
              value={draft.to}
              onChange={(value) => setDraft((current) => ({ ...current, to: value }))}
              clearable
              minDate={draft.from ?? undefined}
              styles={CALENDAR_STYLES}
              popoverProps={CALENDAR_POPOVER_PROPS}
            />
          </Group>

          <Button
            fullWidth
            radius="md"
            color="primary.6"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {t("service.periodApply")}
          </Button>
        </Stack>
      </DatesProvider>
    </Modal>
  );
}
