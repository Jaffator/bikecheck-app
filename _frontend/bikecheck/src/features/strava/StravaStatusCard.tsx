// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import {
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronRight, CircleCheck } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useCurrentUser } from "@/features/users/users.queries";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useConnectStrava, useDisconnectStrava } from "./strava.queries";
import StravaMark from "@/assets/icons/bikecheck/strava.svg?react";

interface StravaStatusCardProps {
  // Settings only manages a link that exists, so it renders nothing at all when
  // the account is not connected — the pitch belongs on the dashboard.
  connectedOnly?: boolean;
  // Settings offers the way back out; the dashboard only reports the state.
  allowDisconnect?: boolean;
}

// strava_athlete_id on the user is the whole source of truth — the backend sets
// it during the OAuth callback and clears it on disconnect. Unconnected, this
// is a full pitch card; connected, a single status line.
export function StravaStatusCard({
  connectedOnly = false,
  allowDisconnect = false,
}: StravaStatusCardProps): ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: bikes } = useBikes();
  const connect = useConnectStrava();
  const disconnect = useDisconnectStrava();

  const connected = Boolean(user?.strava_athlete_id);
  const unpairedCount = (bikes ?? []).filter(
    (bike) => bike.strava_gear_id === null,
  ).length;

  if (!connected && connectedOnly) return null;

  if (!connected) {
    return (
      <Paper
        bg="cards.6"
        radius="md"
        className="m-3"
        style={{
          overflow: "hidden",
          border: "1px solid var(--color-border-subtle)",
          // The Strava orange bleeds up from the bottom edge, so the card is
          // recognisably about Strava before a word of it is read.
          backgroundImage:
            "radial-gradient(120% 90% at 50% 115%, color-mix(in srgb, var(--mantine-color-strava-6) 22%, transparent) 0%, transparent 70%)",
        }}
      >
        <Stack gap="lg" align="center" p="lg">
          {/* Concentric rings rather than a flat disc: the mark reads as a
              source the rest of the card radiates from. */}
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "4.5rem",
              height: "4.5rem",
              borderRadius: "9999px",
              backgroundColor:
                "color-mix(in srgb, var(--mantine-color-strava-6) 14%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--mantine-color-strava-6) 35%, transparent)",
              boxShadow:
                "0 0 0 8px color-mix(in srgb, var(--mantine-color-strava-6) 7%, transparent), 0 0 28px 0 color-mix(in srgb, var(--mantine-color-strava-6) 22%, transparent)",
            }}
          >
            <StravaMark
              width={32}
              height={32}
              color="var(--mantine-color-strava-6)"
            />
          </Box>

          <Stack gap={8} align="center">
            <Text
              className="font-mono"
              fz={10}
              tt="uppercase"
              c="var(--mantine-color-strava-6)"
              style={{ letterSpacing: "0.12em" }}
            >
              {t("strava.statusTitle")}
            </Text>
            <Text
              fw={700}
              fz={20}
              c="text.6"
              ta="center"
              style={{ lineHeight: 1.25, letterSpacing: "-0.016em" }}
            >
              {t("strava.pitchTitle")}
            </Text>
            <Text
              size="sm"
              c="var(--color-text-dim)"
              ta="center"
              style={{ lineHeight: 1.45 }}
            >
              {t("strava.pitchBody")}
            </Text>
          </Stack>

          <Button
            fullWidth
            radius="md"
            color="strava.6"
            c="#FFFFFF"
            loading={connect.isPending}
            onClick={() => {
              void tapFeedback();
              connect.mutate();
            }}
            className="active:scale-[0.985]"
            styles={{
              root: {
                height: "3.25rem",
                transition: "transform 0.12s ease",
                boxShadow:
                  "0 6px 20px -6px color-mix(in srgb, var(--mantine-color-strava-6) 60%, transparent)",
              },
              label: {
                fontWeight: 700,
                fontSize: "0.8125rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              },
            }}
          >
            {t("strava.connect")}
          </Button>

          {connect.isError && (
            <Text size="xs" c="red.5" ta="center">
              {t("strava.connectFailed")}
            </Text>
          )}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      bg="cards.6"
      radius="md"
      className="m-3"
      style={{
        overflow: "hidden",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* A hairline in Strava orange along the top edge: enough to own the card
          without the connected state having to shout. */}
      <Box
        style={{
          height: "2px",
          background:
            "linear-gradient(90deg, var(--mantine-color-strava-6) 0%, color-mix(in srgb, var(--mantine-color-strava-6) 15%, transparent) 100%)",
        }}
      />

      <Stack gap="md" p="md">
        <Group gap="sm" wrap="nowrap" align="center">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "0.625rem",
              backgroundColor:
                "color-mix(in srgb, var(--mantine-color-strava-6) 14%, transparent)",
            }}
          >
            <StravaMark
              width={18}
              height={18}
              color="var(--mantine-color-strava-6)"
            />
          </Box>

          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} fz={15} c="text.6">
              {t("strava.statusTitle")}
            </Text>
            <Group gap={5} wrap="nowrap">
              <CircleCheck size={13} color="var(--mantine-color-green-5)" />
              <Text
                className="font-mono"
                fz={10}
                tt="uppercase"
                c="green.5"
                style={{ letterSpacing: "0.08em" }}
              >
                {t("strava.statusConnected")}
              </Text>
            </Group>
          </Stack>
        </Group>

        {/* Reads as information, not a task: an unpaired bike is a normal state,
            and the count is the one thing a bike card cannot show on its own. */}
        {unpairedCount > 0 && (
          <UnstyledButton
            onClick={() => navigate("/bikes")}
            className="active:scale-[0.99]"
            style={{
              padding: "0.625rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "var(--color-decor)",
              transition: "transform 0.12s ease",
            }}
          >
            <Group gap="xs" wrap="nowrap" justify="space-between">
              <Text size="sm" c="var(--color-text-dim)">
                {t("strava.unpairedBikes", { count: unpairedCount })}
              </Text>
              <ChevronRight size={14} color="var(--color-text-dim)" />
            </Group>
          </UnstyledButton>
        )}

        {allowDisconnect && (
          <Button
            variant="subtle"
            color="red"
            radius="md"
            size="compact-sm"
            loading={disconnect.isPending}
            onClick={() => {
              void tapFeedback();
              disconnect.mutate();
            }}
            styles={{
              root: { alignSelf: "flex-start", paddingInline: 0 },
              label: { fontSize: "0.8125rem" },
            }}
          >
            {t("strava.disconnect")}
          </Button>
        )}

        {disconnect.isError && (
          <Text size="xs" c="red.5">
            {t("strava.disconnectFailed")}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
