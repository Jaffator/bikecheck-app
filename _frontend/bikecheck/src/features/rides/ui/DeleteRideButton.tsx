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
import { BAR_BUTTON_HEIGHT } from "./actionBar";

interface DeleteRideButtonProps {
  ride: Ride;
  // The sheet holds a snapshot of the ride, so it closes once the ride is gone.
  onDeleted: () => void;
  // The detail's action bar: red text without a frame, at its quiet end.
  inBar?: boolean;
}

const BAR_LOOK = {
  variant: "subtle",
  color: "red.5",
  size: "sm",
  h: BAR_BUTTON_HEIGHT,
  // Mantine's left padding with a section: pulled back, the icon lines up with the content edge.
  style: { marginInlineStart: "calc(var(--button-padding-x) / -1.5)" },
} as const;
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
        {...(inBar ? BAR_LOOK : STACK_LOOK)}
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
