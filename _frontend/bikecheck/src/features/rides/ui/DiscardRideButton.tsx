// Discards an Unassigned Ride from its detail, after a confirm.
import { useState, type ReactElement } from "react";
import { Button, Text } from "@mantine/core";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useDismissPendingRide } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import { QUIET_RED_BUTTON } from "./actionBar";

interface DiscardRideButtonProps {
  ride: PendingRide;
  // The drawer holds a snapshot of the ride, so it closes once the ride is gone.
  onDiscarded: () => void;
}

export function DiscardRideButton({ ride, onDiscarded }: DiscardRideButtonProps): ReactElement {
  const { t } = useTranslation();
  const dismiss = useDismissPendingRide();
  const [confirming, setConfirming] = useState(false);

  function cancel(): void {
    dismiss.reset();
    setConfirming(false);
  }

  function confirm(): void {
    dismiss.mutate(ride.activity_id, {
      onSuccess: () => {
        setConfirming(false);
        onDiscarded();
      },
    });
  }

  return (
    <>
      <Button
        {...QUIET_RED_BUTTON}
        radius="md"
        leftSection={<Trash2 size={14} color="var(--mantine-color-red-5)" />}
        onClick={() => setConfirming(true)}
      >
        {t("pendingRides.discard")}
      </Button>

      <ConfirmModal
        opened={confirming}
        onCancel={cancel}
        onConfirm={confirm}
        title={t("pendingRides.dismissTitle")}
        body={t("pendingRides.dismissBody")}
        cancelLabel={t("pendingRides.dismissCancel")}
        confirmLabel={t("pendingRides.dismissConfirm")}
        pending={dismiss.isPending}
      >
        {dismiss.isError && (
          <Text fz={13} c="red.5">
            {t("pendingRides.dismissFailed")}
          </Text>
        )}
      </ConfirmModal>
    </>
  );
}
