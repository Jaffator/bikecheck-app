// Desktop "Strava connected": one card in the shell, the same frame as "Connect Strava".
import { useEffect, type ReactElement, type ReactNode } from "react";
import { Box, Button, Paper, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import { useHeaderStore } from "@/store/store";
import trailIllustration from "@/assets/images/rides.png";
import { cardSurface } from "@/features/add_bike_page/prototype/bikeProto";

interface StravaConnectedDesktopProps {
  // The linked athlete's name and handle, when Strava sent them.
  athlete: ReactNode;
  onContinue: () => void;
}

// Fades the photo into the card on its left and bottom edges.
const PHOTO_FADE =
  "linear-gradient(90deg, var(--mantine-color-cards-6) 0%, transparent 35%), linear-gradient(0deg, var(--mantine-color-cards-6) 0%, transparent 25%)";

export function StravaConnectedDesktop({ athlete, onContinue }: StravaConnectedDesktopProps): ReactElement {
  const { t } = useTranslation();
  const setChromeHidden = useHeaderStore((state) => state.setChromeHidden);

  // The card names itself, so the header row would only add a stray back arrow.
  useEffect(() => {
    setChromeHidden(true);
    return () => setChromeHidden(false);
  }, [setChromeHidden]);

  return (
    <Box className="flex justify-center" p={40}>
      <Paper radius={24} w="100%" maw={1080} mih={720} className="flex flex-wrap overflow-hidden" style={cardSurface}>
        <Box className="flex flex-col justify-center items-start gap-8" px={56} py={64} style={{ flex: "1 1 420px" }}>
          <Box
            className="strava-mark-pulse flex items-center justify-center"
            p={16}
            style={{
              borderRadius: 9999,
              backgroundColor: "color-mix(in srgb, var(--mantine-color-strava-6) 20%, transparent)",
              border: "1px solid color-mix(in srgb, var(--mantine-color-strava-6) 45%, transparent)",
            }}
          >
            {/* A tick, not Strava's mark: their brand rules keep it off our own screens. */}
            <Check size={33} strokeWidth={2.5} color="var(--mantine-color-strava-6)" />
          </Box>

          <Text component="h1" m={0} maw={460} fz={44} fw={600} c="text.6" lh={1.08} lts="var(--tracking-display)">
            {t("strava.connectedTitle")}
          </Text>

          {athlete}

          <Text fz={15} lh={1.4} c="var(--color-text-dim)" maw={420}>
            {t("strava.connectedBody")}
          </Text>

          <Button
            color="primary.6"
            c="textDark.6"
            radius="md"
            h={44}
            px={24}
            rightSection={<ArrowRight size={16} />}
            onClick={onContinue}
          >
            {t("strava.connectedContinue")}
          </Button>
        </Box>

        <Box pos="relative" mih={420} style={{ flex: "1 1 380px" }}>
          <img
            src={trailIllustration}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "center 40%" }}
          />
          <Box aria-hidden pos="absolute" inset={0} style={{ background: PHOTO_FADE }} />
        </Box>
      </Paper>
    </Box>
  );
}
