// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link2Off, Link2 } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useCurrentUser } from "@/features/users/users.queries";
import { useBikes } from "@/features/bikes/bikes.queries";
import { GearLinkingSheet } from "./GearLinkingSheet";

// Prompts the user to pair the bikes that collect no rides yet, and opens the
// sheet that does it. Renders nothing without a linked Strava account, or once
// every bike carries a gear id — a bike that is paired is not news.
export function UnpairedBikesCard(): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: bikes } = useBikes();
  const [pairingGear, setPairingGear] = useState(false);

  const unpairedCount = (bikes ?? []).filter((bike) => bike.strava_gear_id === null).length;

  if (!user?.strava_athlete_id) return null;
  if (unpairedCount === 0) return null;

  return (
    <Paper
      bg="cards.6"
      radius="md"
      className="m-3"
      style={{
        overflow: "hidden",
        border: "1px solid var(--color-border-subtle)",
        // A soft corner glow, so the card has a light source of its own rather
        // than sitting flat next to the ones around it.
        backgroundImage:
          "radial-gradient(80% 60% at 100% 0%, color-mix(in srgb, var(--mantine-color-strava-6) 12%, transparent) 0%, transparent 65%)",
      }}
    >
      <Stack gap="sm" p="md">
        <Group>
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "0.625rem",
              backgroundColor: "color-mix(in srgb, var(--mantine-color-strava-6) 14%, transparent)",
            }}
          >
            <Link2Off size={18} color="var(--mantine-color-strava-6)" />
          </Box>
          <Text fw={600} fz={15} tt="uppercase" c="text.6" style={{ lineHeight: 1.15, letterSpacing: "-0.01em" }}>
            {t("strava.unpairedBikes", { count: unpairedCount })}
          </Text>
        </Group>
        <Stack gap={8} className="mb-3">
          <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("strava.unpairedBikesBody")}
          </Text>
        </Stack>

        <Button
          fullWidth
          radius="md"
          color="strava.6"
          c="#FFFFFF"
          leftSection={<Link2 size={16} />}
          onClick={() => {
            void tapFeedback();
            setPairingGear(true);
          }}
          className="active:scale-[0.985]"
          styles={{
            root: { height: "2.25rem", transition: "transform 0.12s ease" },
            label: {
              fontWeight: 700,
              fontSize: "0.8125rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            },
          }}
        >
          {t("strava.unpairedBikesAction")}
        </Button>
      </Stack>

      <GearLinkingSheet opened={pairingGear} onClose={() => setPairingGear(false)} />
    </Paper>
  );
}
