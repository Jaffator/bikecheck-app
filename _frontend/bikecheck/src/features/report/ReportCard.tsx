// UI component using feature hooks.
import type { ReactElement } from "react";
import { Badge, Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { Browser } from "@capacitor/browser";
import { useTranslation } from "react-i18next";
import { ExternalLink, Link2Off, Trash2 } from "lucide-react";
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
  published: { key: "report.statePublished", color: "green.5", variant: "light" },
  unpublished: { key: "report.stateUnpublished", color: "text.8", variant: "light" },
  revoked: { key: "report.stateRevoked", color: "text.8", variant: "outline" },
};

interface ReportCardProps {
  report: ReportSummary;
  onRevoke: () => void;
  // Only a revoked row offers it: the link is already closed, so the row itself can go.
  onDelete: () => void;
}

// One Report as its owner manages it: which document it is, what it covers, and what the
// link has been doing since it went out. Drawn as a ticket stub: the document is the
// ticket, what can still be done to the link is the tear-off below the perforation. Its
// own copy of the card surface at list weight — see docs/ui/card-surface.md — because a
// row carrying three buttons cannot be the whole-row button `CompletedRideCard` is.
export function ReportCard({ report, onRevoke, onDelete }: ReportCardProps): ReactElement {
  const { t, i18n } = useTranslation();

  const state = reportState(report);
  const made = reportDay(report.created_at, i18n.language);
  const lastViewed = reportDay(report.last_viewed_at, i18n.language);

  return (
    <Paper
      radius="lg"
      p={0}
      style={{
        // Keep the gradient when setting the card color.
        backgroundColor: "var(--mantine-color-cards-6)",
        // The border is dropped on purpose: it would draw straight across the notches the
        // perforation bites out of the two edges — see docs/ui/card-surface.md.
        border: "none",
        boxShadow: "var(--elev-row)",
        // Clips the outer half of each notch, so the bite reads as an edge and not a disc.
        overflow: "hidden",
      }}
    >
      <Stack gap={5} p="sm">
        {/* Which of the three documents this is, and where its link stands. */}
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Text className="font-mono uppercase" fz={11} fw={400} c="cards.3" lts="0.08em" lineClamp={1}>
            {t(REPORT_KIND_KEY[report.kind])}
          </Text>
          <Badge
            variant={STATE[state].variant}
            color={STATE[state].color}
            radius="sm"
            className="font-mono"
            styles={{
              root: {
                flexShrink: 0,
                textTransform: "none",
                ...(state === "published" && {
                  backgroundColor: "color-mix(in srgb, var(--mantine-color-green-5) 25%, transparent)",
                  color: "var(--mantine-color-green-4)",
                }),
              },
            }}
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
      </Stack>

      {/* The tear line. Everything below it is the stub: what can still be done to the
          link, kept off the document itself. */}
      <Perforation />

      <Box p="sm" style={{ backgroundColor: "rgba(0, 0, 0, 0.16)" }}>
        {/* Only a published link has a page to open and an address to copy. Revoking is
            offered on anything not already revoked, so no row is left with no way out. A
            revoked row offers only deletion: a new link means a new Export. */}
        {state !== "revoked" && (
          <Group gap="xs" wrap="nowrap">
            {state === "published" && (
              <>
                <Button
                  variant="filled"
                  color="primary.6"
                  radius="md"
                  size="xs"
                  leftSection={<ExternalLink size={16} />}
                  // The device WebView ignores window.open, so the link goes through the plugin.
                  onClick={() => void Browser.open({ url: report.share_url })}
                >
                  {t("report.open")}
                </Button>
                <CopyLinkButton shareUrl={report.share_url} size="xs" variant="filled" color="primary.6" />
              </>
            )}
            <Button
              variant="outline"
              color="secondary.7"
              radius="md"
              size="xs"
              leftSection={<Link2Off size={16} />}
              onClick={onRevoke}
              ml="auto"
            >
              {t("report.revoke")}
            </Button>
          </Group>
        )}

        {/* A closed link is history the owner may not want to keep. Deleting removes the
            row itself, and only this state can: a live link is revoked first. */}
        {state === "revoked" && (
          <Group gap="xs" wrap="nowrap">
            <Button
              variant="subtle"
              color="red.5"
              radius="md"
              size="xs"
              leftSection={<Trash2 size={16} />}
              onClick={onDelete}
              ml="auto"
            >
              {t("report.delete")}
            </Button>
          </Group>
        )}
      </Box>
    </Paper>
  );
}

// The perforation: a dashed rule with a notch bitten out of each edge, so the stub below
// reads as something that tears off rather than as a second card.
function Perforation(): ReactElement {
  return (
    <Box
      style={{
        position: "relative",
        height: 1,
        backgroundImage: "repeating-linear-gradient(to right, var(--color-border-strong) 0 5px, transparent 5px 11px)",
      }}
    >
      <Notch side="left" />
      <Notch side="right" />
    </Box>
  );
}

// One bite. Filled with the page behind the card, which is what makes it read as missing.
function Notch({ side }: { side: "left" | "right" }): ReactElement {
  return (
    <Box
      style={{
        position: "absolute",
        top: "50%",
        [side]: -8,
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: "var(--mantine-color-background-9)",
        transform: "translateY(-50%)",
      }}
    />
  );
}
