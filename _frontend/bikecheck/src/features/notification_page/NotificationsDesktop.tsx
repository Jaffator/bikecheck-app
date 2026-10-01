// Desktop notifications: a queue to clear. Opening it marks nothing read; acting on a row does.
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { ActionIcon, Button, Group, Loader, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications as toasts } from "@mantine/notifications";
import { Settings, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { canDeleteNotification } from "@/features/notifications/notificationAction";
import { groupByDay } from "@/features/notifications/notificationTime";
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotifications,
} from "@/features/notifications/notifications.queries";
import type { Notification } from "@/features/notifications/notifications.types";
import { NotificationQueueRow } from "@/features/notifications/ui/NotificationQueueRow";
import { useHeaderStore } from "@/store/store";
import { EmptyNotifications } from "./EmptyNotifications";

type NotificationsFilter = "all" | "unread";

export function NotificationsDesktop(): ReactElement {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<NotificationsFilter>("all");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { data: unread } = useUnreadNotifications();
  const unreadCount = unread?.length ?? 0;
  const { data: loaded } = useNotifications();
  const canDeleteAll = (loaded?.pages.flat() ?? []).some(canDeleteNotification);

  const askDeleteAll = useCallback(() => setConfirmingDelete(true), []);

  useHeaderActions(unreadCount, canDeleteAll, askDeleteAll);

  return (
    // No top padding: the unread line belongs to the header's title just above it.
    <Stack gap="md" p="xl" pt={0}>
      <Text fz={13} c="var(--color-text-dim)" className="tabular-nums">
        {unreadCount > 0 ? t("notifications.unreadCount", { count: unreadCount }) : t("notifications.allRead")}
      </Text>

      <SegmentedControl
        value={filter}
        onChange={(next) => setFilter(next === "unread" ? "unread" : "all")}
        radius="md"
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

// Mark all as read, delete all and the gear to Settings hang in the header beside the title.
function useHeaderActions(unreadCount: number, canDeleteAll: boolean, onDeleteAll: () => void): void {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const { mutate: markAll, isPending } = useMarkAllNotificationsRead();

  useEffect(() => {
    setActionSlot(
      <Group gap="sm" wrap="nowrap">
        {unreadCount > 0 && (
          <Button variant="subtle" color="primary.6" radius="md" loading={isPending} onClick={() => markAll()}>
            {t("notifications.markAllRead")}
          </Button>
        )}
        {canDeleteAll && (
          <Button
            variant="outline"
            radius="md"
            leftSection={<Trash2 size={16} color="var(--mantine-color-red-5)" />}
            onClick={onDeleteAll}
          >
            {t("notifications.deleteAll")}
          </Button>
        )}
        <ActionIcon
          variant="outline"
          radius="md"
          size="lg"
          aria-label={t("notifications.settingsAria")}
          onClick={() => navigate("/settings")}
        >
          <Settings size={16} />
        </ActionIcon>
      </Group>,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, t, navigate, markAll, isPending, unreadCount, canDeleteAll, onDeleteAll]);
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
        <Group justify="center" mih={44} mt={12} pt={8} style={{ borderTop: PANEL_HAIRLINE }}>
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

// One card surface; group labels split it by the user's local day.
function NotificationList({
  notifications,
  children,
}: {
  notifications: Notification[];
  children?: ReactElement | false;
}): ReactElement {
  const { t } = useTranslation();
  const open = useOpenNotification();
  const remove = useDeleteRow();

  return (
    <Paper
      radius="lg"
      px="md"
      pt={4}
      pb={8}
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      {groupByDay(notifications).map((group, index) => (
        <Stack key={group.notifications[0].id} gap={0}>
          <Group mih={36} mt={index === 0 ? 0 : 6} style={index === 0 ? undefined : { borderTop: PANEL_HAIRLINE }}>
            <Eyebrow>{t(`notifications.group.${group.day}`)}</Eyebrow>
          </Group>
          {group.notifications.map((notification) => (
            <NotificationQueueRow
              key={notification.id}
              notification={notification}
              day={group.day}
              onOpen={open}
              onDelete={remove}
            />
          ))}
        </Stack>
      ))}
      {children}
    </Paper>
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
