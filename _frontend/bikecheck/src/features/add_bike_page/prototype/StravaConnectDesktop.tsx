// Desktop "Connect Strava" after a save: one card in the page, the sidebar stays.
// Design: "Connect Strava · desktop" in the "Needs attention redesign" canvas.
import type { ReactElement } from "react";
import { Box, Button, Group, Paper, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import trailIllustration from "@/assets/images/rides.png";
import BikecheckMark from "@/assets/icons/bikecheck/onlylogo.svg?react";
import { StravaConnectButton } from "@/features/strava/ui/StravaConnectButton";
import { BENEFITS } from "../StravaConnectScreen";
import { cardSurface } from "./bikeProto";

interface StravaConnectDesktopProps {
  onConnect: () => void;
  onSkip: () => void;
  connecting: boolean;
}

// Fades the photo into the card on its left and bottom edges.
const PHOTO_FADE =
  "linear-gradient(90deg, var(--mantine-color-cards-6) 0%, transparent 35%), linear-gradient(0deg, var(--mantine-color-cards-6) 0%, transparent 25%)";

export function StravaConnectDesktop({ onConnect, onSkip, connecting }: StravaConnectDesktopProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Group justify="center" p={40}>
      <Paper
        radius={24}
        w="100%"
        maw={1080}
        mih={720}
        className="flex-wrap overflow-hidden"
        // Inline: Paper's own display: block beats a flex class, and the photo fell under the text as a strip.
        style={{ ...cardSurface, display: "flex" }}
      >
        <Box className="flex flex-col justify-center gap-9" px={56} py={64} style={{ flex: "1 1 420px" }}>
          <BrandMark />

          <Text component="h1" m={0} maw={460} fz={44} fw={600} c="text.6" lh={1.08} lts="var(--tracking-display)">
            {t("addBike.stravaTitle")}
          </Text>

          <Box component="ul" m={0} p={0} maw={520} className="grid grid-cols-2 gap-x-7 gap-y-6 list-none">
            {BENEFITS.map(({ key, Icon }) => (
              <Box component="li" key={key} className="flex items-start gap-3">
                <Icon size={20} color="var(--mantine-color-primary-6)" className="shrink-0" />
                <Text fz={15} lh={1.4} c="var(--color-text-bright)">
                  {t(`addBike.${key}`)}
                </Text>
              </Box>
            ))}
          </Box>

          <Group gap="md" pt={8}>
            <StravaConnectButton onClick={onConnect} pending={connecting} />
            <Button
              variant="subtle"
              color="primary.6"
              rightSection={<ArrowRight size={14} />}
              onClick={onSkip}
              disabled={connecting}
            >
              {t("addBike.stravaSkip")}
            </Button>
          </Group>
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
    </Group>
  );
}

// Ours alone: Strava's brand rules keep their mark from standing level with it.
function BrandMark(): ReactElement {
  return (
    <Box className="flex overflow-hidden" w={48} h={48} style={{ borderRadius: 12 }}>
      <BikecheckMark width="100%" height="100%" />
    </Box>
  );
}
