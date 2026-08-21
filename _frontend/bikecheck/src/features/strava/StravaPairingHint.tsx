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
    <Group gap={6} wrap="nowrap">
      <StravaMark width={14} height={14} color="var(--color-text-dim)" />
      <Text fz={15} c="var(--color-text-dim)">
        {t("strava.notPaired")}
      </Text>
    </Group>
  );
}
