// Desktop notifications: a queue to clear. Opening it marks nothing read; acting on a row does.
import { useCallback, useState, type ReactElement } from "react";
import { Box, Button, Group, Loader, SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications as toasts } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/components/ConfirmModal";
import { canDeleteNotification, clearsOnMarkAll } from "@/features/notifications/notificationAction";
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotifications,
} from "@/features/notifications/notifications.queries";
import type { Notification } from "@/features/notifications/notifications.types";
import { NotificationDayGroups } from "@/features/notifications/ui/NotificationDayGroups";
import { NotificationQueueRow } from "@/features/notifications/ui/NotificationQueueRow";
import { NOTIFICATION_ROW_INSET } from "@/features/notifications/ui/NotificationRowParts";
import { usePendingRideOf } from "@/features/notifications/usePendingRideOf";
import { EmptyNotifications } from "./EmptyNotifications";
import { useNotificationHeaderActions } from "./useNotificationHeaderActions";

type NotificationsFilter = "all" | "unread";

export function NotificationsDesktop(): ReactElement {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<NotificationsFilter>("all");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { data: unread } = useUnreadNotifications();
  const unreadCount = unread?.length ?? 0;
  const { data: loaded } = useNotifications();
  const loadedList = loaded?.pages.flat() ?? [];

  const askDeleteAll = useCallback(() => setConfirmingDelete(true), []);

  useNotificationHeaderActions(
    loadedList.some(clearsOnMarkAll),
    loadedList.some(canDeleteNotification) ? askDeleteAll : null,
  );

  return (
    // No top padding: the unread line belongs to the header's title just above it.
    <Stack gap="md" p="xl" pt={0}>
      <Text fz={13} c="var(--color-text-dim)" className="tabular-nums">
        {unreadCount > 0 ? t("notifications.unreadCount", { count: unreadCount }) : t("notifications.allRead")}
      </Text>

      <SegmentedControl
        value={filter}
        onChange={(next) => setFilter(next === "unread" ? "unread" : "all")}
        withItemsBorders={false}
        w={240}
        classNames={{ label: "data-[active]:!text-[var(--mantine-color-text-6)] data-[active]:font-bold" }}
        data={[
          { value: "all", label: t("notifications.filterAll") },
          { value: "unread", label: t("notifications.filterUnread") },
        ]}
      />

      {filter === "all" ? <AllNotifications /> : <UnreadNotifications />}

      <DeleteAllConfirm opened={confirmingDelete} onClose={() => setConfirmingDelete(false)} />
    </Stack>
  );
}

function DeleteAllConfirm({ opened, onClose }: { opened: boolean; onClose: () => void }): ReactElement {
  const { t } = useTranslation();
  const removeAll = useDeleteAllNotifications();

  return (
    <ConfirmModal
      opened={opened}
      onCancel={onClose}
      onConfirm={() => removeAll.mutate(undefined, { onSuccess: onClose })}
      title={t("notifications.deleteAllConfirmTitle")}
      body={t("notifications.deleteAllConfirmBody")}
      cancelLabel={t("notifications.deleteAllConfirmCancel")}
      confirmLabel={t("notifications.deleteAllConfirmAction")}
      pending={removeAll.isPending}
    >
      {removeAll.isError && (
        <Text fz={13} c="red.5">
          {t("notifications.deleteFailed")}
        </Text>
      )}
    </ConfirmModal>
  );
}

// Marked read first, so the badge drops by one as the owner works down the list.
function useOpenNotification(): (notification: Notification, route: string | null) => void {
  const navigate = useNavigate();
  const { mutate: markRead } = useMarkNotificationRead();

  return (notification, route) => {
    if (!notification.is_read) markRead(notification.id);
    if (route !== null) navigate(route);
  };
}

function AllNotifications(): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useNotifications();

  if (isLoading) return <CenteredLoader />;
  if (isError) return <LoadFailed />;

  const notifications = data?.pages.flat() ?? [];
  if (notifications.length === 0) return <EmptyNotifications />;

  return (
    <NotificationList notifications={notifications}>
      {hasNextPage && (
        <Group justify="center" mih={44} mt="xs">
          <Button
            variant="subtle"
            color="primary.6"
            radius="md"
            size="sm"
            loading={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {t("notifications.showOlder")}
          </Button>
        </Group>
      )}
    </NotificationList>
  );
}

function UnreadNotifications(): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useUnreadNotifications();

  if (isLoading) return <CenteredLoader />;
  if (isError) return <LoadFailed />;
  if (data === undefined || data.length === 0) {
    return (
      <Text fz={13} c="var(--color-text-dim)">
        {t("notifications.nothingUnread")}
      </Text>
    );
  }

  return <NotificationList notifications={data} />;
}

// Flat on the page like the phone's list. It bleeds by the row inset, so the marks line up with the
// title above and the unread dots hang outside the column.
function NotificationList({
  notifications,
  children,
}: {
  notifications: Notification[];
  children?: ReactElement | false;
}): ReactElement {
  const open = useOpenNotification();
  const remove = useDeleteRow();
  const pendingRideOf = usePendingRideOf();

  return (
    <Box mx={-NOTIFICATION_ROW_INSET}>
      <NotificationDayGroups
        notifications={notifications}
        renderRow={(notification, day, first) => (
          <NotificationQueueRow
            key={notification.id}
            notification={notification}
            day={day}
            first={first}
            pendingRide={pendingRideOf(notification)}
            onOpen={open}
            onDelete={remove}
          />
        )}
      />
      {children}
    </Box>
  );
}

// No confirm: one row is cheap to lose, and asking on every bin would slow clearing the queue.
function useDeleteRow(): (notification: Notification) => void {
  const { t } = useTranslation();
  const { mutate } = useDeleteNotification();

  return (notification) =>
    mutate(notification.id, {
      onError: () => toasts.show({ color: "red.5", message: t("notifications.deleteFailed") }),
    });
}

function CenteredLoader(): ReactElement {
  return (
    <Group justify="center" p="xl">
      <Loader size="sm" />
    </Group>
  );
}

function LoadFailed(): ReactElement {
  const { t } = useTranslation();
  return (
    <Text size="sm" c="red.5">
      {t("notifications.loadFailed")}
    </Text>
  );
}
