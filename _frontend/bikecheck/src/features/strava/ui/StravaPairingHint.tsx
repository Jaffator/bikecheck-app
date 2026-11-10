// Renders pairing state through query hooks.
import { useState, type ReactElement, type SyntheticEvent } from "react";
import { Box, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/features/users/users.queries";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import { GearLinkingSheet } from "./GearLinkingSheet";

interface StravaPairingHintProps {
  bikeId: number;
  // The bike's gear id. Null means it collects no rides from Strava.
  stravaGearId: string | null;
}

// A thumb's target around a 12px word; the margins take it back, so the row keeps its height and its edge.
const TARGET_HEIGHT = 44;
const TARGET_PAD = 8;
const ROW_LINE = 18;

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
      <UnstyledButton
        onClick={() => setPairing(true)}
        className="hover-veil"
        h={TARGET_HEIGHT}
        px={TARGET_PAD}
        my={(ROW_LINE - TARGET_HEIGHT) / 2}
        mr={-TARGET_PAD}
        fz={12}
        fw={600}
        // The brand stays on the mark: the word is an aside to the card's own tap, not its loudest line.
        c="var(--color-text-dim)"
        style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: "var(--mantine-radius-md)" }}
      >
        <StravaMark width={14} height={14} color="var(--mantine-color-strava-6)" style={{ flexShrink: 0 }} />
        {t("strava.pair")}
      </UnstyledButton>
      <GearLinkingSheet opened={pairing} onClose={() => setPairing(false)} bikeIds={[bikeId]} />
    </Box>
  );
}
