// One desktop notification: the phone row's anatomy, with its action, time and delete in columns.
import type { MouseEvent, ReactElement } from "react";
import { ActionIcon, Box, Button, Stack, Text } from "@mantine/core";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PANEL_HAIRLINE, PRESS_TRANSITION, onPanelRowKey } from "@/components/panelRows";
import { canDeleteNotification, notificationAction, type NotificationAction } from "@/features/notifications/notificationAction";
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

// Wide enough for the longest stamp, an older day ("Wed 30. 12.").
const QUEUE_COLUMNS = "minmax(0, 1fr) auto 72px 28px";

// The row opens the same place as its action, so a quiet list need not be a column of buttons and bins.
const ON_ROW_HOVER = "opacity-0 group-hover:opacity-100 focus-visible:opacity-100";

interface NotificationQueueRowProps {
  notification: Notification;
  day: NotificationDay;
  // The first row of a day draws no hairline above it.
  first: boolean;
  pendingRide: PendingRide | undefined;
  onOpen: (notification: Notification, route: string | null) => void;
  onDelete: (notification: Notification) => void;
}

export function NotificationQueueRow({ notification, day, first, pendingRide, onOpen, onDelete }: NotificationQueueRowProps): ReactElement {
  const action = notificationAction(notification);
  const open = (): void => onOpen(notification, action?.route ?? null);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => onPanelRowKey(event, open)}
      className="hover-veil group"
      style={{
        position: "relative",
        display: "flex",
        gap: NOTIFICATION_ROW_GAP,
        paddingLeft: NOTIFICATION_ROW_INSET,
        cursor: "pointer",
        transition: PRESS_TRANSITION,
      }}
    >
      {!notification.is_read && <NotificationUnreadDot />}
      <NotificationMark notification={notification} pendingRide={pendingRide} />

      <Box
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: NOTIFICATION_ROW_MIN_HEIGHT,
          display: "grid",
          gridTemplateColumns: QUEUE_COLUMNS,
          alignItems: "center",
          gap: 14,
          padding: `${NOTIFICATION_ROW_GAP}px ${NOTIFICATION_ROW_INSET}px ${NOTIFICATION_ROW_GAP}px 0`,
          borderTop: first ? undefined : PANEL_HAIRLINE,
        }}
      >
        <Stack gap={2} style={{ minWidth: 0 }}>
          <NotificationRowTitle notification={notification} />
          <NotificationRowDetail notification={notification} pendingRide={pendingRide} />
        </Stack>

        {action === null ? <span /> : <ActionButton action={action} onClick={open} />}

        <Text className="tabular-nums" fz={12} lh="16px" c="var(--color-muted)" ta="right" style={{ whiteSpace: "nowrap" }}>
          {notificationTime(notification.created_at, day)}
        </Text>

        {canDeleteNotification(notification) ? <DeleteButton onClick={() => onDelete(notification)} /> : <span />}
      </Box>
    </Box>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = useTranslation();
  const click = (event: MouseEvent): void => {
    event.stopPropagation();
    onClick();
  };

  return (
    <ActionIcon
      variant="subtle"
      color="red.5"
      radius="md"
      aria-label={t("notifications.deleteAria")}
      onClick={click}
      onKeyDown={(event) => event.stopPropagation()}
      className={ON_ROW_HOVER}
    >
      <Trash2 size={16} />
    </ActionIcon>
  );
}

function ActionButton({ action, onClick }: { action: NotificationAction; onClick: () => void }): ReactElement {
  const { t } = useTranslation();
  // The row opens the same place; stopped so one click is one open.
  const click = (event: MouseEvent): void => {
    event.stopPropagation();
    onClick();
  };

  return (
    <Button size="xs" radius="md" variant="subtle" color="primary.6" onClick={click} className={ON_ROW_HOVER}>
      {t(action.labelKey)}
    </Button>
  );
}
