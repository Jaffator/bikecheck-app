// What stands where the garage would be on a Followers-only profile I am not accepted on
// (garage: null). Follow (PRD 2) adds the request button and the waiting sentence.
import type { ReactElement } from "react";
import { Paper, Stack, Text } from "@mantine/core";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PANEL } from "../profileSurface";
import { VISIBILITY_COLOR } from "../profileVisibility";

export function ProfileLocked(): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper radius="lg" p="lg" style={PANEL}>
      <Stack align="center" gap={8}>
        <Lock size={22} color={VISIBILITY_COLOR.FOLLOWERS} />
        <Text fw={600} fz={15} c="text.6" ta="center">
          {t("sharing.lockedTitle")}
        </Text>
        <Text fz={13} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
          {t("sharing.lockedBody")}
        </Text>
      </Stack>
    </Paper>
  );
}
