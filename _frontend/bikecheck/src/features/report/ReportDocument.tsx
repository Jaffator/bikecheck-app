// Picks the layout from the document's own discriminant. The owner's preview and the
// public page both come through here, so what was reviewed is what is read.
import type { ReactElement } from "react";
import { ServiceReportDocument } from "./ServiceReportDocument";
import { REPORT_PAPER } from "./reportFormat";
import { reportHeadings } from "./reportHeadings";
import type { ReportSnapshot } from "./report.types";

export function ReportDocument({ snapshot }: { snapshot: ReportSnapshot }): ReactElement {
  switch (snapshot.kind) {
    case "SERVICE":
      return <ServiceReportDocument snapshot={snapshot} />;
    default:
      // Unreachable: nothing can export the other kinds yet. It stays a readable page
      // rather than a blank one for a snapshot written by a newer server.
      return (
        <article
          style={{ backgroundColor: REPORT_PAPER.sheet, color: REPORT_PAPER.inkMuted }}
          className="w-full max-w-3xl mx-auto px-5 py-10 text-center text-sm"
        >
          {reportHeadings(snapshot.language).unreadable}
        </article>
      );
  }
}
