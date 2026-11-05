// BikeStravaCard's question as a cell of the action tiles, for the desktop column.
import type { ReactElement } from "react";
import { Box, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import { Tile } from "@/features/bikes/ui/BikeActionTiles";
import { StravaConnectButton } from "./StravaConnectButton";

// Half of the narrowest desktop column still has to hold the whole artwork.
const ARTWORK_HEIGHT = 28;
// The artwork's own fill, so the cell reads as one surface around it.
const ARTWORK_FILL = "#FC5200";

interface StravaActionTileProps {
  accountConnected: boolean;
  onConnectAccount: () => void;
  onPairGear: () => void;
  connectFailed: boolean;
  connecting: boolean;
}

export function StravaActionTile({
  accountConnected,
  onConnectAccount,
  onPairGear,
  connectFailed,
  connecting,
}: StravaActionTileProps): ReactElement {
  const { t } = useTranslation();

  if (accountConnected) {
    return (
      <Tile
        icon={<StravaMark width={20} height={20} />}
        label={t("strava.pairBike")}
        onClick={onPairGear}
        fill="var(--mantine-color-strava-6)"
        textColor="var(--mantine-color-white)"
      />
    );
  }

  return (
    <Stack gap={6}>
      <Box
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--mantine-radius-lg)",
          backgroundColor: ARTWORK_FILL,
        }}
      >
        <StravaConnectButton onClick={onConnectAccount} pending={connecting} height={ARTWORK_HEIGHT} />
      </Box>
      {connectFailed && (
        <Text fz={12} c="red.5">
          {t("strava.connectFailed")}
        </Text>
      )}
    </Stack>
  );
}
