// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowRightLeft, Bell, History, LineChart, RefreshCw } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import trailIllustration from "@/assets/images/rides.png";
import StravaMark from "@/assets/icons/bikecheck/strava.svg?react";
import BikecheckMark from "@/assets/icons/bikecheck/onlylogo.svg?react";

interface StravaConnectScreenProps {
  // Starting the OAuth flow — no connect endpoint exists yet, so the wizard
  // decides what this does.
  onConnect: () => void;
  onSkip: () => void;
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
export function StravaConnectScreen({ onConnect, onSkip }: StravaConnectScreenProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack
      justify="space-between"
      gap="xl"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--mantine-color-background-9)",
        padding: "1rem",
        paddingTop: "calc(1rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
        paddingBottom: "calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
      }}
    >
      {/* ----------- The two services being joined ----------- */}
      <Stack align="center" gap="lg" pt="xl">
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

          <ArrowRightLeft size={18} color="var(--mantine-color-other-textMuted)" />

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
          style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.0188em", lineHeight: 1.15 }}
        >
          {t("addBike.stravaTitle")}
        </Title>
      </Stack>

      {/* ----------- Hero ----------- */}
      {/* Bleeds past the page padding, and fades into the ground at both ends so
          it has no edge of its own — the design shows no seam. */}
      <Box
        style={{
          margin: "0 -1rem",
          maskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
        }}
      >
        <img
          src={trailIllustration}
          alt=""
          style={{ display: "block", width: "100%", maxHeight: "34dvh", objectFit: "cover" }}
        />
      </Box>

      {/* ----------- What the sync gets you ----------- */}
      <Stack gap="xs">
        {BENEFITS.map(({ key, Icon }) => (
          <Group
            key={key}
            gap="md"
            wrap="nowrap"
            align="center"
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "var(--mantine-color-cards-7)",
              border: "1px solid var(--mantine-color-other-borderSubtle)",
            }}
          >
            <Icon size={20} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
            <Text size="sm" fw={600} c="text.6" style={{ lineHeight: 1.35 }}>
              {t(`addBike.${key}`)}
            </Text>
          </Group>
        ))}
      </Stack>

      {/* ----------- The choice ----------- */}
      <Stack gap="sm">
        <Button
          fullWidth
          radius="sm"
          color="strava.6"
          c="#FFFFFF"
          rightSection={<StravaMark width={14} height={14} />}
          onClick={() => {
            tapFeedback();
            onConnect();
          }}
          styles={{
            root: { height: "3.25rem" },
            label: { fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" },
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
          styles={{
            root: {
              height: "3.25rem",
              backgroundColor: "transparent",
              borderColor: "var(--mantine-color-other-borderSolid)",
              color: "var(--mantine-color-primary-6)",
            },
            label: { fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" },
          }}
        >
          {t("addBike.stravaSkip")}
        </Button>
      </Stack>
    </Stack>
  );
}
