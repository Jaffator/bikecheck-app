// The one thing left to do about Strava on this bike, as one full-width button. A paired bike has
// nothing left to offer, so the page drops it entirely and the photo wears the badge instead.
import type { ReactElement } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { StravaConnectButton } from "./StravaConnectButton";

interface BikeStravaCardProps {
  // Whether the owner has a Strava account connected at all.
  accountConnected: boolean;
  onConnectAccount: () => void;
  onPairGear: () => void;
  // The connect call can fail; the error shows under the button that was tapped.
  connectFailed?: boolean;
  connecting?: boolean;
}

export function BikeStravaCard({
  accountConnected,
  onConnectAccount,
  onPairGear,
  connectFailed = false,
  connecting = false,
}: BikeStravaCardProps): ReactElement {
  const { t } = useTranslation();

  // Pairing gear is ours, not Strava's OAuth, so a plain button in their orange will do.
  if (accountConnected) {
    return (
      <Button fullWidth size="lg" radius="md" color="strava" onClick={onPairGear}>
        {t("strava.pairBike")}
      </Button>
    );
  }

  return (
    <Stack gap={6}>
      <StravaConnectButton onClick={onConnectAccount} pending={connecting} fullWidth />
      {connectFailed && (
        <Text fz={12} c="red.5">
          {t("strava.connectFailed")}
        </Text>
      )}
    </Stack>
  );
}
