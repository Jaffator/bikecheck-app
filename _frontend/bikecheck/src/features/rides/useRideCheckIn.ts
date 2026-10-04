// A ride's bike and check-in in its detail, held until "Uložit" writes both and closes the sheet.
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { checkInOf, draftOf, sameCheckIn, type CheckInDraft } from "@/features/rides/checkIn";
import type { BikePick } from "@/features/rides/checkInSave";
import {
  useChangeRideBike,
  useDeleteRideCheckIn,
  useDismissRide,
  useSaveRideCheckIn,
} from "@/features/rides/rides.queries";
import type { CheckInStatus, Ride } from "@/features/rides/rides.types";

export interface RideCheckInState {
  pick: BikePick;
  setPick: (pick: BikePick) => void;
  // Another bike, or none of the rider's, is picked.
  moved: boolean;
  draft: CheckInDraft;
  setDraft: (draft: CheckInDraft) => void;
  dirty: boolean;
  saving: boolean;
  submit: () => Promise<void>;
}

export function useRideCheckIn(ride: Ride, onSaved: () => void, startWith?: CheckInStatus): RideCheckInState {
  const { t } = useTranslation();
  const changeBike = useChangeRideBike();
  const save = useSaveRideCheckIn();
  const deleteCheckIn = useDeleteRideCheckIn();
  const dismiss = useDismissRide();
  const [pick, setPick] = useState<BikePick>({ kind: "bike", bikeId: ride.bike_id });
  const [draft, setDraft] = useState<CheckInDraft>(draftOf(ride.check_in, startWith));

  const moveTo = pick.kind === "bike" && pick.bikeId !== ride.bike_id ? pick.bikeId : null;
  const moved = pick.kind === "notMine" || moveTo !== null;
  const checkIn = checkInOf(draft);
  // A cleared answer on a ride that had one deletes it.
  const checkInChanged = !sameCheckIn(checkIn, ride.check_in);

  // The bike moves first, so the check-in lands on the ride where it now is.
  async function submit(): Promise<void> {
    if (pick.kind === "notMine") {
      if (await succeeded(dismiss.mutateAsync(ride.id), "pendingRides.dismissFailed")) onSaved();
      return;
    }
    if (moveTo !== null) {
      const moving = changeBike.mutateAsync({ rideId: ride.id, bikeId: moveTo });
      if (!(await succeeded(moving, "rides.changeBikeFailed"))) return;
    }
    if (checkInChanged && !(await writeCheckIn())) return;
    onSaved();
  }

  function writeCheckIn(): Promise<boolean> {
    return checkIn === null
      ? succeeded(deleteCheckIn.mutateAsync(ride.id), "checkIn.deleteFailed")
      : succeeded(save.mutateAsync({ rideId: ride.id, checkIn }), "checkIn.saveFailed");
  }

  // A failed write keeps the sheet open, told why.
  async function succeeded(pending: Promise<unknown>, failedKey: string): Promise<boolean> {
    try {
      await pending;
      return true;
    } catch {
      notifications.show({ color: "red.5", message: t(failedKey) });
      return false;
    }
  }

  return {
    pick,
    setPick,
    moved,
    draft,
    setDraft,
    dirty: moved || checkInChanged,
    saving: [changeBike, save, deleteCheckIn, dismiss].some((write) => write.isPending),
    submit,
  };
}
