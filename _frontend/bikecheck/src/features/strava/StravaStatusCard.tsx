// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Box, Button, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CircleCheck } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useCurrentUser } from "@/features/users/users.queries";
import { useConnectStrava, useDisconnectStrava } from "./strava.queries";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import mapBackground from "@/assets/icons/svg_icons/mapbg.svg";

interface StravaStatusCardProps {
  // Settings only manages a link that exists, so it renders nothing at all when
  // the account is not connected — the pitch belongs on the dashboard.
  connectedOnly?: boolean;
  // Settings offers the way back out; the dashboard only reports the state.
  allowDisconnect?: boolean;
}

// strava_athlete_id on the user is the whole source of truth — the backend sets
// it during the OAuth callback and clears it on disconnect. Unconnected, this
// is a full pitch card; connected, a single status line.
export function StravaStatusCard({
  connectedOnly = false,
  allowDisconnect = false,
}: StravaStatusCardProps): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const connect = useConnectStrava();
  const disconnect = useDisconnectStrava();

  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  const connected = Boolean(user?.strava_athlete_id);

  if (!connected && connectedOnly) return null;

  if (!connected) {
    return (
      <Paper
        bg="cards.6"
        radius="lg"
        className="m-3"
        style={{
          overflow: "hidden",
          border: "1px solid var(--color-border-subtle)",
          position: "relative",
          // The Strava orange bleeds up from the bottom edge, so the card is
          // recognisably about Strava before a word of it is read.
          backgroundImage:
            "radial-gradient(120% 90% at 50% 115%, color-mix(in srgb, var(--mantine-color-strava-6) 22%, transparent) 0%, transparent 70%)",
        }}
      >
        {/* Same map texture as the connected card, so the two states read as
            one card in two moods. Masked rather than drawn: the file carries a
            black fill that would vanish here, so it supplies only the shape.
            Tinted Strava orange instead of text, to sit with the gradient
            under it rather than grey it out. */}
        <Box
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundColor: "var(--mantine-color-strava-6)",
            opacity: 0.08,
            maskImage: `url(${mapBackground})`,
            WebkitMaskImage: `url(${mapBackground})`,
            maskSize: "cover",
            WebkitMaskSize: "cover",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />

        <Stack gap="lg" align="center" p="lg" style={{ position: "relative" }}>
          {/* Concentric rings rather than a flat disc: the mark reads as a
              source the rest of the card radiates from. */}
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "4.5rem",
              height: "4.5rem",
              borderRadius: "9999px",
              backgroundColor: "color-mix(in srgb, var(--mantine-color-strava-6) 14%, transparent)",
              border: "1px solid color-mix(in srgb, var(--mantine-color-strava-6) 35%, transparent)",
              boxShadow:
                "0 0 0 8px color-mix(in srgb, var(--mantine-color-strava-6) 7%, transparent), 0 0 28px 0 color-mix(in srgb, var(--mantine-color-strava-6) 22%, transparent)",
            }}
          >
            <StravaMark width={40} height={40} color="var(--mantine-color-strava-6)" />
          </Box>

          <Stack gap={8} align="center">
            <Text fw={700} fz={20} c="text.6" ta="center" style={{ lineHeight: 1.25, letterSpacing: "-0.016em" }}>
              {t("strava.pitchTitle")}
            </Text>
            <Text size="sm" c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
              {t("strava.pitchBody")}
            </Text>
          </Stack>

          <Button
            fullWidth
            radius="md"
            color="strava.6"
            c="#FFFFFF"
            loading={connect.isPending}
            onClick={() => {
              void tapFeedback();
              connect.mutate();
            }}
            className="active:scale-[0.985]"
            styles={{
              root: {
                height: "2.75rem",
                transition: "transform 0.12s ease",
                boxShadow: "0 6px 20px -6px color-mix(in srgb, var(--mantine-color-strava-6) 60%, transparent)",
              },
              label: {
                fontWeight: 700,
                fontSize: "0.8125rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              },
            }}
          >
            {t("strava.connect")}
          </Button>

          {connect.isError && (
            <Text size="xs" c="red.5" ta="center">
              {t("strava.connectFailed")}
            </Text>
          )}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      bg="cards.6"
      radius="lg"
      className="m-3"
      style={{
        overflow: "hidden",
        border: "1px solid var(--color-border-subtle)",
        position: "relative",
      }}
    >
      {/* The map drawing carries its own black fill, which would vanish on this
          card. Used as a mask instead: the file supplies the shape and the
          colour comes from here, so the texture can sit at any weight. */}
      <Box
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundColor: "var(--mantine-color-text-6)",
          opacity: 0.06,
          maskImage: `url(${mapBackground})`,
          WebkitMaskImage: `url(${mapBackground})`,
          maskSize: "cover",
          WebkitMaskSize: "cover",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />

      {/* Without the disconnect button there is nothing to stack the status
          under, so name and state sit on one line and the card stays a strip.
          Settings keeps the taller layout, where the button needs the room. */}
      <Stack gap="md" p={allowDisconnect ? "md" : "sm"} style={{ position: "relative" }}>
        <Group gap="sm" wrap="nowrap" align="center">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: allowDisconnect ? "2.25rem" : "1.75rem",
              height: allowDisconnect ? "2.25rem" : "1.75rem",
              borderRadius: "0.625rem",
              backgroundColor: "color-mix(in srgb, var(--mantine-color-strava-6) 14%, transparent)",
            }}
          >
            <StravaMark
              width={allowDisconnect ? 18 : 15}
              height={allowDisconnect ? 18 : 15}
              color="var(--mantine-color-strava-6)"
            />
          </Box>

          {allowDisconnect ? (
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text fw={600} fz={15} c="text.6">
                {t("strava.statusTitle")}
              </Text>
              <Group gap={5} wrap="nowrap">
                <CircleCheck size={13} color="var(--mantine-color-green-8)" />
                <Text className="font-mono" fz={10} c="green.8" style={{ letterSpacing: "0.08em" }}>
                  {t("strava.statusConnected")}
                </Text>
              </Group>
            </Stack>
          ) : (
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }} justify="space-between">
              <Text fw={600} fz={14} c="text.6" truncate>
                {t("strava.statusTitle")}
              </Text>
              <Group gap={5} wrap="nowrap">
                <CircleCheck size={13} color="var(--mantine-color-green-8)" />
                <Text className="font-mono" fz={10} c="green.8" style={{ letterSpacing: "0.08em" }}>
                  {t("strava.statusConnected")}
                </Text>
              </Group>
            </Group>
          )}

          {/* Sits opposite the title: unlinking is the one thing settings adds
              over the dashboard copy, and it belongs out of the reading path. */}
          {allowDisconnect && (
            <Button
              variant="outline"
              color="red.5"
              radius="md"
              size="compact-sm"
              loading={disconnect.isPending}
              onClick={() => {
                void tapFeedback();
                setConfirmingDisconnect(true);
              }}
              styles={{
                root: {
                  // Transparent on purpose — the outline carries the meaning,
                  // and a filled red would outweigh the status it sits beside.
                  backgroundColor: "transparent",
                  borderColor: "color-mix(in srgb, var(--mantine-color-red-5) 45%, transparent)",
                },
                label: { fontSize: "0.75rem", fontWeight: 600 },
              }}
            >
              {t("strava.disconnect")}
            </Button>
          )}
        </Group>

        {disconnect.isError && (
          <Text size="xs" c="red.5">
            {t("strava.disconnectFailed")}
          </Text>
        )}
      </Stack>

      {/* Unlinking cannot be undone without going through Strava's consent
          screen again, so it is worth one question. The body says what survives
          it: the rides already recorded stay, only new ones stop arriving. */}
      <Modal
        opened={confirmingDisconnect}
        onClose={() => setConfirmingDisconnect(false)}
        title={t("strava.disconnectConfirmTitle")}
        centered
        radius="md"
        styles={{
          content: { backgroundColor: "var(--mantine-color-cards-6)" },
          header: { backgroundColor: "var(--mantine-color-cards-6)" },
          title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
        }}
      >
        <Stack gap="lg">
          <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("strava.disconnectConfirmBody")}
          </Text>

          <Group gap="sm" grow>
            <Button
              variant="default"
              radius="md"
              onClick={() => setConfirmingDisconnect(false)}
              disabled={disconnect.isPending}
            >
              {t("strava.disconnectConfirmCancel")}
            </Button>
            <Button
              color="red.5"
              radius="md"
              loading={disconnect.isPending}
              onClick={() => {
                void tapFeedback();
                disconnect.mutate(undefined, {
                  onSuccess: () => setConfirmingDisconnect(false),
                });
              }}
            >
              {t("strava.disconnect")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
