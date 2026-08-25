// Renders Strava connection state through query hooks.
import { useState, type ReactElement } from "react";
import { Box, Button, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CircleCheck } from "lucide-react";
import { useCurrentUser } from "@/features/users/users.queries";
import { useConnectStrava, useDisconnectStrava } from "./strava.queries";
import { stravaDisplayName } from "./strava.types";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import mapBackground from "@/assets/icons/svg_icons/mapbg.svg";

interface StravaStatusCardProps {
  // Settings renders only for connected accounts; the dashboard owns the pitch.
  connectedOnly?: boolean;
  // Settings exposes disconnect; the dashboard only reports status.
  allowDisconnect?: boolean;
}

// User strava_athlete_id determines whether to show a pitch or connection state.
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
  // Linked athlete name, if Strava provided one.
  const stravaName = user ? stravaDisplayName(user) : null;

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
          // Orange radial glow identifies the Strava connection pitch.
          backgroundImage:
            "radial-gradient(120% 90% at 50% 115%, color-mix(in srgb, var(--mantine-color-strava-6) 22%, transparent) 0%, transparent 70%)",
        }}
      >
        {/* Orange-masked map texture visually links both connection states. */}
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
          {/* Concentric rings visually emphasize the Strava mark. */}
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
      {/* Uses the map drawing as a tintable mask. */}
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

      {/* Dashboard uses a compact strip; settings reserves room for disconnect. */}
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
              {/* Displays the linked athlete name or the Strava fallback title. */}
              <Text fw={600} fz={15} c="text.6" truncate>
                {stravaName ?? t("strava.statusTitle")}
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

          {/* Settings positions the disconnect action opposite the title. */}
          {allowDisconnect && (
            <Button
              variant="outline"
              color="red.5"
              radius="md"
              size="compact-sm"
              loading={disconnect.isPending}
              onClick={() => {
                setConfirmingDisconnect(true);
              }}
              styles={{
                root: {
                  // A transparent outline keeps disconnect secondary to status.
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

      {/* Confirms disconnect because reconnecting requires Strava consent. */}
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
