// Renders pairing state through query hooks.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/features/users/users.queries";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";

interface StravaPairingHintProps {
  // The bike's gear id. Null means it collects no rides from Strava.
  stravaGearId: string | null;
}

// Shows an unobtrusive hint only for unpaired bikes on linked accounts.
export function StravaPairingHint({ stravaGearId }: StravaPairingHintProps): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();

  if (!user?.strava_athlete_id) return null;
  if (stravaGearId !== null) return null;

  return (
    <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
      <StravaMark width={14} height={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
      {/* The card's data voice, so the hint sits level with the figures beside it. */}
      <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
        {t("strava.notPaired")}
      </Text>
    </Group>
  );
}
