// The BikeCheck: the bike and everything mounted on it. No longer made; a stored one still
// reads as it was (ADR 0011).
import type { ReactElement } from "react";
import { Cog } from "lucide-react";
import type { BikeCheckSnapshot } from "@/features/report/report.types";
import { reportHeadings } from "@/features/report/reportHeadings";
import { BikeProfile } from "./BikeProfile";
import { ComponentList } from "./ComponentRow";
import { DocumentFooter, DocumentHeader, ScreenSheet, Section } from "./ReportPaper";

interface BikeCheckDocumentProps {
  snapshot: BikeCheckSnapshot;
}

export function BikeCheckDocument({ snapshot }: BikeCheckDocumentProps): ReactElement {
  const { bike, components, language } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);

  return (
    <ScreenSheet>
      <DocumentHeader title={heading.bikeCheckDocument} />

      <BikeProfile bike={bike} heading={heading} language={language} />

      <Section icon={<Cog size={16} />} title={heading.build}>
        <ComponentList components={components} heading={heading} language={language} />
      </Section>

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} />
    </ScreenSheet>
  );
}
