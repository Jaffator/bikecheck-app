// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useCurrentUser } from "@/features/users/users.queries";
import { usePendingRides } from "./strava.queries";

// Rides that arrived without a bike the app could resolve. Its own card rather
// than a line in UnpairedBikesCard: a bike with no gear id and a ride with no
// gear id are different problems with different answers, and a user can hit
// both at once — a paired bike still records the odd ride Strava sends with no
// gear on it at all.
export function PendingRidesCard(): ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: rides } = usePendingRides();

  const pendingCount = rides?.length ?? 0;

  if (!user?.strava_athlete_id) return null;
  if (pendingCount === 0) return null;

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
          "radial-gradient(80% 80% at 100% 0%, color-mix(in srgb, var(--mantine-color-secondary-6) 10%, transparent) 0%, transparent 65%)",
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
            <CalendarClock size={18} color="var(--mantine-color-primary-6)" />
          </Box>
          <Text fw={600} fz={15} tt="uppercase" c="text.6" style={{ lineHeight: 1.15, letterSpacing: "-0.01em" }}>
            {t("pendingRides.title")} ({pendingCount})
          </Text>
        </Group>

        <Stack gap={8} className="mb-3">
          <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("pendingRides.cardBody")}
          </Text>
        </Stack>

        <Button
          fullWidth
          radius="md"
          color="primary.6"
          c="textDark.6"
          onClick={() => {
            void tapFeedback();
            navigate("/rides?tab=pending");
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
          {t("pendingRides.cardAction")}
        </Button>
      </Stack>
    </Paper>
  );
}
