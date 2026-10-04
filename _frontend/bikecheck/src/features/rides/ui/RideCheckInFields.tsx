// The ride detail's check-in, always open: a second tap clears an answer, the rest waits for one.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { CHECK_IN_NOTE_MAX_LENGTH, type CheckInDraft } from "@/features/rides/checkIn";
import type { CheckInStatus } from "@/features/rides/rides.types";
import { useIsDesktop } from "@/layout/breakpoints";
import { StatusButton, SymptomChips } from "./CheckInForm";

const STATUSES: CheckInStatus[] = ["OK", "ISSUE"];

// The desktop rows' label column, from the design.
const LABEL_WIDTH = 84;
// Mantine's sm chip and inputStyles' input, so a label sits on its field's first line.
const CHIP_ROW_HEIGHT = "28px";
const INPUT_ROW_HEIGHT = "2.4rem";

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

      <SimpleGrid cols={2} spacing={8}>
        {STATUSES.map((status) => (
          <StatusButton
            key={status}
            status={status}
            label={t(status === "OK" ? "checkIn.ok" : "checkIn.issue")}
            selected={draft.status === status}
            onPick={() => pick(status)}
            low
          />
        ))}
      </SimpleGrid>

      {draft.status === "ISSUE" && (
        <Field label={t("checkIn.symptomsLabel")} beside={isDesktop} rowHeight={CHIP_ROW_HEIGHT}>
          <SymptomChips draft={draft} onChange={onChange} />
        </Field>
      )}

      {draft.status !== null && (
        <Field label={t("checkIn.note")} beside={isDesktop} rowHeight={INPUT_ROW_HEIGHT}>
          <TextInput
            aria-label={t("checkIn.note")}
            placeholder={t("checkIn.notePlaceholder")}
            value={draft.note}
            maxLength={CHECK_IN_NOTE_MAX_LENGTH}
            onChange={(event) => onChange({ ...draft, note: event.currentTarget.value })}
            styles={inputStyles}
          />
        </Field>
      )}
    </Stack>
  );
}

interface FieldProps {
  label: string;
  // Desktop has the width for the label beside its field.
  beside: boolean;
  rowHeight: string;
  children: ReactNode;
}

function Field({ label, beside, rowHeight, children }: FieldProps): ReactElement {
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
      <Text fz={12} lh={rowHeight} c="var(--color-text-dim)" w={LABEL_WIDTH} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Group>
  );
}
