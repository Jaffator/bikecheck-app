// Stands over the page while the network is gone, so whatever the user was in the middle of
// stays mounted underneath - a wizard keeps its steps.
import { useState, type ReactElement } from "react";
import { Box, Button, Loader, Modal, Stack, Text, Title } from "@mantine/core";
import { RefreshCw, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Network } from "@/api/network";
import { useOfflineWhenCallApiStore } from "@/store/store";

// Above ConfirmModal (400), which may be open when the connection drops.
const OFFLINE_Z_INDEX = 500;
// Keeps "Reconnecting" readable even when the probe answers at once.
const MIN_RETRY_MS = 1200;

interface OfflineModalProps {
  opened: boolean;
  onReconnected: () => void;
}

async function probeConnection(): Promise<boolean> {
  const [status] = await Promise.all([
    Network.getStatus(),
    new Promise<void>((resolve) => setTimeout(resolve, MIN_RETRY_MS)),
  ]);
  return status.connected;
}

export function OfflineModal({ opened, onReconnected }: OfflineModalProps): ReactElement {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);
  const Icon = retrying ? RefreshCw : WifiOff;

  async function retry(): Promise<void> {
    setRetrying(true);
    const connected = await probeConnection();
    setRetrying(false);
    if (!connected) return;
    useOfflineWhenCallApiStore.getState().setOfflineWhenCallApi(false);
    onReconnected();
  }

  return (
    <Modal
      opened={opened}
      onClose={() => undefined}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      radius="lg"
      padding="lg"
      zIndex={OFFLINE_Z_INDEX}
      overlayProps={{ backgroundOpacity: 0.64, blur: 6 }}
      styles={{ content: { backgroundColor: "var(--mantine-color-cards-6)" } }}
    >
      <Stack gap="lg" align="center" justify="center" className="text-center">
        <Stack gap="lg" align="center" className="p-3">
          <Icon
            size={32}
            strokeWidth={2.2}
            color="var(--mantine-color-primary-6)"
            className={retrying ? "animate-spin" : undefined}
            aria-hidden
          />

          <Stack gap={6}>
            <Title order={2} fz={20} fw={700} lts="var(--tracking-title)" c="text.6">
              {retrying ? t("offline.reconnectingTitle") : t("offline.title")}
            </Title>
            <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.5 }}>
              {retrying ? t("offline.reconnectingDescription") : t("offline.description")}
            </Text>
          </Stack>
        </Stack>

        {/* Dimmed rather than disabled: Mantine's disabled grey would drop the accent. */}
        <Button
          fullWidth
          size="md"
          radius="lg"
          color="primary.6"
          c="textDark.6"
          leftSection={retrying ? <Loader size={18} color="textDark.6" /> : null}
          onClick={() => void retry()}
          style={retrying ? { opacity: 0.6, pointerEvents: "none" } : undefined}
        >
          {retrying ? t("offline.retrying") : t("action.retry")}
        </Button>
      </Stack>
    </Modal>
  );
}
