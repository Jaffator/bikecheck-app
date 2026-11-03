// The check-in's answer segments and the symptoms under "something's off".
import type { CSSProperties, ReactElement } from "react";
import { Chip, Group, Text, UnstyledButton } from "@mantine/core";
import { CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PRESS_TRANSITION } from "@/components/panelRows";
import { chipStyles } from "@/features/add_bike_page/formStyles";
import { CHECK_IN_COLOR, CHECK_IN_SYMPTOMS, symptomKey, toggleSymptom, type CheckInDraft } from "@/features/rides/checkIn";
import type { CheckInStatus } from "@/features/rides/rides.types";

const STATUS_ICON: Record<CheckInStatus, LucideIcon> = { OK: CircleCheck, ISSUE: TriangleAlert };

interface SymptomChipsProps {
  draft: CheckInDraft;
  onChange: (draft: CheckInDraft) => void;
}

export function SymptomChips({ draft, onChange }: SymptomChipsProps): ReactElement {
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
}

// One half of the flat track, tinted in its own colour once picked.
export function StatusButton({ status, label, selected, onPick }: StatusButtonProps): ReactElement {
  const Icon = STATUS_ICON[status];
  const color = CHECK_IN_COLOR[status];

  return (
    <UnstyledButton
      onClick={onPick}
      aria-pressed={selected}
      className="active:scale-[0.985]"
      style={segmentStyle(selected, color)}
    >
      <Group gap={8} justify="center" wrap="nowrap">
        <Icon size={15} color={selected ? color : "var(--mantine-color-text-7)"} />
        <Text fz={14} fw={selected ? 700 : 600} c={selected ? "text.6" : "text.7"}>
          {label}
        </Text>
      </Group>
    </UnstyledButton>
  );
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
