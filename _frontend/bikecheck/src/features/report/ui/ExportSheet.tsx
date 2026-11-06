// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import { Check, Download, Link2, Share2, X } from "lucide-react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { BikeNameRow } from "@/features/bikes/ui/BikeNameRow";
import {
  useDiscardReport,
  useDownloadReportPdf,
  useExportReport,
  useOwnedAttachmentOpener,
  usePublishReport,
} from "@/features/report/report.queries";
import { BikeReportOptions, type BikeReportChoice } from "./BikeReportOptions";
import { CopyLinkButton } from "./CopyLinkButton";
import { ReportDocument } from "./ReportDocument";
import { REPORT_KIND_KEY } from "@/features/report/reportListLabels";
import type {
  ExportBikeReportInput,
  ExportReportInput,
  ExportedReport,
  ReportKind,
} from "@/features/report/report.types";
import { useIsDesktop } from "@/layout/breakpoints";
import { canShareLink, shareLink } from "@/utils/shareLink";

// The sheet stands over what it was opened from, the same way the service detail does.
const SHEET_HEIGHT = "90%";
const SHEET_Z_INDEX = 320;
const OPTIONS_MODAL_WIDTH = 480;
// The paper's own max-w-3xl plus the modal's gutters and scrollbar, so no dark edge is left.
const DOCUMENT_MODAL_WIDTH = 820;

interface ExportSheetProps {
  // Null closes the sheet. What is being exported, once open.
  input: ExportReportInput | null;
  onClose: () => void;
}

