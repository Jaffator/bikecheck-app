// The bike card's Strava pill: paired or not, and the way to pair it. Strava's brand rules keep
// their mark off it, so the word carries the brand and the icon the state.
import { useState, type CSSProperties, type ReactElement, type SyntheticEvent } from "react";
import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import { CircleCheck, Link2Off } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/features/users/users.queries";
import { GearLinkingSheet } from "./GearLinkingSheet";

interface StravaBikeBadgeProps {
  bikeId: number;
  // Null means the bike collects no rides from Strava.
  stravaGearId: string | null;
}

// The health badge's pill, since the two stack in one corner.
const PILL: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  paddingLeft: 8,
  paddingRight: 10,
  borderRadius: 9999,
};

// Events from the sheet's portal still bubble through React, so the card under it must not hear them.
function keepFromCard(event: SyntheticEvent): void {
  event.stopPropagation();
}

export function StravaBikeBadge({ bikeId, stravaGearId }: StravaBikeBadgeProps): ReactElement | null {
  const { data: user } = useCurrentUser();

  if (stravaGearId !== null) return <PairedPill />;
  if (!user?.strava_athlete_id) return null;
  return <UnpairedPill bikeId={bikeId} />;
}

function PairedPill(): ReactElement {
  const { t } = useTranslation();

  return (
    <Group
      wrap="nowrap"
      aria-label={t("strava.paired")}
      style={{
        ...PILL,
        color: "var(--mantine-color-strava-6)",
        backgroundColor: "color-mix(in srgb, var(--mantine-color-strava-6) 13%, var(--mantine-color-cards-6))",
      }}
    >
      <CircleCheck size={12} strokeWidth={2.5} style={{ display: "block", flexShrink: 0 }} />
      <Text fz={12} fw={600} c="inherit" style={{ whiteSpace: "nowrap" }}>
        {t("strava.statusTitle")}
      </Text>
    </Group>
  );
}

function UnpairedPill({ bikeId }: { bikeId: number }): ReactElement {
  const { t } = useTranslation();
  const [pairing, setPairing] = useState(false);

  return (
    <Box onClick={keepFromCard} onKeyDown={keepFromCard}>
      <UnstyledButton
        onClick={() => setPairing(true)}
        className="hover-veil"
        aria-label={`${t("strava.notPaired")} · ${t("strava.pair")}`}
        style={{ ...PILL, color: "var(--color-text-dim)", backgroundColor: "var(--mantine-color-cards-5)" }}
      >
        <Link2Off size={12} strokeWidth={2.5} style={{ display: "block", flexShrink: 0 }} />
        <Text fz={12} fw={600} c="inherit" style={{ whiteSpace: "nowrap" }}>
          {t("strava.statusTitle")}
        </Text>
      </UnstyledButton>
      <GearLinkingSheet opened={pairing} onClose={() => setPairing(false)} bikeIds={[bikeId]} />
    </Box>
  );
}
