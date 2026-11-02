// The drawer's bike and check-in, held until "Uložit" writes both and closes it.
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { checkInOf, draftOf, sameCheckIn, type CheckInDraft } from "@/features/rides/checkIn";
import type { BikePick } from "@/features/rides/checkInSave";
import { initialPickOf, movedTo, saveStateOf, type RideItem, type SaveState } from "@/features/rides/rideDetail";
import {
  useChangeRideBike,
  useDeleteRideCheckIn,
  useDismissRide,
  useSaveRideCheckIn,
} from "@/features/rides/rides.queries";
import type { CheckInStatus, Ride } from "@/features/rides/rides.types";
import { useDismissPendingRide, useResolvePendingRide } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";

export interface RideCheckInState {
  // Null for an Unassigned Ride until a bike is picked.
  pick: BikePick | null;
  setPick: (pick: BikePick) => void;
  draft: CheckInDraft;
  setDraft: (draft: CheckInDraft) => void;
  save: SaveState;
  saving: boolean;
  submit: () => Promise<void>;
}

export function useRideCheckIn(item: RideItem, onSaved: () => void, startWith?: CheckInStatus): RideCheckInState {
  const { t } = useTranslation();
  const changeBike = useChangeRideBike();
  const saveCheckIn = useSaveRideCheckIn();
  const deleteCheckIn = useDeleteRideCheckIn();
  const dismiss = useDismissRide();
  const resolve = useResolvePendingRide();
  const dismissPending = useDismissPendingRide();
  const [pick, setPick] = useState<BikePick | null>(initialPickOf(item));
  const [draft, setDraft] = useState<CheckInDraft>(
    draftOf(item.kind === "ride" ? item.ride.check_in : null, startWith),
  );
  const checkIn = checkInOf(draft);

  async function submit(): Promise<void> {
    const written = item.kind === "ride" ? await writeRide(item.ride) : await writePending(item.ride);
    if (written) onSaved();
  }

  // The bike moves first, so the check-in lands on the ride where it now is.
  async function writeRide(ride: Ride): Promise<boolean> {
    if (pick?.kind === "notMine") return succeeded(dismiss.mutateAsync(ride.id), "pendingRides.dismissFailed");
    const moveTo = movedTo(ride, pick);
    const moving = moveTo === null ? null : changeBike.mutateAsync({ rideId: ride.id, bikeId: moveTo });
    if (moving !== null && !(await succeeded(moving, "rides.changeBikeFailed"))) return false;
    // A cleared answer on a ride that had one deletes it.
    if (sameCheckIn(checkIn, ride.check_in)) return true;
    return checkIn === null
      ? succeeded(deleteCheckIn.mutateAsync(ride.id), "checkIn.deleteFailed")
      : succeeded(saveCheckIn.mutateAsync({ rideId: ride.id, checkIn }), "checkIn.saveFailed");
  }

  // Once the ride exists it closes even if the check-in fails: assigning again would find nothing.
  async function writePending(ride: PendingRide): Promise<boolean> {
    if (pick === null) return false;
    if (pick.kind === "notMine") {
      return succeeded(dismissPending.mutateAsync(ride.activity_id), "pendingRides.dismissFailed");
    }
    const resolved = await attempt(
      resolve.mutateAsync({ activityId: ride.activity_id, bikeId: pick.bikeId }),
      "pendingRides.assignFailed",
    );
    if (resolved === null) return false;
    if (checkIn === null) return true;
    await attempt(saveCheckIn.mutateAsync({ rideId: resolved.rideId, checkIn }), "checkIn.saveFailed");
    return true;
  }

  // A failed write keeps the drawer open, told why; null stands for the failure.
  async function attempt<T>(pending: Promise<T>, failedKey: string): Promise<T | null> {
    try {
      return await pending;
    } catch {
      notifications.show({ color: "red.5", message: t(failedKey) });
      return null;
    }
  }

  async function succeeded(pending: Promise<unknown>, failedKey: string): Promise<boolean> {
    return (await attempt(pending, failedKey)) !== null;
  }

  return {
    pick,
    setPick,
    draft,
    setDraft,
    save: saveStateOf(item, pick, draft),
    saving: [changeBike, saveCheckIn, deleteCheckIn, dismiss, resolve, dismissPending].some((write) => write.isPending),
    submit,
  };
}
