// Deletes an assigned ride from its detail, after a confirm.
import { useState, type ReactElement } from "react";
import { Button, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useDismissRide } from "@/features/rides/rides.queries";
import { rideTitle } from "@/features/rides/rideTitle";
import type { Ride } from "@/features/rides/rides.types";
import { QUIET_RED_BUTTON } from "./actionBar";

interface DeleteRideButtonProps {
  ride: Ride;
  // The sheet holds a snapshot of the ride, so it closes once the ride is gone.
  onDeleted: () => void;
  // The detail's action bar: red text without a frame, at its quiet end.
  inBar?: boolean;
}

const STACK_LOOK = { variant: "outline", size: "xs", style: { alignSelf: "flex-start" } } as const;

export function DeleteRideButton({ ride, onDeleted, inBar = false }: DeleteRideButtonProps): ReactElement {
  const { t } = useTranslation();
  // Same server action as "not my bike": wear rolls back and Strava never re-imports it.
  const dismiss = useDismissRide();
  const [confirming, setConfirming] = useState(false);

  function cancel(): void {
    dismiss.reset();
    setConfirming(false);
  }

  function confirm(): void {
    dismiss.mutate(ride.id, {
      onSuccess: () => {
        setConfirming(false);
        notifications.show({ message: t("rides.deleted") });
        onDeleted();
      },
    });
  }

  return (
    <>
      <Button
        {...(inBar ? QUIET_RED_BUTTON : STACK_LOOK)}
        radius="md"
        leftSection={<Trash2 size={14} color="var(--mantine-color-red-5)" />}
        onClick={() => setConfirming(true)}
      >
        {t("rides.delete")}
      </Button>

      <ConfirmModal
        opened={confirming}
        onCancel={cancel}
        onConfirm={confirm}
        title={t("rides.deleteTitle")}
        body={t("rides.deleteBody", { ride: rideTitle(ride, t("rides.unknownBike")) })}
        cancelLabel={t("rides.deleteCancel")}
        confirmLabel={t("rides.deleteConfirm")}
        pending={dismiss.isPending}
      >
        {dismiss.isError && (
          <Text fz={13} c="red.5">
            {t("rides.deleteFailed")}
          </Text>
        )}
      </ConfirmModal>
    </>
  );
}
