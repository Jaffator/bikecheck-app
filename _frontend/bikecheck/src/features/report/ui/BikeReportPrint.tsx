// The Bike Report on paper: the same frozen document as the screen variant, on A4. Chosen by
// the `?print=1` query parameter, so the render chromium captures is explicit.
import type { ReactElement } from "react";
import type { BikeReportSnapshot } from "@/features/report/report.types";
import { reportHeadings } from "@/features/report/reportHeadings";
import { BikeProfilePrint } from "./BikeProfile";
import { ComponentList } from "./ComponentRow";
import { DocumentFooter, DocumentHeader, PrintSheet, Section } from "./ReportPaper";
import { HistoryFigures } from "./ServiceTimeline";
import { ServiceTimelinePrint } from "./ServiceTimelinePrint";

interface BikeReportPrintProps {
  snapshot: BikeReportSnapshot;
}

export function BikeReportPrint({ snapshot }: BikeReportPrintProps): ReactElement {
  const { bike, components, history, language } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);

  return (
    <PrintSheet>
      <DocumentHeader title={heading.bikeDocument} print />

      <BikeProfilePrint bike={bike} heading={heading} language={language} />

      {/* Only what the owner kept in: null is not an empty list. */}
      {components !== null && (
        <Section title={heading.components}>
          <ComponentList components={components} heading={heading} language={language} compact />
        </Section>
      )}

      {history !== null && (
        <>
          <Section title={heading.history}>
            <div className="flex justify-between gap-6">
              <HistoryFigures history={history} voice={snapshot} heading={heading} />
            </div>
          </Section>
          <ServiceTimelinePrint services={history.services} voice={snapshot} heading={heading} detailed />
        </>
      )}

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} print />
    </PrintSheet>
  );
}
