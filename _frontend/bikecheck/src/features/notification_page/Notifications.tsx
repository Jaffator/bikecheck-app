// Notifications page.
import { useEffect, useMemo, type ReactElement } from "react";
import { ActionIcon, Box, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { CheckCheck, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eyebrow } from "@/components/Eyebrow";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMarkNotificationsViewed,
} from "@/features/notifications/notifications.queries";
import { notificationRoute } from "@/features/notifications/notificationRoute";
import { groupByDay } from "@/features/notifications/notificationTime";
import type { Notification } from "@/features/notifications/notifications.types";
import { NOTIFICATION_ROW_INSET, NotificationListRow } from "@/features/notifications/ui/NotificationListRow";
import { usePendingRides } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import { useIsDesktop } from "@/layout/breakpoints";
import { useHeaderStore } from "@/store/store";
import { EmptyNotifications } from "./EmptyNotifications";
import { NotificationsDesktop } from "./NotificationsDesktop";

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
  const { data: pendingRides } = usePendingRides();
  const notifications = useMemo(() => data?.pages.flat() ?? [], [data]);
  const pendingById = useMemo(
    () => new Map((pendingRides ?? []).map((ride) => [ride.activity_id, ride])),
    [pendingRides],
  );

  usePhoneHeaderActions(notifications.some(isClearedByMarkAll));

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
      {groupByDay(notifications).map((group, index) => (
        <Stack key={group.notifications[0].id} gap={0}>
          <Box px={NOTIFICATION_ROW_INSET} pt={index === 0 ? 8 : 16} pb={4}>
            <Eyebrow>{t(`notifications.group.${group.day}`)}</Eyebrow>
          </Box>
          {group.notifications.map((notification, rowIndex) => (
            <NotificationListRow
              key={notification.id}
              notification={notification}
              day={group.day}
              first={rowIndex === 0}
              pendingRide={pendingRideOf(notification, pendingById)}
              onOpen={openNotification}
            />
          ))}
        </Stack>
      ))}
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

function pendingRideOf(notification: Notification, pendingById: Map<string, PendingRide>): PendingRide | undefined {
  const activityId = notification.payload?.activityId;
  return activityId === undefined ? undefined : pendingById.get(activityId);
}

// Mark all leaves an ask unread until its ride has a bike, so an ask alone offers nothing to clear.
function isClearedByMarkAll(notification: Notification): boolean {
  return !notification.is_read && notification.type !== "strava_activity_unassigned";
}

// Mark all as read and the gear to Settings hang in the header beside the title.
function usePhoneHeaderActions(canClear: boolean): void {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const { mutate: markAll } = useMarkAllNotificationsRead();

  useEffect(() => {
    setActionSlot(
      <Group gap={4} wrap="nowrap">
        {canClear && (
          <ActionIcon variant="transparent" size="lg" aria-label={t("notifications.markAllRead")} onClick={() => markAll()}>
            <CheckCheck size={20} color="var(--color-muted)" />
          </ActionIcon>
        )}
        <ActionIcon variant="transparent" size="lg" aria-label={t("notifications.settingsAria")} onClick={() => navigate("/settings")}>
          <Settings size={20} color="var(--color-muted)" />
        </ActionIcon>
      </Group>,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, t, navigate, markAll, canClear]);
}
