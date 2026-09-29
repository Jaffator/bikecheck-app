// Dashboard empty state.
import type { ReactElement } from "react";
import { Box, Button, Group, Stack, Text } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import { useCurrentUser } from "@/features/users/users.queries";
import graphPlaceholder from "@/assets/images/empty_dashboard_graph.png";

// Show the empty Home tab.
export function EmptyDashboard(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Read the cached user.
  const { data: user } = useCurrentUser();

  // Use the user's first name in the greeting.
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <EmptyStateLayout
      illustration={graphPlaceholder}
      title={t("dashboard.greeting", { name: firstName })}
      body={t("dashboard.getStarted")}
    >
      {/* Nothing here works until there is a bike, so the one way forward is a button. */}
      <Button variant="filled" radius="md" size="md" fullWidth onClick={() => navigate("/bikes/new")}>
        {t("dashboard.addBike")}
      </Button>

      {/* Display a pro tip. */}
      <Box
        mt={16}
        pos="relative"
        p={12}
        bg="var(--mantine-color-surface)"
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--color-border-strong)" }}
      >
        {/* Render a decorative background icon. */}
        <Lightbulb
          size={56}
          color="var(--color-decor)"
          className="pointer-events-none absolute opacity-20"
          style={{ top: 96, right: -22 }}
        />
        {/* The label carries the icon, so the body runs the full card width. */}
        <Stack pos="relative" gap={3}>
          <Group gap={8} align="center" wrap="nowrap">
            <Lightbulb size={16} color="var(--color-accent)" className="shrink-0" />
            <Text className="font-mono" fz={11} lh="16px" fw={500} lts="0.05em" c="var(--color-accent)">
              {t("common.proTip")}
            </Text>
          </Group>
          <Text fz={14} lh="22px" c="var(--color-muted)">
            {/* Preserve a single translatable sentence. */}
            <Trans
              i18nKey="dashboard.proTipBody"
              components={{ 1: <span style={{ color: "var(--color-text-dim)" }} /> }}
            />
          </Text>
        </Stack>
      </Box>
    </EmptyStateLayout>
  );
}
