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

export function InAppNotification({ notification, onDismiss, autoDismissMs = 5000 }: InAppNotificationProps): ReactElement {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [notification, onDismiss, autoDismissMs]);

  return (
    <div className="in-app-notification" role="alert" onClick={onDismiss}>
      {/* The pending-ride card's lighting, so a push reads as the same surface
          the app shows it on once opened. */}
      <Paper
        radius="lg"
        p="md"
        style={{
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage:
            "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
          border: "1px solid var(--color-border-subtle)",
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
        }}
      >
        <Group gap="sm" wrap="nowrap" align="center" w="100%">
          <BikecheckMark width={40} height={40} style={{ flex: "none" }} aria-hidden />
          {/* minWidth lets the column shrink below its content, without which
              the title's lineClamp has nothing to clamp against. */}
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
