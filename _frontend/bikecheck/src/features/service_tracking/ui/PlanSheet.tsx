// Planning one Tracked Action for a day: a calendar from today on, Save, and Remove plan once one exists (ADR 0038).
import { useState, type CSSProperties, type ReactElement } from "react";
import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import { DatePicker, DatesProvider } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { trackedActionKey, trackedPartLabel } from "@/features/service_tracking/attentionLevel";
import { isPlanPassed, localToday } from "@/features/service_tracking/plannedDay";
import { useSetTrackedActionPlan } from "@/features/service_tracking/tracking.queries";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

// Above the Tracked Action drawer it is also opened from.
const SHEET_Z_INDEX = 320;

// Mantine draws its calendar for the light scheme; the text token keeps the selected day's own contrast.
const CALENDAR_STYLES = {
  calendarHeaderControl: { color: "var(--mantine-color-text-6)" },
  calendarHeaderLevel: { color: "var(--mantine-color-text-6)", fontWeight: 600 },
  weekday: { color: "var(--color-text-dim)" },
  day: {
    "--mantine-color-text": "var(--mantine-color-text-6)",
    "--day-hover-bg": "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)",
  } as CSSProperties,
};

interface PlanSheetProps {
  // Null closes the sheet.
  action: TrackedAction | null;
  onClose: () => void;
  // The Tracked Action as the write answered it, for a caller that shows it (the drawer).
  onWritten?: (action: TrackedAction) => void;
}

export function PlanSheet({ action, onClose, onWritten }: PlanSheetProps): ReactElement {
  const shown = useLastAction(action);

  return (
    <ResponsiveSheet
      opened={action !== null}
      onClose={onClose}
      desktop="modal"
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      styles={{ content: { height: "auto", maxHeight: "88dvh" }, body: { paddingTop: 0 } }}
    >
      {/* Remounted per opening, so a day picked and then cancelled never carries into the next one. */}
      {shown !== null && (
        <PlanBody
          key={action === null ? "closed" : trackedActionKey(action)}
          action={shown}
          onClose={onClose}
          onWritten={onWritten}
        />
      )}
    </ResponsiveSheet>
  );
}

function PlanBody({
  action,
  onClose,
  onWritten,
}: {
  action: TrackedAction;
  onClose: () => void;
  onWritten?: (action: TrackedAction) => void;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const write = useSetTrackedActionPlan();
  const today = localToday();
  const planned = action.planned_for;
  // A passed day cannot be saved again, so the owner starts from a fresh pick.
  const [picked, setPicked] = useState<string | null>(planned !== null && !isPlanPassed(planned) ? planned : null);

  const save = (day: string | null): void => {
    write.mutate(
      { component_mounted_id: action.component_mounted_id, event_action_id: action.event_action_id, planned_for: day },
      {
        onSuccess: (written) => {
          onWritten?.(written);
          onClose();
        },
      },
    );
  };
  const removing = write.isPending && write.variables?.planned_for === null;

  return (
    <Stack gap="md" pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm" mt="md">
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          <Text fz={20} fw={700} c="text.6" lh={1.2} lineClamp={2}>
            {catalogueLabel(action.action_i18n_key, action.action_name, t)}
          </Text>
          <Text className="font-mono" fz={11} tt="uppercase" lts="0.08em" c="var(--color-text-dim)" lineClamp={1}>
            {trackedPartLabel(action, t)}
          </Text>
        </Stack>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          size="md"
          aria-label={t("action.close")}
          onClick={onClose}
          style={{ flexShrink: 0 }}
        >
          <X size={18} color="var(--color-text-dim)" />
        </ActionIcon>
      </Group>

      {/* The calendar names its months in the app's language, not the browser's. */}
      <DatesProvider settings={{ locale: i18n.language.split("-")[0] }}>
        <Group justify="center">
          <DatePicker
            value={picked}
            onChange={setPicked}
            minDate={today}
            defaultDate={planned ?? today}
            weekendDays={[]}
            highlightToday
            styles={CALENDAR_STYLES}
          />
        </Group>
      </DatesProvider>

      {write.isError && (
        <Text fz={13} c="red.5">
          {t("tracking.planFailed")}
        </Text>
      )}

      <Stack gap="sm">
        <Button
          fullWidth
          color="primary.6"
          c="textDark.6"
          radius="md"
          styles={disabledButtonStyles}
          disabled={picked === null || write.isPending}
          loading={write.isPending && !removing}
          onClick={() => {
            save(picked);
          }}
        >
          {t("tracking.planSave")}
        </Button>
        {planned !== null && (
          <Button
            fullWidth
            variant="outline"
            radius="md"
            disabled={write.isPending && !removing}
            loading={removing}
            onClick={() => {
              save(null);
            }}
          >
            {t("tracking.removePlan")}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

// The last Tracked Action asked about, kept while the sheet slides away with it.
function useLastAction(action: TrackedAction | null): TrackedAction | null {
  const [last, setLast] = useState<TrackedAction | null>(action);
  if (action !== null && action !== last) setLast(action);
  return action ?? last;
}