// Options, preview, then a file or a link. One sheet: making a Report and opening it to the
// world are two deliberate acts, and the second is never a reflex.
export function ExportSheet({ input, onClose }: ExportSheetProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const made = useExportReport();
  const publish = usePublishReport();
  const pdf = useDownloadReportPdf();
  // Stable across renders, unlike the mutation object around it, so the effect below can
  // depend on it honestly.
  const startExport = made.mutate;
  const throwAway = useDiscardReport().mutate;

  // The Report this sheet made, held so publishing can address it and the preview does
  // not depend on a mutation's transient result.
  const [report, setReport] = useState<ExportedReport | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  // What a Bike Report carries, and whether the owner has settled it. Held here so a failed
  // Export returns to the answers given, not to the defaults.
  const [choice, setChoice] = useState<BikeReportChoice | null>(null);
  const [optionsDone, setOptionsDone] = useState(false);
  // Which input has already been exported. An export writes a row, so it must happen once
  // per thing the sheet was opened on, however many times the effect runs.
  const exported = useRef<string | null>(null);
  // What the sheet is titled. Held, so a document does not turn into another kind on its
  // way out when the input it was opened on is cleared.
  const titleKind = useRef<ReportKind>("SERVICE");
  if (input !== null) titleKind.current = input.kind;
  const openAttachment = useOwnedAttachmentOpener(report?.id);

  const opened = input !== null;
  const bikeReport = input !== null && input.kind === "BIKE" ? input : null;
  const needsOptions = bikeReport !== null && !optionsDone;

  // A Service Report asks nothing, so it is exported the moment the sheet opens. An export
  // writes a row, so it must happen once per opening however many times this runs.
  useEffect(() => {
    if (input === null || input.kind === "BIKE") return;

    const key = JSON.stringify(input);
    if (exported.current === key) return;
    exported.current = key;

    startExport(input, { onSuccess: setReport });
  }, [input, startExport]);

  // A Bike Report is exported once its options have answers, because they are frozen into
  // the document rather than read off it later.
  function exportBikeReport(next: BikeReportChoice): void {
    if (bikeReport === null) return;

    const key = JSON.stringify(bikeReport);
    if (exported.current === key) return;
    exported.current = key;
    setChoice(next);
    setOptionsDone(true);

    startExport(bikeReportExport(bikeReport, next), {
      onSuccess: setReport,
      // Nothing was written, so the owner goes back to the step they came from.
      onError: () => {
        exported.current = null;
        setOptionsDone(false);
      },
    });
  }

  // Nothing was ever published, so a preview the owner walks away from leaves no row
  // behind, a downloaded file included: abandoning it and discarding it are the same act.
  function close(): void {
    if (report !== null && shareUrl === null) {
      throwAway(report.id);
    }
    reset();
  }

  // Closing after the link is out: the report stays, the sheet does not.
  function reset(): void {
    exported.current = null;
    setReport(null);
    setShareUrl(null);
    setChoice(null);
    setOptionsDone(false);
    made.reset();
    publish.reset();
    pdf.reset();
    onClose();
  }

  const isPublished = shareUrl !== null;
  // Only the document reads wide; the question before it and the link after it stay a dialog.
  const showsDocument = made.isPending || (report !== null && !isPublished);
  // The phone keeps the bike over its document; the wide desktop preview has no use for it.
  const showsBike = bikeReport !== null && !isPublished && (needsOptions || !isDesktop);

  return (
    <Sheet
      opened={opened}
      onClose={close}
      width={sheetWidth(showsDocument, needsOptions)}
      fitted={needsOptions}
      title={
        isPublished ? (
          // Once the link exists, the sheet says so where its name was.
          <Group gap="xs" wrap="nowrap">
            <Check size={20} color="var(--mantine-color-primary-6)" />
            <span>{t("report.publishedConfirm")}</span>
          </Group>
        ) : titleKind.current === "BIKE" ? (
          <Group gap={8} wrap="nowrap">
            <Download size={18} color="var(--mantine-color-text-6)" />
            <Text component="span" fz={16} fw={600} c="text.6">
              {t("report.export")}
            </Text>
          </Group>
        ) : (
          t(REPORT_KIND_KEY[titleKind.current])
        )
      }
    >
      {showsBike && (
        <Box px={isDesktop ? "md" : undefined} pt={14} style={{ flexShrink: 0 }}>
          <BikeNameRow bikeId={bikeReport.bike_id} />
        </Box>
      )}

      <Box px={isDesktop ? "md" : undefined} pt="md" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* What a Bike Report carries, before anything is written down. */}
        {needsOptions && <BikeReportOptions initial={choice ?? defaultChoice(bikeReport)} onPreview={exportBikeReport} />}

        {made.isPending && <Waiting label={t("report.exporting")} />}

        {made.isError && <Failure>{t("report.exportFailed")}</Failure>}

        {report !== null && !isPublished && (
          <Stack gap="md" pb="md">
            {/* The document as the recipient would read it — nothing else is worth
                previewing, receipts included. */}
            {/* Their own report, so the owner reads its files before anyone else can. */}
            <ReportDocument snapshot={report.snapshot} onOpenAttachment={openAttachment} />
          </Stack>
        )}

        {isPublished && report !== null && (
          <Published shareUrl={shareUrl} kindLabel={t(REPORT_KIND_KEY[titleKind.current])} bike={report.covers.bike} />
        )}

        {publish.isError && <Failure>{t("report.publishFailed")}</Failure>}
      </Box>

      {/* The file changes nothing, so the sheet stays open for the link. Publishing is a
          distinct second tap, never something the preview does on the way past. */}
      {report !== null && !isPublished && (
        <>
          <Footer fill>
            {canDownloadPdf && (
              <Button
                color="primary.6"
                c="textDark.6"
                radius="md"
                leftSection={<Download size={16} />}
                loading={pdf.isPending}
                onClick={() => pdf.mutate(report.id)}
              >
                {t("report.downloadPdf")}
              </Button>
            )}
            <Button
              variant="outline"
              radius="md"
              leftSection={<Link2 size={16} color="var(--mantine-color-primary-5)" />}
              loading={publish.isPending}
              onClick={() =>
                publish.mutate(report.id, {
                  onSuccess: (published) => setShareUrl(published.share_url),
                })
              }
            >
              {t("report.publish")}
            </Button>
          </Footer>
          <Box px={isDesktop ? "md" : undefined} pt={isDesktop ? 0 : 12} pb={isDesktop ? "md" : undefined}>
            {pdf.isError && <Failure>{t("report.pdfFailed")}</Failure>}
            {canDownloadPdf && (
              <Text fz={12} lh={1.4} c="var(--color-text-dim)">
                {t("report.fileOrLinkHint")}
              </Text>
            )}
          </Box>
        </>
      )}

      {isPublished && (
        <Footer>
          <Button variant="outline" radius="md" onClick={reset}>
            {t("action.close")}
          </Button>
        </Footer>
      )}
    </Sheet>
  );
}

// A native webview has no download to hand a file to; the phone gets its own path in #371.
const canDownloadPdf = !Capacitor.isNativePlatform();

// A bike opens on the whole history; Service opens on the span its filter is on.
function defaultChoice({ from, to }: ExportBikeReportInput): BikeReportChoice {
  return { components: true, history: true, period: { from: from ?? null, to: to ?? null } };
}

function bikeReportExport(input: ExportBikeReportInput, choice: BikeReportChoice): ExportBikeReportInput {
  return {
    kind: "BIKE",
    bike_id: input.bike_id,
    from: choice.period.from ?? undefined,
    to: choice.period.to ?? undefined,
    include_components: choice.components,
    include_history: choice.history,
  };
}

