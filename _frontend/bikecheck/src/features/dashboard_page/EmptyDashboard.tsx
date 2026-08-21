// Dashboard empty state.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useCurrentUser } from "@/features/users/users.queries";
import graphPlaceholder from "@/assets/images/empty_dashboard_graph.png";

// Show the empty Home tab.
export function EmptyDashboard(): ReactElement {
  const { t } = useTranslation();
  // Read the cached user.
  const { data: user } = useCurrentUser();

  // Use the user's first name in the greeting.
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <EmptyStateLayout
      illustration={graphPlaceholder}
      title={t("dashboard.greeting", { name: firstName })}
      body={t("dashboard.getStarted")}
      badge={<StatusBadge label={t("dashboard.noActiveData")} />}
    >
      {/* Display a pro tip. */}
      <Box
        mt={16}
        pos="relative"
        p={16}
        bg="var(--color-surface)"
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--color-border-strong)" }}
      >
        {/* Render a decorative background icon. */}
        <Lightbulb
          size={71}
          color="var(--color-decor)"
          className="pointer-events-none absolute opacity-20"
          style={{ top: 96, right: -22 }}
        />
        {Array.from({ length: 10 }).map((_, i) => (
          <Group key={i} pos="relative" gap={12} align="flex-start" wrap="nowrap">
            <Lightbulb size={20} color="var(--color-accent)" className="shrink-0" />
            <Stack gap={3}>
              <Text className="font-mono" fz={12} lh="16px" fw={500} lts="0.05em" c="var(--color-accent)">
                {t("common.proTip")}
              </Text>
              <Text fz={14} lh="22.75px" c="var(--color-text-dim)">
                {/* Preserve a single translatable sentence. */}
                <Trans
                  i18nKey="dashboard.proTipBody"
                  components={{ 1: <span style={{ color: "var(--color-text-bright)" }} /> }}
                />
              </Text>
            </Stack>
          </Group>
        ))}
      </Box>
    </EmptyStateLayout>
  );
}
