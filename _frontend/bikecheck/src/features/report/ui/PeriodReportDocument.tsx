// No longer made; a stored one still reads as it was (ADR 0011).
// The Period Report: what one bike had done to it inside one Period, read as a timeline.
// The owner previews this and the recipient reads this — one layout, so what was reviewed
// is what is read.
import type { ReactElement } from "react";
import { Cog } from "lucide-react";
import type { PeriodReportSnapshot, ReportAttachment } from "@/features/report/report.types";
import { reportBikeName, reportCost, reportNumber, reportPeriodLabel } from "@/features/report/reportFormat";
import { reportHeadings } from "@/features/report/reportHeadings";
import { ComponentList } from "./ComponentRow";
import { DocumentFooter, DocumentHeader, Field, RowLabel, ScreenSheet, Section } from "./ReportPaper";
import { ServiceTimeline } from "./ServiceTimeline";

interface PeriodReportDocumentProps {
  snapshot: PeriodReportSnapshot;
  // How a receipt is opened. The bytes come through the report either way, so the reader
  // never sees a storage address.
  onOpenAttachment: (attachment: ReportAttachment) => void;
}

export function PeriodReportDocument({ snapshot, onOpenAttachment }: PeriodReportDocumentProps): ReactElement {
  const { bike, language, period, totals, components } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);
  const bikeName = reportBikeName(bike);

  return (
    <ScreenSheet>
      <DocumentHeader title={heading.periodDocument} />

      {/* Which machine, over what span, and how far it had gone by the time of writing. */}
      <section className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label={heading.bike} value={bikeName ?? heading.noBike} muted={bikeName === null} />
        <Field label={heading.period} value={reportPeriodLabel(period, heading, language)} />
        <Field
          label={heading.odometer}
          value={bike.totalKm === null ? "—" : `${reportNumber(bike.totalKm, language)} km`}
          figure
        />
        <Field label={heading.spent} value={reportCost(totals.totalCost, snapshot)} figure accent />
      </section>

      <section className="flex gap-8">
        <Count label={heading.services} value={totals.serviceCount} />
        <Count label={heading.replacements} value={totals.replacementCount} />
      </section>

      <ServiceTimeline
        services={snapshot.services}
        voice={snapshot}
        heading={heading}
        onOpenAttachment={onOpenAttachment}
      />

      {/* Only when the owner asked for them: null is not an empty list. */}
      {components !== null && (
        <Section icon={<Cog size={16} />} title={heading.build}>
          <ComponentList components={components} heading={heading} language={language} />
        </Section>
      )}

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} />
    </ScreenSheet>
  );
}

// One of the History Totals the document froze, under the spend it belongs to.
function Count({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      <RowLabel>{label}</RowLabel>
      <span className="tabular-nums text-lg font-semibold">{value}</span>
    </div>
  );
}
