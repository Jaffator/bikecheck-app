// Nothing has happened yet: the page's empty state, phone and desktop alike.
import type { ReactElement } from "react";
import { Stack, Text } from "@mantine/core";
import { BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export function EmptyNotifications(): ReactElement {
  const { t } = useTranslation();
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
