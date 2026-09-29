// Notifications page.
import { useEffect, type ReactElement } from "react";
import { Box, Button, Group, Loader, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkNotificationsViewed,
} from "@/features/notifications/notifications.queries";
import { notificationRoute } from "@/features/notifications/notificationRoute";
import { NOTIFICATION_ICONS, notificationIconColor } from "@/features/notifications/notificationIcon";
import type { Notification } from "@/features/notifications/notifications.types";
import { useIsDesktop } from "@/layout/breakpoints";
import { EmptyNotifications } from "./EmptyNotifications";
import { NotificationsDesktop } from "./NotificationsDesktop";

dayjs.extend(relativeTime);

// Render one notification row.
function NotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}): ReactElement {
  const unread = !notification.is_read;
  const Icon = NOTIFICATION_ICONS[notification.type];

  return (
    <UnstyledButton onClick={() => onOpen(notification)} style={{ display: "block", width: "100%", textAlign: "left" }}>
      <Paper
        bg="cards.6"
        radius="lg"
        p="md"
        style={{
          border: "1px solid var(--color-border-subtle)",
          transition: "transform 0.12s ease",
        }}
        className="hover-veil active:scale-[0.985]"
      >
        <Stack gap={4}>
          {/* The heading line: what it is on the left, whether it still wants the user on
              the right. The facts below run the full width of the card rather than
              indenting under the icon, so every line starts on the same edge. */}
          <Group gap="xs" wrap="nowrap" align="center">
            {Icon !== undefined && <Icon size={22} color={notificationIconColor(notification, unread)} style={{ flexShrink: 0 }} />}
            <Text
              fw={unread ? 600 : 500}
              fz={15}
              c={unread ? "text.6" : "var(--color-text-dim)"}
              lh={1.3}
              lineClamp={1}
              style={{ flex: 1, minWidth: 0 }}
            >
              {notification.title}
            </Text>
            {unread && (
              <Box
                w={8}
                h={8}
                style={{
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-primary-6)",
                  flexShrink: 0,
                }}
              />
            )}
          </Group>

          <Text fz={13} c="var(--color-text-dim)" lh={1.4}>
            {notification.body}
          </Text>
          <Text className="tabular-nums" fz={10} tt="uppercase" c="var(--color-text-dim)">
            {dayjs(notification.created_at).fromNow()}
          </Text>
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}

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

  const notifications = data?.pages.flat() ?? [];

  if (notifications.length === 0) return <EmptyNotifications />;

  return (
    <Stack gap="sm" className="m-3">
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} onOpen={openNotification} />
      ))}
      {hasNextPage && (
        <Button
          variant="subtle"
          color="gray"
          radius="md"
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
