// Where this bike stands with Strava, in one card that is always there. Three states, one
// shape: the layout must not move under the owner's thumb as the answer changes.
import type { ReactElement } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link2, Link2Off, Unlink } from "lucide-react";
import type { Bike } from "../bikes/bikes.types";

type StravaState = "disconnected" | "unpaired" | "paired";

interface BikeStravaCardProps {
  bike: Bike;
  // Whether the owner has a Strava account connected at all.
  accountConnected: boolean;
  onConnectAccount: () => void;
  onPairGear: () => void;
  // The connect call can fail; the card says so where the owner tapped.
  connectFailed?: boolean;
}

export function BikeStravaCard({
  bike,
  accountConnected,
  onConnectAccount,
  onPairGear,
  connectFailed = false,
}: BikeStravaCardProps): ReactElement {
  const { t } = useTranslation();

  const state: StravaState = !accountConnected ? "disconnected" : bike.strava_gear_id === null ? "unpaired" : "paired";
  // A paired bike is a statement, not an offer; the other two lead somewhere.
  const onClick = state === "disconnected" ? onConnectAccount : state === "unpaired" ? onPairGear : undefined;

  const COPY: Record<StravaState, { title: string; body: string }> = {
    disconnected: { title: t("strava.notConnectedTitle"), body: t("strava.notConnectedBody") },
    unpaired: { title: t("strava.notPairedTitle"), body: t("strava.notPairedBody") },
    paired: {
      title: t("strava.pairedTitle"),
      // Strava names the gear; without a name the bike is still linked, just unnamed.
      body: bike.strava_name ?? t("strava.pairedBodyUnnamed"),
    },
  };

  return (
    <Paper
      radius="lg"
      p="md"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--elev-panel)",
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      <Group gap="md" wrap="nowrap" align="center">
        <StateIcon state={state} />

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={16} fw={600} c="text.6" lineClamp={1}>
            {COPY[state].title}
          </Text>
          <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
            {COPY[state].body}
          </Text>
          {connectFailed && (
            <Text fz={12} c="red.5">
              {t("strava.connectFailed")}
            </Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}

// A paired bike wears Strava's own colour; the two open states stay quiet.
function StateIcon({ state }: { state: StravaState }): ReactElement {
  if (state === "paired") {
    return <Link2 size={22} color="var(--mantine-color-strava-6)" style={{ flexShrink: 0 }} />;
  }
  if (state === "unpaired") {
    return <Unlink size={22} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />;
  }
  return <Link2Off size={22} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />;
}
