// The History Totals card: what the filtered history adds up to.
import type { CSSProperties, ReactElement } from "react";
import { Box, Button, Divider, Group, Skeleton, Stack, Text } from "@mantine/core";
import { Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCost } from "@/utils/money";
import { useCurrentUser } from "@/features/users/users.queries";
import { SERVICE_CARD_SURFACE } from "./serviceCardSurface";
import type { HistoryTotals } from "./service.types";

// How a reading looks while it still belongs to the previous filter.
function staleStyle(stale: boolean): CSSProperties {
  return { opacity: stale ? 0.45 : 1, transition: "opacity 150ms ease" };
}

// One reading under the spend: a count and what it counts.
function Metric({ label, value, isStale }: { label: string; value: number; isStale: boolean }): ReactElement {
  return (
    <Stack gap={2} style={staleStyle(isStale)}>
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
  isStale,
  onShare,
}: {
  totals: HistoryTotals | undefined;
  periodLabel: string;
  isLoading: boolean;
  // The numbers on screen belong to the filter the user just left. Shown dimmed rather
  // than taken away, so the card does not jump while the new ones arrive.
  isStale: boolean;
  // Exports what the card is summing. Null when no one bike is chosen, which a Period
  // Report needs - the card says so rather than leaving a dead button unexplained.
  onShare: (() => void) | null;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();

  // A period with no work in it would export an empty document, so it is refused here
  // rather than in the sheet. Totals still on their way disable it without a word.
  const blockedBy =
    onShare === null ? t("report.pickBikeFirst") : totals?.service_count === 0 ? t("report.emptyPeriod") : null;
  const canShare = onShare !== null && totals !== undefined && totals.service_count > 0;

  return (
    <Box style={{ ...SERVICE_CARD_SURFACE, padding: "var(--mantine-spacing-md)" }}>
      <Stack gap="xs">
        <Text className="font-mono uppercase" fz={11} fw={400} c="primary.7" lts="0.08em" lineClamp={1}>
          {`${t("service.totalsTitle")} · ${periodLabel}`}
        </Text>

        {isLoading || totals === undefined ? (
          <Skeleton height={34} width="60%" radius="sm" />
        ) : (
          <Text className="font-mono" fz={32} fw={700} c="primary.6" lh={1.1} style={staleStyle(isStale)}>
            {formatCost(totals.total_cost, user?.currency ?? null, i18n.language)}
          </Text>
        )}

        <Group gap="lg" wrap="nowrap" mt={4} align="center">
          <Metric label={t("service.totalsServices")} value={totals?.service_count ?? 0} isStale={isStale} />
          <Divider orientation="vertical" color="var(--color-border-subtle)" />
          <Metric label={t("service.totalsReplacements")} value={totals?.replacement_count ?? 0} isStale={isStale} />

          {/* Exports exactly what is summed above: the same Bike and the same Period. */}
          <Button
            variant="outline"
            color="primary.5"
            radius="md"
            size="xs"
            ml="auto"
            leftSection={<Share2 size={16} />}
            disabled={!canShare}
            onClick={() => onShare?.()}
          >
            {t("report.share")}
          </Button>
        </Group>

        {blockedBy !== null && (
          <Text className="font-mono" fz={11} c="var(--color-text-dim)" lineClamp={2}>
            {blockedBy}
          </Text>
        )}
      </Stack>
    </Box>
  );
}
