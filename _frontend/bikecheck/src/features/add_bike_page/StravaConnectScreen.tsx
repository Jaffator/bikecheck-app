// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, type ReactElement } from "react";
import { Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowRightLeft, Bell, History, LineChart, RefreshCw } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useHeaderStore } from "@/store/store";
import trailIllustration from "@/assets/images/rides.png";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import BikecheckMark from "@/assets/icons/bikecheck/onlylogo.svg?react";

interface StravaConnectScreenProps {
  // Starting the OAuth flow — the wizard fetches the authorize URL and leaves.
  onConnect: () => void;
  onSkip: () => void;
  // The authorize URL is still being fetched, so the redirect has not left yet.
  connecting: boolean;
}

// What the sync buys the user, in the order the design lists them.
const BENEFITS = [
  { key: "stravaBenefitLifespan", Icon: History },
  { key: "stravaBenefitSync", Icon: RefreshCw },
  { key: "stravaBenefitMonitoring", Icon: LineChart },
  { key: "stravaBenefitReminders", Icon: Bell },
] as const;

// Offered right after a bike is saved: the mileage the whole app reasons about
// comes from rides, and Strava is the only way to get it without manual entry.
// Full-bleed like the confirmation before it — the tab bar would invite leaving
// before the choice is made.
export function StravaConnectScreen({ onConnect, onSkip, connecting }: StravaConnectScreenProps): ReactElement {
  const { t } = useTranslation();
  const setChromeHidden = useHeaderStore((state) => state.setChromeHidden);

  // Owns the whole screen: the app header would take 3.5rem plus the safe area
  // off the top, and this page sizes itself to the full viewport height.
  useEffect(() => {
    setChromeHidden(true);
    return () => setChromeHidden(false);
  }, [setChromeHidden]);

  return (
    <Stack
      justify="space-between"
      // The three blocks are spread by space-between, so this is only the floor
      // on how close they may get on a short screen.
      gap="md"
      style={{
        position: "relative",
        // Fixed, not a minimum: the choice at the bottom has to be reachable
        // without scrolling, so the content fits the screen instead of growing
        // past it.
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-background-9)",
        padding: "1rem",
        paddingTop: "calc(1rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
        paddingBottom: "calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
      }}
    >
      {/* ----------- Hero ----------- */}
      {/* The ground the whole screen sits on: edge to edge, starting below the
          title and running to the bottom. Out of flow, so it takes no part in
          the space-between layout above it. */}
      <Box
        aria-hidden
        style={{
          position: "absolute",
          top: "6rem",
          bottom: 0,
          left: 0,
          right: 0,
          maskImage: "linear-gradient(to bottom, transparent, black 15%, black 88%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%, black 30%, transparent)",
          pointerEvents: "none",
        }}
      >
        <img
          src={trailIllustration}
          alt=""
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </Box>

      {/* ----------- The two services being joined ----------- */}
      <Stack
        align="center"
        gap="md"
        // Sits right on the safe-area edge — the page padding above it would
        // otherwise push the pair of logos further down than the design has them.
        style={{ position: "relative", marginTop: "2rem", flexShrink: 0 }}
      >
        <Group gap="sm" align="center">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "0.75rem",
              backgroundColor: "var(--mantine-color-strava-6)",
            }}
          >
            <StravaMark width={28} height={28} style={{ color: "#FFFFFF" }} />
          </Box>

          <ArrowRightLeft size={20} color="var(--mantine-color-text-8)" />

          {/* The logo carries its own yellow tile, so it only needs clipping. */}
          <Box
            style={{
              display: "flex",
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "0.75rem",
              overflow: "hidden",
            }}
          >
            <BikecheckMark width="100%" height="100%" />
          </Box>
        </Group>

        <Title
          order={1}
          ta="center"
          c="text.6"
          maw={320}
          style={{
            // Gives way on a short screen so the buttons stay above the fold.
            fontSize: "clamp(1.5rem, 6vw, 2rem)",
            fontWeight: 600,
            letterSpacing: "-0.0188em",
            lineHeight: 1.15,
          }}
        >
          {t("addBike.stravaTitle")}
        </Title>
      </Stack>

      {/* ----------- What the sync gets you ----------- */}
      {/* Rides over the hero, which is painted by the page itself. The list is
          what gives way when the screen is short — the title above it and the
          buttons below both have to stay whole. */}
      <Box style={{ position: "relative", minHeight: 0, flexShrink: 1 }}>
        <Stack gap={8}>
          {BENEFITS.map(({ key, Icon }) => (
            <Group
              key={key}
              gap="md"
              wrap="nowrap"
              align="center"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                // Frosted rather than filled: the illustration stays readable
                // through the card, the text stays readable over it.
                backgroundColor: "color-mix(in srgb, var(--mantine-color-cards-7) 15%, transparent)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid var(--mantine-color-cards-5)",
              }}
            >
              <Icon size={20} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
              <Text size="sm" fw={600} c="text.6" style={{ lineHeight: 1.35 }}>
                {t(`addBike.${key}`)}
              </Text>
            </Group>
          ))}
        </Stack>
      </Box>

      {/* ----------- The choice ----------- */}
      {/* Positioned so it stacks above the hero rather than under it, and never
          squeezed — this is the one part that must always be tappable. */}
      <Stack gap="sm" style={{ position: "relative", flexShrink: 0 }}>
        <Button
          fullWidth
          radius="sm"
          color="strava.6"
          c="#FFFFFF"
          rightSection={<StravaMark width={14} height={14} />}
          loading={connecting}
          onClick={() => {
            tapFeedback();
            onConnect();
          }}
          styles={{
            root: { height: "3.25rem" },
            label: {
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            },
          }}
        >
          {t("addBike.stravaConnect")}
        </Button>

        <Button
          fullWidth
          radius="sm"
          variant="default"
          rightSection={<ArrowRight size={12} />}
          onClick={() => {
            tapFeedback();
            onSkip();
          }}
          disabled={connecting}
          styles={{
            root: {
              height: "3.25rem",
              backgroundColor: "transparent",
              borderColor: "var(--mantine-color-other-borderSolid)",
              color: "var(--mantine-color-primary-6)",
            },
            label: {
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            },
          }}
        >
          {t("addBike.stravaSkip")}
        </Button>
      </Stack>
    </Stack>
  );
}
