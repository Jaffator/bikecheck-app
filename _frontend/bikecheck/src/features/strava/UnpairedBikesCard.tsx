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
      radius="lg"
      className="m-3"
      style={{
        overflow: "hidden",
        // The shared card surface — see docs/ui/card-surface.md. Colour, glow
        // and inner edge all live in this one object: `bg` would emit the
        // `background` shorthand and wipe the gradient.
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage:
          "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
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
              backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)",
            }}
          >
            <Link2Off size={18} color="var(--mantine-color-primary-6)" />
          </Box>
          <Text fw={600} fz={15} tt="uppercase" c="text.6" style={{ lineHeight: 1.15, letterSpacing: "-0.01em" }}>
            {t("strava.unpairedBikes", { count: unpairedCount })}
          </Text>
        </Group>
        {/* <Stack gap={8} className="mb-3">
          <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("strava.unpairedBikesBody")}
          </Text>
        </Stack> */}

        <Button
          fullWidth
          variant="outline"
          radius="md"
          color="primary.6"
          c="primary.6"
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
