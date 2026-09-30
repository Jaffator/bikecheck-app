// Nothing has happened yet: the page's empty state.
import type { ReactElement } from "react";
import { Stack, Text } from "@mantine/core";
import { BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import { useIsDesktop } from "@/layout/breakpoints";

// Matches the icon the other icon-only empty states use.
const DESKTOP_ICON_SIZE = 96;

export function EmptyNotifications(): ReactElement {
  const isDesktop = useIsDesktop();
  return isDesktop ? <EmptyNotificationsDesktop /> : <EmptyNotificationsPhone />;
}

function EmptyNotificationsDesktop(): ReactElement {
  const { t } = useTranslation();
  return (
    <EmptyStateLayout
      icon={<BellOff size={DESKTOP_ICON_SIZE} strokeWidth={1.25} />}
      title={t("notifications.empty")}
      body={t("notifications.emptyBody")}
    />
  );
}

function EmptyNotificationsPhone(): ReactElement {
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
