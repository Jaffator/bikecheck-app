// Picks the layout from the document's own discriminant, and the variant from how it is
// being read - on a screen, or on paper. The owner's preview, the public page and the PDF
// all come through here, so what was reviewed is what is read.
import type { ReactElement } from "react";
import { ServiceReportDocument } from "./ServiceReportDocument";
import { ServiceReportPrint } from "./ServiceReportPrint";
import { PeriodReportDocument } from "./PeriodReportDocument";
import { PeriodReportPrint } from "./PeriodReportPrint";
import { BikeCheckDocument } from "./BikeCheckDocument";
import { BikeCheckPrint } from "./BikeCheckPrint";
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
  // Read before the discriminant narrows, so a kind this build does not know still has a
  // language to say so in.
  const language = snapshot.language;

  if (props.variant === "print") {
    switch (snapshot.kind) {
      case "SERVICE":
        return <ServiceReportPrint snapshot={snapshot} />;
      case "PERIOD":
        return <PeriodReportPrint snapshot={snapshot} />;
      case "BIKECHECK":
        return <BikeCheckPrint snapshot={snapshot} />;
      default:
        return <Unreadable language={language} />;
    }
  }

  switch (snapshot.kind) {
    case "SERVICE":
      return <ServiceReportDocument snapshot={snapshot} onOpenAttachment={props.onOpenAttachment} />;
    case "PERIOD":
      return <PeriodReportDocument snapshot={snapshot} onOpenAttachment={props.onOpenAttachment} />;
    case "BIKECHECK":
      // A BikeCheck describes the machine, not the paperwork - it carries no files.
      return <BikeCheckDocument snapshot={snapshot} />;
    default:
      return <Unreadable language={language} />;
  }
}

// Stays a readable page rather than a blank one for a snapshot this build cannot lay out.
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
