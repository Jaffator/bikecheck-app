// The page a Share Link opens: outside the authenticated shell, outside AppLayout, with
// no session fetch. Reading a Report costs the recipient nothing — no account, no install,
// no login.
import type { ReactElement, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Loader } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link2Off } from "lucide-react";
import { usePublicAttachmentOpener, usePublicReport } from "./report.queries";
import { ReportDocument } from "./ReportDocument";
import { REPORT_PAPER } from "./reportFormat";

// A token that is unpublished, revoked or expired all answer alike, so the page says the
// one thing that is true of every closed link.
const GONE_STATUS = 410;

export function PublicReport(): ReactElement {
  const { token } = useParams<{ token: string }>();
  const { data: snapshot, isLoading, error } = usePublicReport(token);
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

  // The document reads on a phone in the thread it arrived in, and on paper when printed.
  return (
    <main style={{ backgroundColor: REPORT_PAPER.sheet, minHeight: "100dvh" }} className="w-full flex justify-center">
      {/* The proof opens in its own tab, served through the report - so it closes the
          moment the owner revokes the link. */}
      <ReportDocument snapshot={snapshot} onOpenAttachment={openAttachment} />
    </main>
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
