// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Box, Button, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useCurrentUser } from "@/features/users/users.queries";
import { useGearLinking } from "@/features/strava/strava.queries";
import { GearLinkingSheet } from "@/features/strava/GearLinkingSheet";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";

// Where the OAuth deep link lands. The account is already linked by the time
// this renders — the backend did that during the callback — so this screen only
// has to say so and offer the way on.
export function StravaConnected(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Refetched by the deep-link hook, so this reflects the link that just happened.
  const { data: user } = useCurrentUser();
  const [pairingGear, setPairingGear] = useState(false);
  // Fetched up front so continuing can tell whether there is anything to pair.
  // Strava gear is created by hand on Strava, so an account with none is normal.
  const { data: gearLinking } = useGearLinking(true);

  const hasGearToPair =
    gearLinking !== undefined &&
    gearLinking.strava_bikes.length > 0 &&
    gearLinking.bikecheck_bikes.some((bike) => bike.strava_gear_id === null);

  // The chrome is hidden by the route itself (FULL_SCREEN_ROUTES in AppLayout),
  // not from here: the page this one replaces clears that flag on unmount, and
  // its cleanup runs after this mounts.

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
        <Stack align="center" gap="md" style={{ flex: 1, justifyContent: "center" }}>
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
              borderRadius: "9999px",
              backgroundColor: "color-mix(in srgb, var(--mantine-color-strava-6) 20%, transparent)",
              border: "1px solid color-mix(in srgb, var(--mantine-color-strava-6) 45%, transparent)",
              boxShadow: "0 0 20px 0 color-mix(in srgb, var(--mantine-color-strava-6) 25%, transparent)",
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

          {/* The athlete id is the proof the link actually landed, so it is worth
            showing — but the screen still reads correctly without it. */}
          {user?.strava_athlete_id && (
            <Text ta="center" fw={600} size="sm" c="#E8E2D4" style={{ letterSpacing: "-0.016em" }}>
              {t("strava.connectedAthlete", { id: user.strava_athlete_id })}
            </Text>
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
              tapFeedback();
              // Pairing is the natural next step, but only when there is gear to
              // pair — a sheet that opens just to say it is empty is worse than none.
              if (hasGearToPair) {
                setPairingGear(true);
                return;
              }
              // replace: this screen is the end of the OAuth round trip, and going
              // back to it would only re-show a result that is already applied.
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
      {/* Every unpaired bike, not just one: the account was linked this moment,
          so nothing in the garage has gear yet. */}
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
