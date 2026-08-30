// The Service Report on paper: the same frozen document as the screen variant, laid out as
// one A4 sheet. Chosen by the `?print=1` query parameter rather than by `@media print`, so
// the render chromium captures is explicit rather than a side effect of a stylesheet.
import type { ReactElement, ReactNode } from "react";
import { formatFileSize } from "@/features/service/attachmentLabels";
import logoDark from "@/assets/icons/bikecheck/Logo_dark.svg";
import type { ReportAttachment, ServiceReportSnapshot } from "./report.types";
import {
  REPORT_PAPER,
  reportBikeName,
  reportComponentLabel,
  reportCost,
  reportDate,
  reportNumber,
  reportRideTime,
} from "./reportFormat";
import { reportHeadings } from "./reportHeadings";

interface ServiceReportPrintProps {
  snapshot: ServiceReportSnapshot;
}

export function ServiceReportPrint({ snapshot }: ServiceReportPrintProps): ReactElement {
  const { service, bike, language } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);
  const bikeName = reportBikeName(bike);
  const serviceDate = reportDate(service.serviceDate, language);

  return (
    <article
      data-purpose="document-print"
      style={{ backgroundColor: REPORT_PAPER.sheet, color: REPORT_PAPER.ink }}
      className="w-full max-w-[210mm] min-h-[297mm] px-[14mm] py-[16mm] flex flex-col gap-8 text-left"
    >
      <header className="flex flex-col items-center gap-4">
        <img src={logoDark} alt="BikeCheck" className="h-10 w-auto" />
        <h1
          className="font-mono uppercase text-xs font-semibold tracking-[0.22em]"
          style={{ color: REPORT_PAPER.inkMuted }}
        >
          {heading.serviceDocument}
        </h1>
      </header>

      {/* What the reader checks first: which machine, when, and how far it had gone. */}
      <section
        className="flex justify-between gap-6 py-4"
        style={{ borderTop: `1px solid ${REPORT_PAPER.rule}`, borderBottom: `1px solid ${REPORT_PAPER.rule}` }}
      >
        <Field label={heading.bike} value={bikeName ?? heading.noBike} muted={bikeName === null} />
        <Field label={heading.date} value={serviceDate ?? heading.noDate} muted={serviceDate === null} />
        <Field
          label={heading.odometer}
          value={service.odometerKm === null ? "—" : `${reportNumber(service.odometerKm, language)} km`}
          mono
        />
        <Field
          label={heading.rideTime}
          value={service.odometerTimeMin === null ? "—" : reportRideTime(service.odometerTimeMin, language)}
          mono
        />
      </section>

      <section className="flex items-baseline gap-3">
        <span className="font-mono text-3xl font-semibold" style={{ color: REPORT_PAPER.accent }}>
          {reportCost(service.totalCost, snapshot)}
        </span>
        <span className="text-base">{heading.total}</span>
      </section>

      <Section title={heading.work}>
        {service.actions.length === 0 ? (
          <p className="text-sm" style={{ color: REPORT_PAPER.inkMuted }}>
            {heading.noWork}
          </p>
        ) : (
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${REPORT_PAPER.rule}` }}>
                <HeaderCell>{heading.task}</HeaderCell>
                <HeaderCell>{heading.details}</HeaderCell>
                <HeaderCell>{heading.components}</HeaderCell>
                <HeaderCell align="right">{heading.cost}</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {service.actions.map((action, index) => (
                // An action never breaks across two pages.
                <tr
                  key={index}
                  className="break-inside-avoid"
                  style={{ borderBottom: `1px solid ${REPORT_PAPER.rule}` }}
                >
                  <td className="py-2.5 pr-4 align-top w-[26%]">
                    <span className="font-semibold leading-snug">{action.name}</span>
                    {/* A buyer must be able to tell a new part from a serviced one. */}
                    {action.replacement && (
                      <span
                        className="block mt-1 font-mono uppercase text-[9px] font-semibold tracking-[0.12em]"
                        style={{ color: REPORT_PAPER.accent }}
                      >
                        {heading.replacement}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 align-top w-[36%] leading-relaxed whitespace-pre-line">
                    {action.note?.trim() ?? ""}
                  </td>
                  <td className="py-2.5 pr-4 align-top w-[26%] leading-relaxed">
                    {action.components.map((component, componentIndex) => (
                      <span key={componentIndex} className="block">
                        {reportComponentLabel(component)}
                      </span>
                    ))}
                  </td>
                  <td className="py-2.5 align-top text-right font-mono whitespace-nowrap">
                    {action.cost === null ? "—" : reportCost(action.cost, snapshot)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* What the owner said about the occasion, before what they filed under it. */}
      {service.note !== null && service.note.trim() !== "" && (
        <Section title={heading.note}>
          <p className="text-[12px] leading-relaxed whitespace-pre-line">{service.note}</p>
        </Section>
      )}

      {/* On paper an attachment is named rather than opened - the proof itself is read on
          the page the Share Link opens. */}
      {service.attachments.length > 0 && (
        <Section title={heading.attachments}>
          <ul className="flex flex-col gap-1">
            {service.attachments.map((attachment) => (
              <AttachmentRow key={attachment.id} attachment={attachment} language={language} />
            ))}
          </ul>
        </Section>
      )}

      <footer className="mt-auto pt-10 flex flex-col gap-6">
        <div className="flex items-end gap-3 text-[12px]">
          <span style={{ color: REPORT_PAPER.inkMuted }}>{heading.signature}</span>
          <span className="flex-1 h-4" style={{ borderBottom: `1px solid ${REPORT_PAPER.ruleStrong}` }} />
        </div>
        <span
          className="text-center font-mono text-[9px] uppercase tracking-[0.14em]"
          style={{ color: REPORT_PAPER.inkMuted }}
        >
          {heading.issued} {reportDate(snapshot.generatedAt, language)} · bikecheck.cloud
        </span>
      </footer>
    </article>
  );
}

function AttachmentRow({ attachment, language }: { attachment: ReportAttachment; language: string }): ReactElement {
  return (
    <li className="flex justify-between items-baseline gap-4 text-[12px]">
      <span className="min-w-0 break-all">{attachment.name}</span>
      {attachment.sizeBytes !== null && (
        <span className="font-mono text-[11px] shrink-0" style={{ color: REPORT_PAPER.inkMuted }}>
          {formatFileSize(attachment.sizeBytes, language)}
        </span>
      )}
    </li>
  );
}

// One fact in the header block: what it is, then what it says.
function Field({
  label,
  value,
  mono = false,
  muted = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}): ReactElement {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <RowLabel>{label}</RowLabel>
      <span
        className={`${mono ? "font-mono" : ""} text-[13px] leading-snug break-words`}
        style={{ color: muted ? REPORT_PAPER.inkMuted : REPORT_PAPER.ink }}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <h2
        className="font-mono uppercase text-[11px] font-semibold tracking-[0.14em] pb-1.5"
        style={{ borderBottom: `1px solid ${REPORT_PAPER.ruleStrong}` }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function HeaderCell({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }): ReactElement {
  return (
    <th
      className={`font-mono uppercase text-[9px] font-semibold tracking-[0.12em] pb-2 ${align === "right" ? "text-right" : "pr-4"}`}
      style={{ color: REPORT_PAPER.inkMuted }}
    >
      {children}
    </th>
  );
}

// The metadata voice: mono, small, quiet. Names a thing without speaking for the section.
function RowLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <span
      className="font-mono uppercase text-[9px] font-semibold tracking-[0.12em]"
      style={{ color: REPORT_PAPER.inkMuted }}
    >
      {children}
    </span>
  );
}
