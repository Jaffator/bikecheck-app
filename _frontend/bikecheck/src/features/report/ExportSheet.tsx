// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Button, Drawer, Group, Loader, Stack, Switch, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ArrowRight, Link2, Share2, Trash2, X } from "lucide-react";
import { useDiscardReport, useExportReport, useOwnedAttachmentOpener, usePublishReport } from "./report.queries";
import { CopyLinkButton } from "./CopyLinkButton";
import { ReportDocument } from "./ReportDocument";
import { REPORT_KIND_KEY } from "./reportListLabels";
import type { ExportReportInput, ExportedReport, ReportKind } from "./report.types";
import { ApiError } from "@/api/client";

// The sheet stands over what it was opened from, the same way the service detail does.
const SHEET_HEIGHT = "92vh";
const SHEET_Z_INDEX = 320;

// What the server answers with when the period it was handed covers no services.
const EMPTY_PERIOD_STATUS = 400;

interface ExportSheetProps {
  // Null closes the sheet. What is being exported, once open.
  input: ExportReportInput | null;
  onClose: () => void;
}

// Export, preview, publish. Three states, one sheet: making a Report and opening it to
// the world are two deliberate acts, and the second is never a reflex.
export function ExportSheet({ input, onClose }: ExportSheetProps): ReactElement {
  const { t } = useTranslation();
  const made = useExportReport();
  const publish = usePublishReport();
  const discard = useDiscardReport();
  // Stable across renders, unlike the mutation object around it, so the effect below can
  // depend on it honestly.
  const startExport = made.mutate;
  const throwAway = discard.mutate;

  // The Report this sheet made, held so publishing can address it and the preview does
  // not depend on a mutation's transient result.
  const [report, setReport] = useState<ExportedReport | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  // The Period Report's one option, and whether the owner has settled it. Held here until
  // Export, because the choice is frozen into the Report the moment it is made.
  const [includeComponents, setIncludeComponents] = useState(false);
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
  const needsOptions = input !== null && input.kind === "PERIOD" && !optionsDone;

  // The kinds that ask nothing are exported the moment the sheet opens. An export writes a
  // row, so it must happen once per opening however many times this runs.
  useEffect(() => {
    if (input === null || input.kind === "PERIOD") return;

    const key = JSON.stringify(input);
    if (exported.current === key) return;
    exported.current = key;

    startExport(input, { onSuccess: setReport });
  }, [input, startExport]);

  // The Period Report is exported once its one option has an answer, because the answer is
  // frozen into the document rather than read off it later.
  function confirmOptions(): void {
    if (input === null || input.kind !== "PERIOD") return;

    const key = JSON.stringify(input);
    if (exported.current === key) return;
    exported.current = key;
    setOptionsDone(true);

    startExport(
      { ...input, include_components: includeComponents },
      {
        onSuccess: setReport,
        // Nothing was written, so the owner goes back to the step they came from and can
        // answer again - a period holding nothing is an answer, not a dead end.
        onError: () => {
          exported.current = null;
          setOptionsDone(false);
        },
      },
    );
  }

  // Nothing was ever published, so a preview the owner walks away from leaves no row
  // behind — abandoning it and discarding it are the same act.
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
    setIncludeComponents(false);
    setOptionsDone(false);
    made.reset();
    publish.reset();
    discard.reset();
    onClose();
  }

  const isPublished = shareUrl !== null;

  return (
    <Sheet
      opened={opened}
      onClose={close}
      title={isPublished ? t("report.publishedTitle") : t(REPORT_KIND_KEY[titleKind.current])}
    >
      <Box px="md" pt="md" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* The one question a Period Report asks, before anything is written down. */}
        {needsOptions && (
          <Options checked={includeComponents} onChange={setIncludeComponents} />
        )}

        {made.isPending && <Waiting label={t("report.exporting")} />}

        {made.isError && <Failure>{t(exportFailureKey(made.error))}</Failure>}

        {report !== null && !isPublished && (
          <Stack gap="md" pb="md">
            {/* The document as the recipient would read it — nothing else is worth
                previewing, receipts included. */}
            {/* Their own report, so the owner reads its files before anyone else can. */}
            <ReportDocument snapshot={report.snapshot} onOpenAttachment={openAttachment} />
            <Text fz={12} c="var(--color-text-dim)" ta="center">
              {t("report.previewHint")}
            </Text>
          </Stack>
        )}

        {isPublished && report !== null && <Published shareUrl={shareUrl} />}

        {publish.isError && <Failure>{t("report.publishFailed")}</Failure>}
        {discard.isError && <Failure>{t("report.discardFailed")}</Failure>}
      </Box>

      {needsOptions && (
        <Footer>
          <Button
            color="primary.6"
            c="textDark.6"
            radius="md"
            rightSection={<ArrowRight size={16} />}
            onClick={confirmOptions}
          >
            {t("report.continue")}
          </Button>
        </Footer>
      )}

      {/* Publishing is a distinct second tap, never something the preview does on the way
          past. */}
      {report !== null && !isPublished && (
        <Footer>
          <Button
            variant="outline"
            color="red.5"
            radius="md"
            leftSection={<Trash2 size={16} />}
            loading={discard.isPending}
            onClick={() => throwAway(report.id, { onSuccess: reset })}
            styles={{
              root: {
                backgroundColor: "transparent",
                borderColor: "color-mix(in srgb, var(--mantine-color-red-5) 45%, transparent)",
              },
            }}
          >
            {t("report.discard")}
          </Button>
          <Button
            color="primary.6"
            c="textDark.6"
            radius="md"
            leftSection={<Link2 size={16} />}
            loading={publish.isPending}
            onClick={() => publish.mutate(report.id, { onSuccess: (published) => setShareUrl(published.share_url) })}
          >
            {t("report.publish")}
          </Button>
        </Footer>
      )}

      {isPublished && (
        <Footer>
          <Button variant="outline" color="primary.5" radius="md" onClick={reset}>
            {t("report.done")}
          </Button>
        </Footer>
      )}
    </Sheet>
  );
}

