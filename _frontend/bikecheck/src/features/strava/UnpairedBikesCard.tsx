// Renders unpaired bike state through query hooks.
import { useState, type ReactElement } from "react";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link2Off, Link2 } from "lucide-react";
import { useCurrentUser } from "@/features/users/users.queries";
import { useBikes } from "@/features/bikes/bikes.queries";
import { GearLinkingSheet } from "./GearLinkingSheet";

// Prompts pairing for bikes without Strava gear on linked accounts.
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
        // Uses the shared card surface without the bg shorthand.
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
        <Button
          fullWidth
          variant="outline"
          radius="md"
          color="primary.6"
          c="primary.6"
          leftSection={<Link2 size={16} />}
          onClick={() => {
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
