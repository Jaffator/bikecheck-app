// A ride's check-in in its detail: read, add, change or delete it.
import { useState, type ReactElement } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { checkInOf, draftOf, symptomKey, type CheckInDraft } from "@/features/rides/checkIn";
import { useDeleteRideCheckIn, useSaveRideCheckIn } from "@/features/rides/rides.queries";
import type { CheckInStatus, Ride, RideCheckIn } from "@/features/rides/rides.types";
import { CheckInForm } from "./CheckInForm";
import { CheckInMark } from "./CheckInMark";

interface RideCheckInSectionProps {
  ride: Ride;
  // Opens straight into the form with this answer picked, as Home's "something's off" does.
  startWith?: CheckInStatus;
}

export function RideCheckInSection({ ride, startWith }: RideCheckInSectionProps): ReactElement {
  const { t } = useTranslation();
  const save = useSaveRideCheckIn();
  const remove = useDeleteRideCheckIn();
  // The sheet holds a snapshot of the ride, so the section keeps what it last saved itself.
  const [saved, setSaved] = useState<RideCheckIn | null>(ride.check_in);
  const [draft, setDraft] = useState<CheckInDraft | null>(
    startWith === undefined ? null : draftOf(ride.check_in, startWith),
  );
  const toSave = draft === null ? null : checkInOf(draft);

  function submit(): void {
    if (toSave === null) return;
    save.mutate(
      { rideId: ride.id, checkIn: toSave },
      {
        onSuccess: (checkIn) => {
          setSaved(checkIn);
          setDraft(null);
        },
        onError: () => notifications.show({ color: "red.5", message: t("checkIn.saveFailed") }),
      },
    );
  }

  function deleteCheckIn(): void {
    remove.mutate(ride.id, {
      onSuccess: () => setSaved(null),
      onError: () => notifications.show({ color: "red.5", message: t("checkIn.deleteFailed") }),
    });
  }

  return (
    <Stack gap={8}>
      <Eyebrow>{t("checkIn.question")}</Eyebrow>
      {draft === null ? (
        <SavedCheckIn
          checkIn={saved}
          deleting={remove.isPending}
          onEdit={() => setDraft(draftOf(saved))}
          onDelete={deleteCheckIn}
        />
      ) : (
        <Stack gap="md">
          <CheckInForm draft={draft} onChange={setDraft} />
          <Group gap="sm" justify="flex-end">
            <Button variant="outline" radius="md" size="xs" onClick={() => setDraft(null)}>
              {t("checkIn.cancel")}
            </Button>
            <Button
              color="primary.6"
              c="textDark.6"
              radius="md"
              size="xs"
              disabled={toSave === null}
              loading={save.isPending}
              styles={disabledButtonStyles}
              onClick={submit}
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
