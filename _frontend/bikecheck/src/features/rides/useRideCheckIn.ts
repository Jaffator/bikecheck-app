// A ride's check-in in its detail, shared by its section and the desktop action bar.
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { checkInOf, draftOf, type CheckInDraft } from "@/features/rides/checkIn";
import { useDeleteRideCheckIn, useSaveRideCheckIn } from "@/features/rides/rides.queries";
import type { CheckInStatus, Ride, RideCheckIn } from "@/features/rides/rides.types";

export interface RideCheckInState {
  saved: RideCheckIn | null;
  // Null while the form is closed.
  draft: CheckInDraft | null;
  setDraft: (draft: CheckInDraft | null) => void;
  // Null until the form holds something worth saving.
  toSave: RideCheckIn | null;
  saving: boolean;
  deleting: boolean;
  edit: () => void;
  submit: () => void;
  remove: () => void;
}

export function useRideCheckIn(ride: Ride, startWith?: CheckInStatus): RideCheckInState {
  const { t } = useTranslation();
  const save = useSaveRideCheckIn();
  const deleteCheckIn = useDeleteRideCheckIn();
  // The sheet holds a snapshot of the ride, so this keeps what it last saved itself.
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

  function remove(): void {
    deleteCheckIn.mutate(ride.id, {
      onSuccess: () => setSaved(null),
      onError: () => notifications.show({ color: "red.5", message: t("checkIn.deleteFailed") }),
    });
  }

  return {
    saved,
    draft,
    setDraft,
    toSave,
    saving: save.isPending,
    deleting: deleteCheckIn.isPending,
    edit: () => setDraft(draftOf(saved)),
    submit,
    remove,
  };
}
