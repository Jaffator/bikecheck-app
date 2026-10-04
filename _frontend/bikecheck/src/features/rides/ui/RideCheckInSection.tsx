// A ride's check-in in its detail: read, add, change or delete it.
import type { ReactElement } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { symptomKey } from "@/features/rides/checkIn";
import type { RideCheckIn } from "@/features/rides/rides.types";
import type { RideCheckInState } from "@/features/rides/useRideCheckIn";
import { CheckInForm } from "./CheckInForm";
import { CheckInMark } from "./CheckInMark";

interface RideCheckInSectionProps {
  checkIn: RideCheckInState;
  // False on desktop, where adding one lives in the action bar below.
  withAdd?: boolean;
}

export function RideCheckInSection({ checkIn, withAdd = true }: RideCheckInSectionProps): ReactElement {
  const { t } = useTranslation();
  const { saved, draft, toSave } = checkIn;

  if (draft === null && saved === null && !withAdd) {
    return (
      <Group justify="space-between" wrap="nowrap">
        <Eyebrow>{t("checkIn.question")}</Eyebrow>
        <Text fz={14} c="var(--color-text-dim)">
          {t("checkIn.empty")}
        </Text>
      </Group>
    );
  }

  return (
    <Stack gap={8}>
      <Eyebrow>{t("checkIn.question")}</Eyebrow>
      {draft === null ? (
        <SavedCheckIn checkIn={saved} deleting={checkIn.deleting} onEdit={checkIn.edit} onDelete={checkIn.remove} />
      ) : (
        <Stack gap="md">
          <CheckInForm draft={draft} onChange={checkIn.setDraft} />
          <Group gap="sm" justify="flex-end">
            <Button variant="outline" radius="md" size="xs" onClick={() => checkIn.setDraft(null)}>
              {t("checkIn.cancel")}
            </Button>
            <Button
              color="primary.6"
              c="textDark.6"
              radius="md"
              size="xs"
              disabled={toSave === null}
              loading={checkIn.saving}
              styles={disabledButtonStyles}
              onClick={checkIn.submit}
            >
              {t("checkIn.save")}
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}

interface SavedCheckInProps {
  checkIn: RideCheckIn | null;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

// A quiet "—" until there is one, so a ride without a check-in never nags.
function SavedCheckIn({ checkIn, deleting, onEdit, onDelete }: SavedCheckInProps): ReactElement {
  const { t } = useTranslation();

  if (checkIn === null) {
    return (
      <Group justify="space-between" wrap="nowrap">
        <Text fz={14} c="var(--color-text-dim)">
          —
        </Text>
        <Button variant="outline" radius="md" size="xs" onClick={onEdit}>
          {t("checkIn.add")}
        </Button>
      </Group>
    );
  }

  const symptoms = checkIn.symptoms.map((symptom) => t(symptomKey(symptom))).join(" · ");
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Group gap={6} wrap="nowrap">
          <CheckInMark checkIn={checkIn} />
          <Text fz={14} fw={600} c="text.6">
            {t(checkIn.status === "OK" ? "checkIn.ok" : "checkIn.issue")}
          </Text>
        </Group>
        {symptoms !== "" && (
          <Text fz={13} c="text.7">
            {symptoms}
          </Text>
        )}
        {checkIn.note !== null && (
          <Text fz={13} c="var(--color-text-dim)" style={{ overflowWrap: "anywhere" }}>
            {checkIn.note}
          </Text>
        )}
      </Stack>
      <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
        <Button variant="outline" radius="md" size="xs" onClick={onEdit}>
          {t("checkIn.change")}
        </Button>
        <Button variant="outline" color="red.5" radius="md" size="xs" loading={deleting} onClick={onDelete}>
          {t("checkIn.delete")}
        </Button>
      </Group>
    </Group>
  );
}
