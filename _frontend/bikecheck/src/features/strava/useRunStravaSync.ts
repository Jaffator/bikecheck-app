// One Strava sync with its toast, shared by desktop's button and the phone's pull.
import { useCallback } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { useSyncStrava } from "./strava.queries";

export interface StravaSyncRun {
  // Never rejects: a failure is told by the toast, so a pull still settles.
  run: () => Promise<void>;
  isPending: boolean;
}

export function useRunStravaSync(): StravaSyncRun {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useSyncStrava();

  const run = useCallback(async (): Promise<void> => {
    try {
      const { queued } = await mutateAsync();
      notifications.show({
        message: queued > 0 ? t("strava.syncQueued", { count: queued }) : t("strava.syncNothing"),
      });
    } catch (error) {
      // A 429 means another tab or device synced first; the refetched user brings the cooldown.
      const tooSoon = error instanceof ApiError && error.status === 429;
      notifications.show({ color: "red.5", message: tooSoon ? t("strava.syncTooSoon") : t("strava.syncFailed") });
    }
  }, [mutateAsync, t]);

  return { run, isPending };
}
