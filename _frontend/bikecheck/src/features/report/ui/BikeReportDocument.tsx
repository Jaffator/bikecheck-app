// The Bike Report: the bike, plus the components and the service history its owner kept in.
import type { ReactElement } from "react";
import { Cog, History } from "lucide-react";
import type { BikeReportSnapshot, ReportAttachment } from "@/features/report/report.types";
import { reportCost, reportPeriodLabel } from "@/features/report/reportFormat";
import { reportHeadings } from "@/features/report/reportHeadings";
import { BikeProfile } from "./BikeProfile";
import { ComponentList } from "./ComponentRow";
import { DocumentFooter, DocumentHeader, Field, ScreenSheet, Section } from "./ReportPaper";
import { ServiceTimeline } from "./ServiceTimeline";

interface BikeReportDocumentProps {
  snapshot: BikeReportSnapshot;
  onOpenAttachment: (attachment: ReportAttachment) => void;
}

export function BikeReportDocument({ snapshot, onOpenAttachment }: BikeReportDocumentProps): ReactElement {
  const { bike, components, history, language } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);

  return (
    <ScreenSheet>
      <DocumentHeader title={heading.bikeDocument} />

      <BikeProfile bike={bike} heading={heading} language={language} />

      {/* Only what the owner kept in: null is not an empty list. */}
      {components !== null && (
        <Section icon={<Cog size={16} />} title={heading.components}>
          <ComponentList components={components} heading={heading} language={language} />
        </Section>
      )}

      {history !== null && (
        <>
          <Section icon={<History size={16} />} title={heading.history}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Field label={heading.period} value={reportPeriodLabel(history.period, heading, language)} />
              <Field label={heading.spent} value={reportCost(history.totals.totalCost, snapshot)} figure accent />
              <Field label={heading.services} value={String(history.totals.serviceCount)} figure />
              <Field label={heading.replacements} value={String(history.totals.replacementCount)} figure />
            </div>
          </Section>
          <ServiceTimeline
            services={history.services}
            voice={snapshot}
            heading={heading}
            onOpenAttachment={onOpenAttachment}
          />
        </>
      )}

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} />
    </ScreenSheet>
  );
}
