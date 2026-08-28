// Renders pending ride state through query hooks.
import type { ReactElement } from "react";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { useCurrentUser } from "@/features/users/users.queries";
import { usePendingRides } from "./strava.queries";

// Shows unresolved rides separately from bikes lacking Strava gear.
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
