// Deletes an assigned ride from its detail, after a confirm.
import { useState, type ReactElement } from "react";
import { Button, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/components/ConfirmModal";
import { lastRideDate } from "@/features/bikes/lastRideDate";
import { useDismissRide } from "@/features/rides/rides.queries";
import type { Ride } from "@/features/rides/rides.types";

interface DeleteRideButtonProps {
  ride: Ride;
  // The sheet holds a snapshot of the ride, so it closes once the ride is gone.
  onDeleted: () => void;
}

export function DeleteRideButton({ ride, onDeleted }: DeleteRideButtonProps): ReactElement {
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
        variant="outline"
        radius="md"
        size="xs"
        leftSection={<Trash2 size={14} color="var(--mantine-color-red-5)" />}
        style={{ alignSelf: "flex-start" }}
        onClick={() => setConfirming(true)}
      >
        {t("rides.delete")}
      </Button>

      <ConfirmModal
        opened={confirming}
        onCancel={cancel}
        onConfirm={confirm}
        title={t("rides.deleteTitle")}
        body={t("rides.deleteBody", { ride: rideLine(ride) })}
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

// "Morning Ride · 42 km · 3. 9.", so the user sees which ride goes.
function rideLine(ride: Ride): string {
  const km = `${Math.round((ride.distance_m ?? 0) / 1000)} km`;
  const date = ride.started_at === null ? null : lastRideDate(ride.started_at);
  return [ride.name, km, date].filter((part) => part !== null).join(" · ");
}
