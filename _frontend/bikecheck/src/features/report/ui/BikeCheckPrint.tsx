// The BikeCheck on paper: the same frozen document as the screen variant, laid out as one
// A4 sheet. Chosen by the `?print=1` query parameter rather than by `@media print`, so the
// render chromium captures is explicit rather than a side effect of a stylesheet.
import type { ReactElement } from "react";
import type { BikeCheckSnapshot } from "@/features/report/report.types";
import { reportHeadings } from "@/features/report/reportHeadings";
import { BikeProfilePrint } from "./BikeProfile";
import { ComponentList } from "./ComponentRow";
import { DocumentFooter, DocumentHeader, PrintSheet, Section } from "./ReportPaper";

interface BikeCheckPrintProps {
  snapshot: BikeCheckSnapshot;
}

export function BikeCheckPrint({ snapshot }: BikeCheckPrintProps): ReactElement {
  const { bike, components, language } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);

  return (
    <PrintSheet>
      <DocumentHeader title={heading.bikeCheckDocument} print />

      <BikeProfilePrint bike={bike} heading={heading} language={language} />

      <Section title={heading.build}>
        <ComponentList components={components} heading={heading} language={language} compact />
      </Section>

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} print />
    </PrintSheet>
  );
}
