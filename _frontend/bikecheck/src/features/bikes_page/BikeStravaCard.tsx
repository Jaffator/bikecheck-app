// The one thing left to do about Strava on this bike, in one card. A paired bike has nothing
// left to offer, so the page drops the card entirely and the photo wears the badge instead.
import type { ReactElement } from "react";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link2Off, Unlink } from "lucide-react";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import StravaUnconnectMark from "@/assets/icons/svg_icons/strava_unconnect.svg?react";

type StravaState = "disconnected" | "unpaired";

interface BikeStravaCardProps {
  // Whether the owner has a Strava account connected at all.
  accountConnected: boolean;
  onConnectAccount: () => void;
  onPairGear: () => void;
  // The connect call can fail; the card says so where the owner tapped.
  connectFailed?: boolean;
}

export function BikeStravaCard({
  accountConnected,
  onConnectAccount,
  onPairGear,
  connectFailed = false,
}: BikeStravaCardProps): ReactElement {
  const { t } = useTranslation();

  const state: StravaState = accountConnected ? "unpaired" : "disconnected";
  // Both states lead somewhere: to Strava itself, or to picking the gear.
  const onClick = state === "disconnected" ? onConnectAccount : onPairGear;

  const COPY: Record<StravaState, { title: string; body: string }> = {
    disconnected: { title: t("strava.notConnectedTitle"), body: t("strava.notConnectedBody") },
    unpaired: { title: t("strava.notPairedTitle"), body: t("strava.notPairedBody") },
  };

  return (
    <Paper
      radius="lg"
      p="md"
      onClick={onClick}
      role="button"
      style={{
        backgroundColor: "var(--mantine-color-strava-6)",
        border: "none",
        boxShadow: "var(--elev-panel)",
        cursor: "pointer",
        // Holds the oversized mark, which is cropped by the card rather than laid out by it.
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* A flat colour block takes its depth from scale and overlap, not from lighting: the
          mark is far larger than the card and runs off its right edge - see
          docs/ui/card-surface.md. Decorative, so it is hidden from assistive tech. */}
      <Box
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          right: -44,
          transform: "translateY(-50%) rotate(-12deg)",
          // Dark rather than light, so the shape stays a shade of the fill.
          color: "var(--mantine-color-textDark-6)",
          opacity: 0.12,
          pointerEvents: "none",
        }}
      >
        <StravaMark width={148} height={148} />
      </Box>

      {/* Positioned, so it stacks above the mark. */}
      <Group gap="md" wrap="nowrap" align="center" style={{ position: "relative" }}>
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
    </Paper>
  );
}

// Both states are open questions, so both icons stay quiet.
function StateIcon({ state }: { state: StravaState }): ReactElement {
  if (state === "unpaired") {
    return <Unlink size={22} color="var(--mantine-color-textDark-6)" style={{ flexShrink: 0 }} />;
  }
  return <StravaUnconnectMark width={25} height={25} color="var(--mantine-color-textDark-6)" style={{ flexShrink: 0 }} />;
}
