// What stands where the garage would be on a Followers-only profile I am not accepted on
// (garage: null): the lock and the way in - ask, or wait on the ask already made. The
// button is up in the hero, not here.
import type { ReactElement } from "react";
import { Paper, Stack, Text } from "@mantine/core";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProfileRelation } from "../profile.types";
import { PANEL } from "../profileSurface";
import { VISIBILITY_COLOR } from "../profileVisibility";

interface ProfileLockedProps {
  handle: string;
  relation: ProfileRelation;
}

export function ProfileLocked({ handle, relation }: ProfileLockedProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper radius="lg" p="lg" style={PANEL}>
      <Stack align="center" gap={8}>
        <Lock size={22} color={VISIBILITY_COLOR.FOLLOWERS} />
        <Text fw={600} fz={15} c="text.6" ta="center">
          {t("sharing.lockedTitle")}
        </Text>
        <Text fz={13} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
          {t(relation === "PENDING" ? "sharing.lockedPending" : "sharing.lockedAsk", { handle })}
        </Text>
      </Stack>
    </Paper>
  );
}
