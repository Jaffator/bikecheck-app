// The two answers, the symptoms under "something's off" and the note: one form for the drawer and the detail.
import type { CSSProperties, ReactElement } from "react";
import { Box, Chip, Group, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { PRESS_TRANSITION } from "@/components/panelRows";
import { chipStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import {
  CHECK_IN_COLOR,
  CHECK_IN_NOTE_MAX_LENGTH,
  CHECK_IN_SYMPTOMS,
  symptomKey,
  toggleSymptom,
  type CheckInDraft,
} from "@/features/rides/checkIn";
import type { CheckInStatus } from "@/features/rides/rides.types";

const STATUS_ICON: Record<CheckInStatus, LucideIcon> = { OK: CircleCheck, ISSUE: TriangleAlert };
const STATUS_LABEL_KEY: Record<CheckInStatus, string> = { OK: "checkIn.ok", ISSUE: "checkIn.issue" };

interface CheckInFormProps {
  draft: CheckInDraft;
  onChange: (draft: CheckInDraft) => void;
}

export function CheckInForm({ draft, onChange }: CheckInFormProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {(["OK", "ISSUE"] as const).map((status) => (
          <StatusButton
            key={status}
            status={status}
            label={t(STATUS_LABEL_KEY[status])}
            selected={draft.status === status}
            onPick={() => onChange({ ...draft, status })}
          />
        ))}
      </Box>

      {draft.status === "ISSUE" && (
        <Stack gap={8}>
          <Eyebrow>{t("checkIn.symptomsLabel")}</Eyebrow>
          <SymptomChips draft={draft} onChange={onChange} />
        </Stack>
      )}

      <TextInput
        label={t("checkIn.noteLabel")}
        placeholder={t("checkIn.notePlaceholder")}
        value={draft.note}
        maxLength={CHECK_IN_NOTE_MAX_LENGTH}
        onChange={(event) => onChange({ ...draft, note: event.currentTarget.value })}
        styles={inputStyles}
      />
    </Stack>
  );
}

export function SymptomChips({ draft, onChange }: CheckInFormProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap="xs">
      {CHECK_IN_SYMPTOMS.map((symptom) => {
        const checked = draft.symptoms.includes(symptom);
        return (
          <Chip
            key={symptom}
            checked={checked}
            onChange={() => onChange(toggleSymptom(draft, symptom))}
            radius="xl"
            size="sm"
            styles={chipStyles(checked)}
          >
            {t(symptomKey(symptom))}
          </Chip>
        );
      })}
    </Group>
  );
}

interface StatusButtonProps {
  status: CheckInStatus;
  label: string;
  selected: boolean;
  onPick: () => void;
  // One half of the ride detail's flat track instead of the tall tile.
  segment?: boolean;
}

// Tinted in its own colour once picked.
export function StatusButton({ status, label, selected, onPick, segment = false }: StatusButtonProps): ReactElement {
  const Icon = STATUS_ICON[status];
  const color = CHECK_IN_COLOR[status];
  const content = (
    <>
      <Icon size={segment ? 15 : 22} color={selected ? color : "var(--mantine-color-text-7)"} />
      <Text fz={segment ? 14 : 13} fw={selected ? 700 : 600} c={selected ? "text.6" : "text.7"}>
        {label}
      </Text>
    </>
  );

  return (
    <UnstyledButton
      onClick={onPick}
      aria-pressed={selected}
      className="active:scale-[0.985]"
      style={segment ? segmentStyle(selected, color) : tileStyle(selected, color)}
    >
      {segment ? (
        <Group gap={8} justify="center" wrap="nowrap">
          {content}
        </Group>
      ) : (
        <Stack gap={6} align="center">
          {content}
        </Stack>
      )}
    </UnstyledButton>
  );
}

function tileStyle(selected: boolean, color: string): CSSProperties {
  return {
    minHeight: 66,
    borderRadius: 14,
    padding: "8px 4px",
    border: `1px solid ${selected ? color : "var(--mantine-color-inputs-5)"}`,
    backgroundColor: selected ? `color-mix(in srgb, ${color} 14%, transparent)` : "var(--mantine-color-cards-7)",
    transition: PRESS_TRANSITION,
  };
}

// No frame: the track draws the edge, a picked segment only its tint.
function segmentStyle(selected: boolean, color: string): CSSProperties {
  return {
    minHeight: 38,
    borderRadius: 8,
    padding: "6px 4px",
    backgroundColor: selected ? `color-mix(in srgb, ${color} 18%, transparent)` : "transparent",
    transition: `${PRESS_TRANSITION}, background-color 150ms ease`,
  };
}
