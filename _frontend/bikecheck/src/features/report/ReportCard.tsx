// UI component using feature hooks.
import type { ReactElement } from "react";
import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ExternalLink, Link2Off } from "lucide-react";
import { CopyLinkButton } from "./CopyLinkButton";
import { REPORT_KIND_KEY, coversLabel, reportDay } from "./reportListLabels";
import type { ReportSummary } from "./report.types";

// The three states a Report is in. It takes both flags to tell them apart: made but closed,
// published and open, revoked and closed for good.
type ReportState = "unpublished" | "published" | "revoked";

function reportState(report: ReportSummary): ReportState {
  if (report.revoked) return "revoked";
  return report.is_public ? "published" : "unpublished";
}

// How each state reads and what it wears. Revoked is not an error, so it stays dim rather
// than red — the owner meant it — but it is outlined, so the two closed states are told
// apart at a glance and not only by their words.
const STATE: Record<ReportState, { key: string; color: string; variant: string }> = {
  published: { key: "report.statePublished", color: "primary.7", variant: "light" },
  unpublished: { key: "report.stateUnpublished", color: "text.8", variant: "light" },
  revoked: { key: "report.stateRevoked", color: "text.8", variant: "outline" },
};

interface ReportCardProps {
  report: ReportSummary;
  onRevoke: () => void;
}

// One Report as its owner manages it: which document it is, what it covers, and what the
// link has been doing since it went out. Its own copy of the card surface at list weight —
// see docs/ui/card-surface.md — because a row carrying three buttons cannot be the
// whole-row button `HistoryCard` is.
export function ReportCard({ report, onRevoke }: ReportCardProps): ReactElement {
  const { t, i18n } = useTranslation();

  const state = reportState(report);
  const made = reportDay(report.created_at, i18n.language);
  const lastViewed = reportDay(report.last_viewed_at, i18n.language);

  return (
    <Paper
      radius="lg"
      p="sm"
      style={{
        // Keep the gradient when setting the card color.
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage:
          "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
        border: "1px solid var(--color-border-subtle)",
        // Use a subtle shadow for stacked cards.
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 4px 12px -6px rgba(0, 0, 0, 0.5)",
      }}
    >
      <Stack gap={5}>
        {/* Which of the three documents this is, and where its link stands. */}
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Text className="font-mono uppercase" fz={11} fw={400} c="primary.7" lts="0.08em" lineClamp={1}>
            {t(REPORT_KIND_KEY[report.kind])}
          </Text>
          <Badge
            variant={STATE[state].variant}
            color={STATE[state].color}
            radius="sm"
            className="font-mono"
            styles={{ root: { flexShrink: 0, textTransform: "none" } }}
          >
            {t(STATE[state].key)}
          </Badge>
        </Group>

        {/* What the document is about. The bike is named as the document froze it, so a
            bike the owner has since sold and deleted still reads. */}
        <Text fw={600} fz={15} c="text.6" lineClamp={1}>
          {report.covers.bike}
        </Text>
        <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={1}>
          {coversLabel(report.kind, report.covers, t, i18n.language)}
        </Text>

        {/* Enough to tell two links apart: when it was made, and what has happened to it. */}
        <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={2}>
          {[
            made === null ? null : t("report.made", { date: made }),
            t("report.views", { count: report.view_count }),
            lastViewed === null ? t("report.neverViewed") : t("report.lastViewed", { date: lastViewed }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>

        {/* Only a published link has a page to open and an address to copy. Revoking is
            offered on anything not already revoked, so no row is left with no way out. A
            revoked row offers nothing: a new link means a new Export. */}
        {state !== "revoked" && (
          <Group gap="xs" mt={6} wrap="nowrap">
            {state === "published" && (
              <>
                <Button
                  variant="outline"
                  color="primary.5"
                  radius="md"
                  size="compact-sm"
                  leftSection={<ExternalLink size={16} />}
                  onClick={() => window.open(report.share_url, "_blank", "noopener")}
                >
                  {t("report.open")}
                </Button>
                <CopyLinkButton shareUrl={report.share_url} size="compact-sm" />
              </>
            )}
            <Button
              variant="subtle"
              color="red.5"
              radius="md"
              size="compact-sm"
              leftSection={<Link2Off size={16} />}
              onClick={onRevoke}
              ml="auto"
            >
              {t("report.revoke")}
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
