// The one thing left to do about Strava on this bike, in one card. A paired bike has nothing
// left to offer, so the page drops the card entirely and the photo wears the badge instead.
import type { ReactElement } from "react";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Unlink, Unplug } from "lucide-react";
import { StravaConnectButton } from "./StravaConnectButton";

type StravaState = "disconnected" | "unpaired";

interface BikeStravaCardProps {
  // Whether the owner has a Strava account connected at all.
  accountConnected: boolean;
  onConnectAccount: () => void;
  onPairGear: () => void;
  // The connect call can fail; the card says so where the owner tapped.
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

  const state: StravaState = accountConnected ? "unpaired" : "disconnected";
  // Unpaired, the whole card picks the gear; disconnected, only Strava's own button may start their OAuth.
  const pairable = state === "unpaired";

  const COPY: Record<StravaState, { title: string; body: string }> = {
    disconnected: { title: t("strava.notConnectedTitle"), body: t("strava.notConnectedBody") },
    unpaired: { title: t("strava.notPairedTitle"), body: t("strava.notPairedBody") },
  };

  return (
    <Paper
      radius="lg"
      p="md"
      onClick={pairable ? onPairGear : undefined}
      role={pairable ? "button" : undefined}
      style={{
        backgroundColor: "var(--mantine-color-strava-6)",
        border: "none",
        boxShadow: "var(--elev-panel)",
        cursor: pairable ? "pointer" : undefined,
      }}
    >
      {/* No Strava mark on the card: their brand rules allow it only in their own artwork. */}
      <Group gap="md" wrap="nowrap" align="center">
        <StateIcon state={state} />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={16} fw={600} c="textDark.6" lineClamp={1}>
            {COPY[state].title}
          </Text>
          <Text fz={13} c="textDark.6" lineClamp={1}>
            {COPY[state].body}
          </Text>
          {connectFailed && (
            <Text fz={12} c="red.5">
              {t("strava.connectFailed")}
            </Text>
          )}
        </Stack>
      </Group>

      {!pairable && (
        <Box mt="md" style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <StravaConnectButton onClick={onConnectAccount} pending={connecting} variant="white" />
        </Box>
      )}
    </Paper>
  );
}

// Both states are open questions, so both icons stay quiet.
function StateIcon({ state }: { state: StravaState }): ReactElement {
  if (state === "unpaired") {
    return <Unlink size={22} color="var(--mantine-color-textDark-6)" style={{ flexShrink: 0 }} />;
  }
  return <Unplug size={22} color="var(--mantine-color-textDark-6)" style={{ flexShrink: 0 }} />;
}
