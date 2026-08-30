// Picks the layout from the document's own discriminant, and the variant from how it is
// being read - on a screen, or on paper. The owner's preview, the public page and the PDF
// all come through here, so what was reviewed is what is read.
import type { ReactElement } from "react";
import { ServiceReportDocument } from "./ServiceReportDocument";
import { ServiceReportPrint } from "./ServiceReportPrint";
import { REPORT_PAPER } from "./reportFormat";
import { reportHeadings } from "./reportHeadings";
import type { ReportAttachment, ReportSnapshot } from "./report.types";

// On paper nothing is opened, so the print variant is not given a way to open it.
type ReportDocumentProps =
  | {
      snapshot: ReportSnapshot;
      variant?: "screen";
      // How a reader opens one of the report's attachments, whichever page is showing it.
      onOpenAttachment: (attachment: ReportAttachment) => void;
    }
  | { snapshot: ReportSnapshot; variant: "print" };

export function ReportDocument(props: ReportDocumentProps): ReactElement {
  const { snapshot } = props;

  if (snapshot.kind !== "SERVICE") {
    return <Unreadable language={snapshot.language} />;
  }

  if (props.variant === "print") {
    return <ServiceReportPrint snapshot={snapshot} />;
  }

  return <ServiceReportDocument snapshot={snapshot} onOpenAttachment={props.onOpenAttachment} />;
}

// Unreachable: nothing can export the other kinds yet. It stays a readable page rather
// than a blank one for a snapshot written by a newer server.
function Unreadable({ language }: { language: string }): ReactElement {
  return (
    <article
      style={{ backgroundColor: REPORT_PAPER.sheet, color: REPORT_PAPER.inkMuted }}
      className="w-full max-w-3xl mx-auto px-5 py-10 text-center text-sm"
    >
      {reportHeadings(language).unreadable}
    </article>
  );
}
