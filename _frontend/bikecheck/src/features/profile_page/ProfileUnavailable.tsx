// The one screen for a profile that cannot be opened: Off, no profile, a deleted account or
// a handle that was renamed away. One answer, so which of them it is cannot be told.
import type { ReactElement } from "react";
import { Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

export function ProfileUnavailable(): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack align="center" gap={6} pt="22dvh" px="xl">
      <Text fw={600} fz={17} c="text.6" ta="center">
        {t("sharing.unavailableTitle")}
      </Text>
      <Text fz={13} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
        {t("sharing.unavailableBody")}
      </Text>
    </Stack>
  );
}
