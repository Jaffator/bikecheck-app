// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Stack, Title, Text, Button } from "@mantine/core";
import { Unplug } from "lucide-react";
import { Network } from "@capacitor/network";
import { useTranslation } from "react-i18next";
import { useOfflineWhenCallApiStore } from "../../store/store";

async function tryAgainConnection(): Promise<void> {
  const { connected } = await Network.getStatus();
  if (connected) {
    useOfflineWhenCallApiStore.getState().setOfflineWhenCallApi(false);
    console.log(useOfflineWhenCallApiStore.getState().isOfflineWhenCallApi);
  }
}

export function OfflinePage(): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack
      align="center"
      justify="center"
      gap="md"
      py="xl"
      style={{ minHeight: "calc(100dvh - var(--app-shell-header-height, 0px) - var(--app-shell-footer-height, 0px))" }}
    >
      <Unplug size={48} color="var(--mantine-color-primary-6)" />
      <Title order={3} c="text.6">
        {t("offline.title")}
      </Title>
      <Text c="dimmed" ta="center">
        {t("offline.description")}
      </Text>
      <Button w="90%" onClick={() => tryAgainConnection()}>
        {t("action.retry")}
      </Button>
    </Stack>
  );
}
