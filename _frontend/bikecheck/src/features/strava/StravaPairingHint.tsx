// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/features/users/users.queries";
import StravaMark from "@/assets/icons/bikecheck/strava.svg?react";

interface StravaPairingHintProps {
  // The bike's gear id. Null means it collects no rides from Strava.
  stravaGearId: string | null;
}

// Sits among a bike's stats and says the bike is not collecting rides. Kept in
// the dim stat colour on purpose: an unpaired bike is a normal state — one that
// only ever ran on a trainer never needs gear — so it must not read as a fault
// next to real warnings like a worn brake pad.
// Renders nothing without a linked account: there is nothing to pair with, and
// nothing for a paired bike either — the badge over its photo already says so.
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