function sheetWidth(showsDocument: boolean, needsOptions: boolean): number | undefined {
  if (showsDocument) return DOCUMENT_MODAL_WIDTH;
  return needsOptions ? OPTIONS_MODAL_WIDTH : undefined;
}

// The link, and the two ways anyone actually sends one.
function Published({
  shareUrl,
  kindLabel,
  bike,
}: {
  shareUrl: string;
  // What the document is, and which bike it is about — the share sheet carries both, so a
  // link landing in a chat says what it is before anyone opens it.
  kindLabel: string;
  bike: string;
}): ReactElement {
  const { t } = useTranslation();
  // Only offered where the device has a share sheet to hand it to.
  const canShare = canShareLink();
  // A share sheet that refuses to open says so. Backing out of one is not a failure.
  const [shareFailed, setShareFailed] = useState(false);

  async function send(): Promise<void> {
    setShareFailed(false);
    try {
      await shareLink({
        title: kindLabel,
        text: t("report.shareText", { kind: kindLabel, bike }),
        url: shareUrl,
      });
    } catch (error) {
      setShareFailed(!wasDismissed(error));
    }
  }

  return (
    <Stack gap="md" pb="md">
      <Text fz={14} c="text.8">
        {t("report.publishedBody")}
      </Text>

      <Box
        p="sm"
        style={{
          backgroundColor: "var(--mantine-color-cards2-6)",
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <Text className="tabular-nums" fz={12} c="text.7" style={{ wordBreak: "break-all" }}>
          {shareUrl}
        </Text>
      </Box>

      <Group gap="sm" grow wrap="nowrap">
        <CopyLinkButton shareUrl={shareUrl} color="primary.5" />
        {canShare && (
          <Button
            color="primary.6"
            c="textDark.6"
            radius="md"
            leftSection={<Share2 size={16} />}
            onClick={() => void send()}
          >
            {t("report.share")}
          </Button>
        )}
      </Group>

      {shareFailed && <Failure>{t("report.shareFailed")}</Failure>}
    </Stack>
  );
}

// Backing out of the share sheet leaves by the same door as a failure, and is not one.
function wasDismissed(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|abort|dismiss/i.test(message);
}

// ------------------------------------------------------------------
// Sheet furniture
// ------------------------------------------------------------------

function Sheet({
  opened,
  onClose,
  width,
  fitted,
  title,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  // Of the desktop modal; left out, the default.
  width: number | undefined;
  // As tall as what it holds, not as tall as a document.
  fitted: boolean;
  title: ReactNode;
  children: ReactNode;
}): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  return (
    <ResponsiveSheet
      opened={opened}
      onClose={onClose}
      desktop="modal"
      modalSize={width}
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      styles={{
        content: {
          height: fitted ? "auto" : SHEET_HEIGHT,
          display: "flex",
          flexDirection: "column",
        },
        // The desktop modal pads each section instead; a bottom sheet takes the wrapper's padding.
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          ...(isDesktop ? { padding: 0 } : {}),
        },
      }}
    >
      <Group
        justify="space-between"
        align="center"
        px={isDesktop ? "md" : undefined}
        pt={isDesktop ? "md" : undefined}
        wrap="nowrap"
        style={{ flexShrink: 0 }}
      >
        <Text component="div" fw={700} fz={20} c="text.6">
          {" "}
          {title}
        </Text>
        {/* A bottom sheet wears the wrapper's ✕ in its corner. */}
        {isDesktop && (
          <ActionIcon
            variant="subtle"
            color="gray"
            radius="xl"
            size="lg"
            aria-label={t("action.close")}
            onClick={onClose}
          >
            <X size={20} color="var(--mantine-color-text-6)" />
          </ActionIcon>
        )}
      </Group>
      {children}
    </ResponsiveSheet>
  );
}

function Footer({ fill = false, children }: { fill?: boolean; children: ReactNode }): ReactElement {
  const isDesktop = useIsDesktop();

  return (
    <Group
      gap="sm"
      grow={fill || !isDesktop}
      justify="flex-end"
      px={isDesktop ? "md" : undefined}
      pt="sm"
      pb={isDesktop ? "0.75rem" : undefined}
      wrap="nowrap"
      style={{ flexShrink: 0 }}
    >
      {children}
    </Group>
  );
}

function Waiting({ label }: { label: string }): ReactElement {
  return (
    <Stack align="center" gap="sm" py="xl">
      <Loader type="oval" color="primary.6" />
      <Text fz={13} c="var(--color-text-dim)">
        {label}
      </Text>
    </Stack>
  );
}

function Failure({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text fz={13} c="red.5" py="sm">
      {children}
    </Text>
  );
}
