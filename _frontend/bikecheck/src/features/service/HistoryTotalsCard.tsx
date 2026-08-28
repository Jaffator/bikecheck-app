// The History Totals card: what the filtered history adds up to.
import type { ReactElement } from "react";
import { Box, Divider, Group, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { formatCost } from "@/utils/money";
import { useCurrentUser } from "@/features/users/users.queries";
import { SERVICE_CARD_SURFACE } from "./serviceCardSurface";
import type { HistoryTotals } from "./service.types";

// One reading under the spend: a count and what it counts.
function Metric({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <Stack gap={2}>
      <Text className="font-mono uppercase" fz={11} fw={400} c="var(--color-text-dim)" lts="0.08em">
        {label}
      </Text>
      <Text className="font-mono" fz={15} fw={600} c="text.6">
        {value}
      </Text>
    </Stack>
  );
}

// Sums the history the user is currently looking at - the same bike and the same Period
// the list below runs on, so the two can never disagree. The eyebrow names the Period
// because the picker that sets it is up in the header, out of sight.
export function HistoryTotalsCard({
  totals,
  periodLabel,
  isLoading,
}: {
  totals: HistoryTotals | undefined;
  periodLabel: string;
  isLoading: boolean;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();

  return (
    <Box style={{ ...SERVICE_CARD_SURFACE, padding: "var(--mantine-spacing-md)" }}>
      <Stack gap="xs">
        <Text className="font-mono uppercase" fz={11} fw={400} c="primary.7" lts="0.08em" lineClamp={1}>
          {`${t("service.totalsTitle")} · ${periodLabel}`}
        </Text>

        {isLoading || totals === undefined ? (
          <Skeleton height={34} width="60%" radius="sm" />
        ) : (
          <Text className="font-mono" fz={32} fw={700} c="primary.6" lh={1.1}>
            {formatCost(totals.total_cost, user?.currency ?? null, i18n.language)}
          </Text>
        )}

        <Group gap="lg" wrap="nowrap" mt={4}>
          <Metric label={t("service.totalsServices")} value={totals?.service_count ?? 0} />
          <Divider orientation="vertical" color="var(--color-border-subtle)" />
          <Metric label={t("service.totalsReplacements")} value={totals?.replacement_count ?? 0} />
        </Group>
      </Stack>
    </Box>
  );
}
