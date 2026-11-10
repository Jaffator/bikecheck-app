// Notifications page.
import { useEffect, useMemo, type ReactElement } from "react";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { clearsOnMarkAll } from "@/features/notifications/notificationAction";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkNotificationsViewed,
} from "@/features/notifications/notifications.queries";
import { notificationRoute } from "@/features/notifications/notificationRoute";
import type { Notification } from "@/features/notifications/notifications.types";
import { NotificationDayGroups } from "@/features/notifications/ui/NotificationDayGroups";
import { NotificationListRow } from "@/features/notifications/ui/NotificationListRow";
import { usePendingRideOf } from "@/features/notifications/usePendingRideOf";
import { useIsDesktop } from "@/layout/breakpoints";
import { EmptyNotifications } from "./EmptyNotifications";
import { NotificationsDesktop } from "./NotificationsDesktop";
import { useNotificationHeaderActions } from "./useNotificationHeaderActions";

export function Notifications(): ReactElement {
  const isDesktop = useIsDesktop();
  return isDesktop ? <NotificationsDesktop /> : <NotificationsPhone />;
}

function NotificationsPhone(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useNotifications();
  const markRead = useMarkNotificationRead();
  const { mutate: markViewed } = useMarkNotificationsViewed();
  const pendingRideOf = usePendingRideOf();
  const notifications = useMemo(() => data?.pages.flat() ?? [], [data]);

  useNotificationHeaderActions(notifications.some(clearsOnMarkAll), null);

  // Opening the list is what clears the badge - of the announcements, at least. An
  // unassigned ride stays counted until a bike is picked for it, so the number that
  // remains is the number of things still waiting on the user.
  useEffect(() => {
    markViewed();
  }, [markViewed]);

  // Mark unread notifications as read when opened.
  function openNotification(notification: Notification): void {
    if (!notification.is_read) markRead.mutate(notification.id);

    const route = notificationRoute(notification.type, notification.payload);
    if (route !== null) navigate(route);
  }

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (isError) {
    return (
      <Text size="sm" c="red.5" className="m-3">
        {t("notifications.loadFailed")}
      </Text>
    );
  }

  if (notifications.length === 0) return <EmptyNotifications />;

  return (
    <Stack gap={0} pb="md">
      <NotificationDayGroups
        notifications={notifications}
        renderRow={(notification, day, first) => (
          <NotificationListRow
            key={notification.id}
            notification={notification}
            day={day}
            first={first}
            pendingRide={pendingRideOf(notification)}
            onOpen={openNotification}
          />
        )}
      />
      {hasNextPage && (
        <Button
          variant="subtle"
          color="primary.6"
          radius="md"
          mt="xs"
          loading={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          style={{ alignSelf: "center" }}
        >
          {t("notifications.showOlder")}
        </Button>
      )}
    </Stack>
  );
}
