// Notifications page.
import { useEffect, type ReactElement } from "react";
import { Box, Group, Loader, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BellOff, CircleQuestionMark, TriangleAlert, UserPlus, Users } from "lucide-react";
import { PiPath } from "react-icons/pi";
import type { IconType } from "react-icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkNotificationsViewed,
} from "@/features/notifications/notifications.queries";
import { notificationRoute } from "@/features/notifications/notificationRoute";
import type { Notification, NotificationPayload, NotificationType } from "@/features/notifications/notifications.types";
import { attentionColor } from "@/features/service_tracking/attentionLevel";

dayjs.extend(relativeTime);

// The icon says what the row is, so it reads before a word of it does. A ride that landed
// carries the Rides mark, borrowed from the tab that owns the place. The ask gets a question
// mark instead of a place: it is the one row that wants something back, and the only one
// the badge goes on counting. A service reminder gets the warning sign, in the colour of
// the band it reports. A new follower is people, plainly; an ask to follow is one person
// at the door.
const ICONS: Partial<Record<NotificationType, IconType>> = {
  strava_activity_saved: PiPath,
  strava_activity_unassigned: CircleQuestionMark,
  maintenance_due: TriangleAlert,
  new_follower: Users,
  follow_request: UserPlus,
};

// Where each band begins, so the reminder wears the same colour the row on the card does.
const LEVEL_PERCENTAGE: Record<NonNullable<NotificationPayload["level"]>, number> = {
  warning: 70,
  critical: 95,
  overdue: 100,
};

// An unread reminder is coloured by its band; everything else follows the title's read state.
function iconColor(notification: Notification, unread: boolean): string {
  const level = notification.payload?.level;
  if (unread && level !== undefined) return attentionColor(LEVEL_PERCENTAGE[level]);
  return unread ? "var(--mantine-color-text-6)" : "var(--color-text-dim)";
}

// Render one notification row.
function NotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}): ReactElement {
  const unread = !notification.is_read;
  const Icon = ICONS[notification.type];

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
        <Stack gap={4}>
          {/* The heading line: what it is on the left, whether it still wants the user on
              the right. The facts below run the full width of the card rather than
              indenting under the icon, so every line starts on the same edge. */}
          <Group gap="xs" wrap="nowrap" align="center">
            {Icon !== undefined && <Icon size={22} color={iconColor(notification, unread)} style={{ flexShrink: 0 }} />}
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
          <Text className="font-mono" fz={10} tt="uppercase" c="var(--color-text-dim)">
            {dayjs(notification.created_at).fromNow()}
          </Text>
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}

export function Notifications(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useNotifications();
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
