// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Anchor, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { RefreshCw, SearchX, SquarePen, Terminal } from "lucide-react";
import { IoCloudOffline } from "react-icons/io5";

// Both outcomes leave the user without a specification, but they differ in
// cause and in what the user should do next, so the copy differs per variant.
export type BikeSearchFallbackVariant = "failed" | "empty";

interface BikeSearchFallbackProps {
  variant: BikeSearchFallbackVariant;
  // Shown only for "failed" — a transport-level code the user can report.
  diagnosticCode?: string;
  onRetry: () => void;
  onEnterManually: () => void;
  onSkip: () => void;
}

export function BikeSearchFallback({
  variant,
  diagnosticCode,
  onRetry,
  onEnterManually,
  onSkip,
}: BikeSearchFallbackProps): ReactElement {
  const { t } = useTranslation();

  const isFailure = variant === "failed";
  const Icon = isFailure ? IoCloudOffline : SearchX;
  const titleKey = isFailure ? "addBike.searchFailedTitle" : "addBike.searchEmptyTitle";
  const bodyKey = isFailure ? "addBike.searchFailedBody" : "addBike.searchEmptyBody";

  return (
    <Paper bg="cards.6" p="lg" radius="md">
      <Stack gap="md" align="center">
        <Group
          justify="center"
          align="center"
          w={64}
          h={64}
          style={{
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--mantine-color-other-statusIdle) 15%, transparent)",
          }}
        >
          <Icon size={35} color="var(--mantine-color-red-5)" />
        </Group>

        <Text fw={700} size="lg" c="other.statusIdle" ta="center">
          {t(titleKey)}
        </Text>

        <Text size="sm" c="text.7" ta="center">
          {t(bodyKey)}
        </Text>

        {diagnosticCode && (
          <Paper
            w="100%"
            p="sm"
            radius="sm"
            bg="transparent"
            style={{ border: "1px solid var(--mantine-color-other-borderSubtle)" }}
          >
            <Group gap="xs" mb={4}>
              <Terminal size={14} color="var(--mantine-color-text-8)" />
              <Text size="xs" c="text.8" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t("addBike.diagnosticCode")}
              </Text>
            </Group>
            <Text size="sm" c="text.6" ff="monospace">
              {diagnosticCode}
            </Text>
          </Paper>
        )}

        <Stack gap="sm" w="100%">
          <Button leftSection={<RefreshCw size={16} />} onClick={onRetry} fullWidth radius="sm" style={{ height: "3rem" }}>
            {t("addBike.retrySearch")}
          </Button>
          <Button
            variant="outline"
            color="secondary.6"
            leftSection={<SquarePen size={16} />}
            onClick={onEnterManually}
            fullWidth
            radius="sm"
            style={{ height: "3rem" }}
          >
            {t("addBike.enterManually")}
          </Button>
          <Anchor component="button" type="button" onClick={onSkip} c="text.7" size="sm" ta="center" underline="always">
            {t("addBike.skipStep")}
          </Anchor>
        </Stack>
      </Stack>
    </Paper>
  );
}
