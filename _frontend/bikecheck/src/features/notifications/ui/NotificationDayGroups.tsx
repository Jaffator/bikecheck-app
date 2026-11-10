// The list split by the user's local day; each page draws its own rows, keyed by the notification.
import type { ReactElement } from "react";
import { Box, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { groupByDay, type NotificationDay } from "@/features/notifications/notificationTime";
import type { Notification } from "@/features/notifications/notifications.types";
import { NOTIFICATION_ROW_INSET } from "./NotificationRowParts";

interface NotificationDayGroupsProps {
  notifications: Notification[];
  renderRow: (notification: Notification, day: NotificationDay, first: boolean) => ReactElement;
}

export function NotificationDayGroups({ notifications, renderRow }: NotificationDayGroupsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <>
      {groupByDay(notifications).map((group, index) => (
        <Stack key={group.notifications[0].id} gap={0}>
          <Box px={NOTIFICATION_ROW_INSET} pt={index === 0 ? 8 : 16} pb={4}>
            <Eyebrow>{t(`notifications.group.${group.day}`)}</Eyebrow>
          </Box>
          {group.notifications.map((notification, rowIndex) => renderRow(notification, group.day, rowIndex === 0))}
        </Stack>
      ))}
    </>
  );
}
