// The page a Share Link opens: outside the authenticated shell, outside AppLayout, with
// no session fetch. Reading a Report costs the recipient nothing — no account, no install,
// no login.
import type { ReactElement, ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button, Loader } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Download, Link2Off } from "lucide-react";
import { usePublicAttachmentOpener, usePublicReport, usePublicReportPdfUrl } from "./report.queries";
import { ReportDocument } from "./ReportDocument";
import { REPORT_PAPER } from "./reportFormat";
import { REPORT_SETTLED_MARKER, useReportSettled } from "./reportSettled";
import type { ReportSnapshot } from "./report.types";

// A token that is unpublished, revoked or expired all answer alike, so the page says the
// one thing that is true of every closed link.
const GONE_STATUS = 410;

// The variant is asked for in the address rather than left to a print stylesheet, so the
// render the server captures is explicit.
const PRINT_PARAM = "print";
const PRINT_VARIANT = "1";

export function PublicReport(): ReactElement {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  // The server draws this page to print it, and that render is not a reader - so the
  // variant is settled before the document is even asked for.
  const print = searchParams.get(PRINT_PARAM) === PRINT_VARIANT;
  const { data: snapshot, isLoading, error } = usePublicReport(token, print);
  const openAttachment = usePublicAttachmentOpener(token);

  if (isLoading) {
    return (
      <Page>
        <Loader type="oval" color="primary.6" size="lg" />
      </Page>
    );
  }

  if (error !== null || snapshot === undefined) {
    return (
      <Page>
        <Closed unavailable={error?.status === GONE_STATUS} />
      </Page>
    );
  }

  // What the server opens to print the file. Nothing around the document, and no reader to
  // offer it to.
  if (print) {
    return <PrintPage snapshot={snapshot} />;
  }

  // The document reads on a phone in the thread it arrived in, and on paper when printed.
  return (
    <main style={{ backgroundColor: REPORT_PAPER.sheet, minHeight: "100dvh" }} className="w-full flex justify-center">
      <div className="w-full max-w-3xl flex flex-col">
        <DownloadBar token={token} />
        {/* The proof opens in its own tab, served through the report - so it closes the
            moment the owner revokes the link. */}
        <ReportDocument snapshot={snapshot} onOpenAttachment={openAttachment} />
      </div>
    </main>
  );
}

// The A4 sheet as chromium sees it, and the marker that tells it the drawing is done.
function PrintPage({ snapshot }: { snapshot: ReportSnapshot }): ReactElement {
  const settled = useReportSettled();

  return (
    <main style={{ backgroundColor: REPORT_PAPER.sheet }} className="w-full flex justify-center">
      <ReportDocument snapshot={snapshot} variant="print" />
      {settled && <span hidden {...REPORT_SETTLED_MARKER} />}
    </main>
  );
}

// The owner reaches the file the same way the recipient does, on this page, so the app
// needs no file plugins of its own. Public, so the browser can simply follow it.
function DownloadBar({ token }: { token: string | undefined }): ReactElement {
  const { t } = useTranslation();
  const pdfUrl = usePublicReportPdfUrl(token);

  return (
    <div className="w-full flex justify-end px-5 pt-5 sm:px-10 sm:pt-6">
      <Button
        component="a"
        href={pdfUrl}
        variant="light"
        size="xs"
        leftSection={<Download size={14} />}
        styles={{
          root: { backgroundColor: REPORT_PAPER.accentWash, color: REPORT_PAPER.accent },
        }}
      >
        {t("report.downloadPdf")}
      </Button>
    </div>
  );
}

// The chrome around the document is the reader's, unlike the document itself.
function Closed({ unavailable }: { unavailable: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-3 px-6 text-center" style={{ color: REPORT_PAPER.ink }}>
      <Link2Off size={28} color={REPORT_PAPER.inkMuted} />
      <h1 className="text-lg font-semibold">{t(unavailable ? "report.goneTitle" : "report.loadFailedTitle")}</h1>
      <p className="text-sm max-w-xs" style={{ color: REPORT_PAPER.inkMuted }}>
        {t(unavailable ? "report.goneBody" : "report.loadFailedBody")}
      </p>
    </div>
  );
}

function Page({ children }: { children: ReactNode }): ReactElement {
  return (
    <main
      style={{ backgroundColor: REPORT_PAPER.sheet, minHeight: "100dvh" }}
      className="w-full flex items-center justify-center py-10"
    >
      {children}
    </main>
  );
}
