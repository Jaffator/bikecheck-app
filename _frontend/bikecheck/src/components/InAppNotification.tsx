import { useEffect, type ReactElement } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import type { PushNotificationSchema } from "@capacitor/push-notifications";
import BikecheckMark from "@/assets/icons/bikecheck/onlylogo.svg?react";
import "./InAppNotification.css";

interface InAppNotificationProps {
  notification: PushNotificationSchema;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function InAppNotification({
  notification,
  onDismiss,
  autoDismissMs = 5000,
}: InAppNotificationProps): ReactElement {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [notification, onDismiss, autoDismissMs]);

  return (
    <div className="in-app-notification" role="alert" onClick={onDismiss}>
      {/* Matches the pending-ride card surface. */}
      <Paper
        radius="lg"
        p="md"
        style={{
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage: "var(--card-glow)",
          border: "1px solid var(--color-border-subtle)",
          boxShadow: "var(--elev-panel)",
        }}
      >
        <Group gap="sm" wrap="nowrap" align="center" w="100%">
          <BikecheckMark width={40} height={40} style={{ flex: "none" }} aria-hidden />
          {/* Allows title clamping within the notification column. */}
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} fz={15} c="text.6" lineClamp={1}>
              {notification.title}
            </Text>
            {notification.body && (
              <Text fz={13} c="text.7" lineClamp={2}>
                {notification.body}
              </Text>
            )}
          </Stack>
        </Group>
      </Paper>
    </div>
  );
}
