// The Period Report on paper: the same frozen document as the screen variant, laid out as
// one A4 sheet. Chosen by the `?print=1` query parameter rather than by `@media print`, so
// the render chromium captures is explicit rather than a side effect of a stylesheet.
import type { ReactElement } from "react";
import type { PeriodReportSnapshot, ReportService } from "./report.types";
import {
  REPORT_PAPER,
  reportBikeName,
  reportComponentLabel,
  reportCost,
  reportDate,
  reportNumber,
  reportPeriodLabel,
} from "./reportFormat";
import { reportHeadings, type ReportHeadings } from "./reportHeadings";
import { ComponentRow } from "./ComponentRow";
import { groupByYear } from "./reportTimeline";
import { DocumentFooter, DocumentHeader, Field, PrintSheet, Section } from "./ReportPaper";

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
          mono
        />
        <Field label={heading.services} value={String(totals.serviceCount)} mono />
        <Field label={heading.replacements} value={String(totals.replacementCount)} mono />
      </section>

      <section className="flex items-baseline gap-3">
        <span className="font-mono text-3xl font-semibold" style={{ color: REPORT_PAPER.accent }}>
          {reportCost(totals.totalCost, snapshot)}
        </span>
        <span className="text-base">{heading.spent}</span>
      </section>

      {snapshot.services.length === 0 ? (
        <p className="text-sm" style={{ color: REPORT_PAPER.inkMuted }}>
          {heading.noServices}
        </p>
      ) : (
        groupByYear(snapshot.services).map((group) => (
          <Section key={group.year ?? "undated"} title={group.year ?? heading.noDate}>
            <table className="w-full text-left text-[12px] border-collapse">
              <tbody>
                {group.services.map((service, index) => (
                  <ServiceRow key={index} service={service} snapshot={snapshot} heading={heading} />
                ))}
              </tbody>
            </table>
          </Section>
        ))
      )}

      {/* Only when the owner asked for them: null is not an empty list. */}
      {components !== null && (
        <Section title={heading.build}>
          {components.length === 0 ? (
            <p className="text-[12px]" style={{ color: REPORT_PAPER.inkMuted }}>
              {heading.noComponents}
            </p>
          ) : (
            <div className="flex flex-col">
              {components.map((component, index) => (
                <ComponentRow key={index} component={component} heading={heading} language={language} compact />
              ))}
            </div>
          )}
        </Section>
      )}

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} print />
    </PrintSheet>
  );
}

// One occasion, on one row — and never broken across two pages.
function ServiceRow({
  service,
  snapshot,
  heading,
}: {
  service: ReportService;
  snapshot: PeriodReportSnapshot;
  heading: ReportHeadings;
}): ReactElement {
  const date = reportDate(service.serviceDate, snapshot.language);
  const replaced = service.actions.some((action) => action.replacement);
  const components = service.actions.flatMap((action) => action.components);

  return (
    <tr className="break-inside-avoid" style={{ borderBottom: `1px solid ${REPORT_PAPER.rule}` }}>
      <td className="py-2.5 pr-4 align-top w-[18%] font-mono whitespace-nowrap" style={{ color: REPORT_PAPER.inkMuted }}>
        {date ?? heading.noDate}
      </td>
      <td className="py-2.5 pr-4 align-top w-[46%]">
        <span className="font-semibold leading-snug">
          {service.actions.length === 0 ? heading.noWork : service.actions.map((action) => action.name).join(", ")}
        </span>
        {/* A buyer must be able to tell a new part from a serviced one. */}
        {replaced && (
          <span
            className="block mt-1 font-mono uppercase text-[9px] font-semibold tracking-[0.12em]"
            style={{ color: REPORT_PAPER.accent }}
          >
            {heading.replacement}
          </span>
        )}
        {service.note !== null && service.note.trim() !== "" && (
          <span className="block mt-1 leading-relaxed whitespace-pre-line">{service.note}</span>
        )}
      </td>
      <td className="py-2.5 pr-4 align-top w-[24%] leading-relaxed">
        {components.map((component, index) => (
          <span key={index} className="block">
            {reportComponentLabel(component)}
          </span>
        ))}
      </td>
      <td className="py-2.5 align-top text-right font-mono whitespace-nowrap">
        {reportCost(service.totalCost, snapshot)}
      </td>
    </tr>
  );
}
