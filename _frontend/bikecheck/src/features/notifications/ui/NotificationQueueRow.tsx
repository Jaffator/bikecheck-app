// One desktop notification: icon, title and body, its one action, then time and the unread dot.
import type { MouseEvent, ReactElement } from "react";
import { Box, Button, Group, Stack, Text, type ButtonProps } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { PANEL_HAIRLINE, PRESS_TRANSITION, onPanelRowKey } from "@/components/panelRows";
import { notificationAction, type ActionEmphasis, type NotificationAction } from "@/features/notifications/notificationAction";
import { NOTIFICATION_ICONS, notificationIconColor } from "@/features/notifications/notificationIcon";
import { notificationTime, type NotificationDay } from "@/features/notifications/notificationTime";
import type { Notification } from "@/features/notifications/notifications.types";

const QUEUE_COLUMNS = "32px minmax(0, 1fr) auto 96px";

interface NotificationQueueRowProps {
  notification: Notification;
  day: NotificationDay;
  onOpen: (notification: Notification, route: string | null) => void;
}

export function NotificationQueueRow({ notification, day, onOpen }: NotificationQueueRowProps): ReactElement {
  const unread = !notification.is_read;
  const action = notificationAction(notification);
  const Icon = NOTIFICATION_ICONS[notification.type];
  const iconColor = notificationIconColor(notification, unread);
  const open = (): void => onOpen(notification, action?.route ?? null);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => onPanelRowKey(event, open)}
      className="hover-veil"
      style={{
        display: "grid",
        gridTemplateColumns: QUEUE_COLUMNS,
        alignItems: "center",
        gap: 14,
        minHeight: 64,
        padding: "10px 0",
        borderTop: PANEL_HAIRLINE,
        cursor: "pointer",
        transition: PRESS_TRANSITION,
      }}
    >
      <Box
        w={32}
        h={32}
        style={{
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // The icon's own colour, faint, so the circle reads as its tint.
          backgroundColor: `color-mix(in srgb, ${iconColor} 14%, transparent)`,
        }}
      >
        {Icon !== undefined && <Icon size={16} color={iconColor} />}
      </Box>

      <Stack gap={2} style={{ minWidth: 0 }}>
        <Text fz={13} fw={600} c={unread ? "text.6" : "var(--color-text-dim)"} lineClamp={1}>
          {notification.title}
        </Text>
        <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
          {notification.body}
        </Text>
      </Stack>

      {action === null ? <span /> : <ActionButton action={action} onClick={open} />}

      <Group gap={8} justify="flex-end" wrap="nowrap">
        <Text className="tabular-nums" fz={13} c="var(--color-text-dim)">
          {notificationTime(notification.created_at, day)}
        </Text>
        {unread && (
          <Box w={8} h={8} style={{ borderRadius: "50%", backgroundColor: "var(--mantine-color-primary-6)", flexShrink: 0 }} />
        )}
      </Group>
    </Box>
  );
}

// Filled for what needs the owner (primary-button rule), quiet outline for a look, text for the rest.
const EMPHASIS_PROPS: Record<ActionEmphasis, ButtonProps> = {
  filled: { color: "primary.6", c: "textDark.6" },
  outline: { variant: "outline" },
  text: { variant: "subtle", color: "primary.6" },
};

function ActionButton({ action, onClick }: { action: NotificationAction; onClick: () => void }): ReactElement {
  const { t } = useTranslation();
  // The row opens the same place; stopped so one click is one open.
  const click = (event: MouseEvent): void => {
    event.stopPropagation();
    onClick();
  };

  return (
    <Button size="xs" radius="md" {...EMPHASIS_PROPS[action.emphasis]} onClick={click}>
      {t(action.labelKey)}
    </Button>
  );
}
