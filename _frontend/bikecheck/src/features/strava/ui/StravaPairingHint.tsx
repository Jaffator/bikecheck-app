// Renders pairing state through query hooks.
import { useState, type ReactElement, type SyntheticEvent } from "react";
import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/features/users/users.queries";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import { GearLinkingSheet } from "./GearLinkingSheet";

interface StravaPairingHintProps {
  bikeId: number;
  // The bike's gear id. Null means it collects no rides from Strava.
  stravaGearId: string | null;
}

// Events from the sheet's portal still bubble through React, so the card under it must not hear them.
function keepFromCard(event: SyntheticEvent): void {
  event.stopPropagation();
}

// Shows an unobtrusive hint only for unpaired bikes on linked accounts, with the way to pair it.
export function StravaPairingHint({ bikeId, stravaGearId }: StravaPairingHintProps): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const [pairing, setPairing] = useState(false);

  if (!user?.strava_athlete_id) return null;
  if (stravaGearId !== null) return null;

  return (
    <Box onClick={keepFromCard} onKeyDown={keepFromCard} ml="auto" style={{ minWidth: 0 }}>
      <Group gap={6} wrap="nowrap">
        <StravaMark width={14} height={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
        <Text fz={12} c="var(--color-text-dim)" lineClamp={1}>
          {t("strava.notPaired")}
        </Text>
        <UnstyledButton onClick={() => setPairing(true)} fz={12} fw={600} c="strava.6" style={{ flexShrink: 0 }}>
          {t("strava.pair")}
        </UnstyledButton>
      </Group>
      <GearLinkingSheet opened={pairing} onClose={() => setPairing(false)} bikeIds={[bikeId]} />
    </Box>
  );
}
