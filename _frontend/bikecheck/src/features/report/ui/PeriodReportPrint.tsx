// The Period Report on paper: the same frozen document as the screen variant, laid out as
// one A4 sheet. Chosen by the `?print=1` query parameter rather than by `@media print`, so
// the render chromium captures is explicit rather than a side effect of a stylesheet.
import type { ReactElement } from "react";
import type { PeriodReportSnapshot } from "@/features/report/report.types";
import { REPORT_PAPER, reportBikeName, reportCost, reportNumber, reportPeriodLabel } from "@/features/report/reportFormat";
import { reportHeadings } from "@/features/report/reportHeadings";
import { ComponentList } from "./ComponentRow";
import { DocumentFooter, DocumentHeader, Field, PrintSheet, Section } from "./ReportPaper";
import { ServiceTimelinePrint } from "./ServiceTimelinePrint";

interface PeriodReportPrintProps {
  snapshot: PeriodReportSnapshot;
}

export function PeriodReportPrint({ snapshot }: PeriodReportPrintProps): ReactElement {
  const { bike, language, period, totals, components } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);
  const bikeName = reportBikeName(bike);

  return (
    <PrintSheet>
      <DocumentHeader title={heading.periodDocument} print />

      <section
        className="flex justify-between gap-6 py-4"
        style={{ borderTop: `1px solid ${REPORT_PAPER.rule}`, borderBottom: `1px solid ${REPORT_PAPER.rule}` }}
      >
        <Field label={heading.bike} value={bikeName ?? heading.noBike} muted={bikeName === null} />
        <Field label={heading.period} value={reportPeriodLabel(period, heading, language)} />
        <Field
          label={heading.odometer}
          value={bike.totalKm === null ? "—" : `${reportNumber(bike.totalKm, language)} km`}
          figure
        />
        <Field label={heading.services} value={String(totals.serviceCount)} figure />
        <Field label={heading.replacements} value={String(totals.replacementCount)} figure />
      </section>

      <section className="flex items-baseline gap-3">
        <span className="tabular-nums text-3xl font-semibold" style={{ color: REPORT_PAPER.accent }}>
          {reportCost(totals.totalCost, snapshot)}
        </span>
        <span className="text-base">{heading.spent}</span>
      </section>

      <ServiceTimelinePrint services={snapshot.services} voice={snapshot} heading={heading} />

      {/* Only when the owner asked for them: null is not an empty list. */}
      {components !== null && (
        <Section title={heading.build}>
          <ComponentList components={components} heading={heading} language={language} compact />
        </Section>
      )}

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} print />
    </PrintSheet>
  );
}
