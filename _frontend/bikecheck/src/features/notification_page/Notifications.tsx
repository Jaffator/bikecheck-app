// Notifications page.
import type { ReactElement } from "react";
import { Box, Group, Loader, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BellOff } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useNotifications, useMarkNotificationRead } from "@/features/notifications/notifications.queries";
import { notificationRoute } from "@/features/notifications/notificationRoute";
import type { Notification } from "@/features/notifications/notifications.types";

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
        className="active:scale-[0.985]"
      >
        <Group gap="sm" wrap="nowrap" align="flex-start">
          {/* Reserve space for the unread indicator. */}
          <Box w={8} pt={6} style={{ flexShrink: 0 }}>
            {unread && (
              <Box
                w={8}
                h={8}
                style={{
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-primary-6)",
                }}
              />
            )}
          </Box>

          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={unread ? 600 : 500} fz={15} c={unread ? "text.6" : "var(--color-text-dim)"} lh={1.3}>
              {notification.title}
            </Text>
            <Text fz={13} c="var(--color-text-dim)" lh={1.4}>
              {notification.body}
            </Text>
            <Text className="font-mono" fz={10} tt="uppercase" c="var(--color-text-dim)">
              {dayjs(notification.created_at).fromNow()}
            </Text>
          </Stack>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

export function Notifications(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();

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

  const notifications = data ?? [];

  if (notifications.length === 0) {
    return (
      <Stack align="center" gap="sm" pt="20dvh" px="xl">
        <BellOff size={32} color="var(--mantine-color-text-9)" />
        <Text fw={600} fz={17} c="text.6" ta="center">
          {t("notifications.empty")}
        </Text>
        <Text size="sm" c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
          {t("notifications.emptyBody")}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="sm" className="m-3">
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} onOpen={openNotification} />
      ))}
    </Stack>
  );
}
