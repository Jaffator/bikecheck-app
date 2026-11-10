// Mark all as read, delete all where the page offers it, and the gear to Settings: icons beside the title.
import { useEffect } from "react";
import { Group } from "@mantine/core";
import { CheckCheck, Settings, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMarkAllNotificationsRead } from "@/features/notifications/notifications.queries";
import { useIsDesktop } from "@/layout/breakpoints";
import { useHeaderStore } from "@/store/store";
import { NotificationHeaderIcon } from "./NotificationHeaderIcon";

const ICON_SIZE = 20;

// `onDeleteAll` is null where nothing can be deleted, and always on the phone, which has no delete all.
export function useNotificationHeaderActions(canClear: boolean, onDeleteAll: (() => void) | null): void {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const { mutate: markAll, isPending } = useMarkAllNotificationsRead();

  useEffect(() => {
    setActionSlot(
      <Group gap={4} wrap="nowrap">
        {canClear && (
          <NotificationHeaderIcon
            label={t("notifications.markAllRead")}
            tooltip={isDesktop}
            loading={isPending}
            onClick={() => markAll()}
          >
            <CheckCheck size={ICON_SIZE} color="var(--color-muted)" />
          </NotificationHeaderIcon>
        )}
        {onDeleteAll !== null && (
          <NotificationHeaderIcon label={t("notifications.deleteAll")} tooltip={isDesktop} onClick={onDeleteAll}>
            <Trash2 size={ICON_SIZE} color="var(--color-muted)" />
          </NotificationHeaderIcon>
        )}
        <NotificationHeaderIcon label={t("notifications.settingsAria")} tooltip={isDesktop} onClick={() => navigate("/settings")}>
          <Settings size={ICON_SIZE} color="var(--color-muted)" />
        </NotificationHeaderIcon>
      </Group>,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, t, navigate, isDesktop, markAll, isPending, canClear, onDeleteAll]);
}
