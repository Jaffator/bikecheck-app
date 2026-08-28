// Renders post-OAuth connection state through query hooks.
import { useState, type ReactElement } from "react";
import { Avatar, Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCurrentUser } from "@/features/users/users.queries";
import { useGearLinking } from "@/features/strava/strava.queries";
import { stravaDisplayName } from "@/features/strava/strava.types";
import { GearLinkingSheet } from "@/features/strava/GearLinkingSheet";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";

// OAuth deep-link destination after the backend links the account.
export function StravaConnected(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Refetched by the deep-link hook, so this reflects the link that just happened.
  const { data: user } = useCurrentUser();
  const stravaName = user ? stravaDisplayName(user) : null;
  const [pairingGear, setPairingGear] = useState(false);
  // Preloads gear to determine whether pairing should be offered.
  const { data: gearLinking } = useGearLinking(true);

  const hasGearToPair =
    gearLinking !== undefined &&
    gearLinking.strava_bikes.length > 0 &&
    gearLinking.bikecheck_bikes.some((bike) => bike.strava_gear_id === null);

  // Route configuration hides application chrome for this screen.

  return (
    <>
      <Stack
        justify="space-between"
        gap={0}
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--mantine-color-background-9)",
          padding: "1rem",
          paddingTop: "calc(1rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
          paddingBottom: "calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
        }}
      >
        {/* ----------- Mark and heading ----------- */}
        <Stack align="center" gap="lg" style={{ flex: 1, justifyContent: "center" }}>
          <Box
            className="strava-mark-pulse"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
              borderRadius: "9999px",
              backgroundColor: "color-mix(in srgb, var(--mantine-color-strava-6) 20%, transparent)",
              border: "1px solid color-mix(in srgb, var(--mantine-color-strava-6) 45%, transparent)",
              // Animation controls the resting glow.
            }}
          >
            <StravaMark width={33} height={33} style={{ color: "var(--mantine-color-strava-6)" }} />
          </Box>

          <Title
            order={1}
            ta="center"
            c="text.6"
            style={{
              fontSize: "2rem",
              fontWeight: 600,
              letterSpacing: "-0.0188em",
              lineHeight: 1.1,
            }}
          >
            {t("strava.connectedTitle")}
          </Title>

          {/* Shows available athlete identity details after linking. */}
          {user?.strava_athlete_id && (stravaName || user.strava_username) && (
            <Group gap="sm" wrap="nowrap" justify="center" mt={5}>
              {user.strava_avatar_url && (
                <Avatar src={user.strava_avatar_url} name={stravaName!} color="initials" radius="xl" size={35} />
              )}
              <Stack gap={2} align={user.strava_avatar_url ? "flex-start" : "center"}>
                {stravaName && (
                  <Text fw={600} size="sm" c="#E8E2D4" style={{ letterSpacing: "-0.016em" }}>
                    {stravaName}
                  </Text>
                )}
                {user.strava_username && (
                  <Text size="xs" c="#C7C6CA" opacity={0.6}>
                    @{user.strava_username}
                  </Text>
                )}
              </Stack>
            </Group>
          )}
        </Stack>

        {/* ----------- Explanation and the way on ----------- */}
        <Stack gap="lg" align="center">
          <Text ta="center" size="sm" c="#C7C6CA" opacity={0.6} maw={350} style={{ lineHeight: 1.4 }}>
            {t("strava.connectedBody")}
          </Text>

          <Button
            fullWidth
            radius="sm"
            rightSection={<ArrowRight size={12} />}
            onClick={() => {
              // Opens pairing only when available Strava gear needs assignment.
              if (hasGearToPair) {
                setPairingGear(true);
                return;
              }
              // Replaces the completed OAuth route in history.
              navigate("/bikes", { replace: true });
            }}
            styles={{
              root: {
                height: "3.25rem",
                boxShadow: "0 0 10px 0 rgba(255, 255, 0, 0.25)",
              },
              label: {
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              },
            }}
          >
            {t("strava.connectedContinue")}
          </Button>
        </Stack>
      </Stack>
      {/* Opens pairing for every unpaired BikeCheck bike. */}
      <GearLinkingSheet
        opened={pairingGear}
        onClose={() => {
          setPairingGear(false);
          navigate("/bikes", { replace: true });
        }}
      />
    </>
  );
}