// A period holding no services is refused before a report is made, and that is worth saying
// plainly: "try again" is advice that cannot work.
function exportFailureKey(error: Error): string {
  return error instanceof ApiError && error.status === EMPTY_PERIOD_STATUS ? "report.emptyPeriod" : "report.exportFailed";
}

// What a Period Report may also carry. The choice is frozen into the document, so it is
// made before Export rather than offered on the preview.
function Options({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="md" pb="md">
      <Text fz={14} c="text.8">
        {t("report.optionsBody")}
      </Text>

      <Switch
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        color="primary.6"
        label={t("report.includeComponents")}
        description={t("report.includeComponentsHint")}
      />
    </Stack>
  );
}

// The link, and the two ways anyone actually sends one.
function Published({ shareUrl }: { shareUrl: string }): ReactElement {
  const { t } = useTranslation();
  // Only offered where the device has a share sheet to hand it to.
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

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
        <Text className="font-mono" fz={12} c="text.7" style={{ wordBreak: "break-all" }}>
          {shareUrl}
        </Text>
      </Box>

      <Group gap="sm" grow wrap="nowrap">
        <CopyLinkButton shareUrl={shareUrl} />
        {canShare && (
          <Button
            color="primary.6"
            c="textDark.6"
            radius="md"
            leftSection={<Share2 size={16} />}
            onClick={() => {
              void navigator.share({ url: shareUrl });
            }}
          >
            {t("report.share")}
          </Button>
        )}
      </Group>
    </Stack>
  );
}

// ------------------------------------------------------------------
// Sheet furniture
// ------------------------------------------------------------------

function Sheet({
  opened,
  onClose,
  title,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      transitionProps={{
        duration: 350,
        exitDuration: 300,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          height: SHEET_HEIGHT,
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, minHeight: 0, padding: 0, display: "flex", flexDirection: "column" },
      }}
    >
      <Group justify="space-between" align="center" px="md" pt="md" wrap="nowrap" style={{ flexShrink: 0 }}>
        <Text fw={700} fz={20} c="text.6">
          {title}
        </Text>
        <ActionIcon variant="subtle" color="gray" radius="xl" size="lg" aria-label={t("action.close")} onClick={onClose}>
          <X size={20} color="var(--mantine-color-text-6)" />
        </ActionIcon>
      </Group>
      {children}
    </Drawer>
  );
}

function Footer({ children }: { children: ReactNode }): ReactElement {
  return (
    <Group
      gap="sm"
      grow
      px="md"
      pt="sm"
      pb="calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
      wrap="nowrap"
      style={{ flexShrink: 0, borderTop: "1px solid var(--color-border-subtle)" }}
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
