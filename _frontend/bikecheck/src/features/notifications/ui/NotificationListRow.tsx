// One phone notification: the whole row is the button, and the time shares the title's line.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { notificationTime, type NotificationDay } from "@/features/notifications/notificationTime";
import type { Notification } from "@/features/notifications/notifications.types";
import type { PendingRide } from "@/features/strava/strava.types";
import {
  NOTIFICATION_ROW_GAP,
  NOTIFICATION_ROW_INSET,
  NOTIFICATION_ROW_MIN_HEIGHT,
  NotificationMark,
  NotificationRowDetail,
  NotificationRowTitle,
  NotificationUnreadDot,
} from "./NotificationRowParts";

interface NotificationListRowProps {
  notification: Notification;
  day: NotificationDay;
  // The first row of a day draws no hairline above it.
  first: boolean;
  pendingRide: PendingRide | undefined;
  onOpen: (notification: Notification) => void;
}

export function NotificationListRow({ notification, day, first, pendingRide, onOpen }: NotificationListRowProps): ReactElement {
  return (
    <UnstyledButton
      onClick={() => onOpen(notification)}
      className="hover-veil active:opacity-70"
      style={{
        position: "relative",
        display: "flex",
        gap: NOTIFICATION_ROW_GAP,
        width: "100%",
        paddingLeft: NOTIFICATION_ROW_INSET,
        textAlign: "left",
        transition: "opacity 0.12s ease",
      }}
    >
      {!notification.is_read && <NotificationUnreadDot />}
      <NotificationMark notification={notification} pendingRide={pendingRide} />

      <Box
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: NOTIFICATION_ROW_MIN_HEIGHT,
          padding: `${NOTIFICATION_ROW_GAP}px ${NOTIFICATION_ROW_INSET}px ${NOTIFICATION_ROW_GAP}px 0`,
          borderTop: first ? undefined : PANEL_HAIRLINE,
        }}
      >
        <Stack gap={2}>
          <Group gap={NOTIFICATION_ROW_GAP} wrap="nowrap" align="baseline">
            <NotificationRowTitle notification={notification} />
            <Text className="tabular-nums" fz={12} lh="16px" c="var(--color-muted)" style={{ flexShrink: 0 }}>
              {notificationTime(notification.created_at, day)}
            </Text>
          </Group>
          <NotificationRowDetail notification={notification} pendingRide={pendingRide} />
        </Stack>
      </Box>
    </UnstyledButton>
  );
}
