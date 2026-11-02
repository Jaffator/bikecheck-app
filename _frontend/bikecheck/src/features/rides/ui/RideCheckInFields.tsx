// The ride detail's check-in, always open: a second tap clears an answer, the rest waits for one.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { TextRow } from "@/components/TextRow";
import { CHECK_IN_NOTE_MAX_LENGTH, type CheckInDraft } from "@/features/rides/checkIn";
import type { CheckInStatus } from "@/features/rides/rides.types";
import { useIsDesktop } from "@/layout/breakpoints";
import { StatusButton, SymptomChips } from "./CheckInForm";
import { RIDE_CARD_STYLE } from "./rideCard";

const STATUSES: CheckInStatus[] = ["OK", "ISSUE"];

// The desktop rows' label column, from the design.
const LABEL_WIDTH = 84;
// Mantine's sm chip, so a label sits on its field's first line.
const CHIP_ROW_HEIGHT = "28px";

// One flat grey track holding both answers.
const TRACK_STYLE: CSSProperties = {
  ...RIDE_CARD_STYLE,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 3,
  padding: 3,
  borderRadius: 10,
};

interface RideCheckInFieldsProps {
  draft: CheckInDraft;
  onChange: (draft: CheckInDraft) => void;
}

export function RideCheckInFields({ draft, onChange }: RideCheckInFieldsProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  function pick(status: CheckInStatus): void {
    onChange({ ...draft, status: draft.status === status ? null : status });
  }

  return (
    <Stack gap="sm">
      <Group gap={10} align="baseline" wrap="nowrap">
        <Eyebrow>{t("checkIn.question")}</Eyebrow>
        <Text fz={12} c="var(--color-text-dim)">
          {t("checkIn.optional")}
        </Text>
      </Group>

      <Box role="group" aria-label={t("checkIn.question")} style={TRACK_STYLE}>
        {STATUSES.map((status) => (
          <StatusButton
            key={status}
            status={status}
            label={t(status === "OK" ? "checkIn.ok" : "checkIn.issue")}
            selected={draft.status === status}
            onPick={() => pick(status)}
            segment
          />
        ))}
      </Box>

      {draft.status === "ISSUE" && (
        <Field label={t("checkIn.symptomsLabel")} beside={isDesktop}>
          <SymptomChips draft={draft} onChange={onChange} />
        </Field>
      )}

      <Box style={{ borderBottom: PANEL_HAIRLINE }}>
        <TextRow
          label={t("checkIn.note")}
          value={draft.note}
          placeholder={t("checkIn.notePlaceholder")}
          maxLength={CHECK_IN_NOTE_MAX_LENGTH}
          onChange={(note) => onChange({ ...draft, note })}
        />
      </Box>
    </Stack>
  );
}

interface FieldProps {
  label: string;
  // Desktop has the width for the label beside its field.
  beside: boolean;
  children: ReactNode;
}

function Field({ label, beside, children }: FieldProps): ReactElement {
  if (!beside) {
    return (
      <Stack gap={8}>
        <Eyebrow>{label}</Eyebrow>
        {children}
      </Stack>
    );
  }

  return (
    <Group gap={10} align="flex-start" wrap="nowrap">
      <Text fz={12} lh={CHIP_ROW_HEIGHT} c="var(--color-text-dim)" w={LABEL_WIDTH} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Group>
  );
}
