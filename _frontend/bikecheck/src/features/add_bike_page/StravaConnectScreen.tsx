import { useEffect, type ReactElement } from "react";
import { Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowRightLeft, Bell, History, LineChart, RefreshCw } from "lucide-react";
import { useHeaderStore } from "@/store/store";
import trailIllustration from "@/assets/images/rides.png";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import BikecheckMark from "@/assets/icons/bikecheck/onlylogo.svg?react";

interface StravaConnectScreenProps {
  onConnect: () => void;
  onSkip: () => void;
  connecting: boolean;
}

const BENEFITS = [
  { key: "stravaBenefitLifespan", Icon: History },
  { key: "stravaBenefitSync", Icon: RefreshCw },
  { key: "stravaBenefitMonitoring", Icon: LineChart },
  { key: "stravaBenefitReminders", Icon: Bell },
] as const;

export function StravaConnectScreen({ onConnect, onSkip, connecting }: StravaConnectScreenProps): ReactElement {
  const { t } = useTranslation();
  const setChromeHidden = useHeaderStore((state) => state.setChromeHidden);

  useEffect(() => {
    setChromeHidden(true);
    return () => setChromeHidden(false);
  }, [setChromeHidden]);

  return (
    <Stack
      justify="space-between"
      gap="md"
      style={{
        position: "relative",
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-background-9)",
        padding: "1rem",
        paddingTop: "calc(1rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
        paddingBottom: "calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
      }}
    >
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

      <Stack align="center" gap="md" style={{ position: "relative", marginTop: "2rem", flexShrink: 0 }}>
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
            fontSize: "clamp(1.5rem, 6vw, 2rem)",
            fontWeight: 600,
            letterSpacing: "-0.0188em",
            lineHeight: 1.15,
          }}
        >
          {t("addBike.stravaTitle")}
        </Title>
      </Stack>

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

      <Stack gap="sm" style={{ position: "relative", flexShrink: 0 }}>
        <Button
          fullWidth
          radius="sm"
          color="strava.6"
          c="#1A1A1A"
          rightSection={<StravaMark width={14} height={14} />}
          loading={connecting}
          onClick={() => {
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
