// The Service Report itself: one maintenance occasion, written down. The owner previews
// this and the recipient reads this — one layout, so what was reviewed is what is read.
import type { ReactElement, ReactNode } from "react";
import { NotepadText, Paperclip, RefreshCw, Wrench } from "lucide-react";
import { formatFileSize } from "@/features/service/attachmentLabels";
import logoDark from "@/assets/icons/bikecheck/Logo_dark.svg";
import type { ReportAction, ReportAttachment, ServiceReportSnapshot } from "./report.types";
import { REPORT_PAPER, reportBikeName, reportComponentLabel, reportCost, reportDate, reportNumber } from "./reportFormat";
import { reportHeadings, type ReportHeadings } from "./reportHeadings";


export function ServiceReportDocument({ snapshot }: { snapshot: ServiceReportSnapshot }): ReactElement {
  const { service, bike, language } = snapshot;
  // The document prints in the language it was frozen in, never the reader's.
  const heading = reportHeadings(language);
  const bikeName = reportBikeName(bike);
  const serviceDate = reportDate(service.serviceDate, language);

  return (
    <article
      data-purpose="document-preview"
      style={{ backgroundColor: REPORT_PAPER.sheet, color: REPORT_PAPER.ink }}
      className="w-full max-w-3xl mx-auto flex flex-col gap-7 px-5 py-7 sm:px-10 sm:py-10"
    >
      <header className="flex flex-col items-center gap-1">
        <img src={logoDark} alt="BikeCheck" className="h-9 w-auto" />
        <span
          className="font-mono uppercase text-[11px] font-semibold tracking-[0.18em]"
          style={{ color: REPORT_PAPER.inkMuted }}
        >
          {heading.serviceDocument}
        </span>
      </header>

      {/* What the reader checks first: which machine, when, how far it had gone, what it
          came to. */}
      <section className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label={heading.bike} value={bikeName ?? heading.noBike} muted={bikeName === null} />
        <Field label={heading.date} value={serviceDate ?? heading.noDate} muted={serviceDate === null} />
        <Field
          label={heading.odometer}
          value={service.odometerKm === null ? "—" : `${reportNumber(service.odometerKm, language)} km`}
          mono
        />
        <Field label={heading.total} value={reportCost(service.totalCost, snapshot)} mono accent />
      </section>

      <Section icon={<Wrench size={16} />} title={heading.work}>
        {service.actions.length === 0 ? (
          <p className="text-sm" style={{ color: REPORT_PAPER.inkMuted }}>
            {heading.noWork}
          </p>
        ) : (
          <div className="flex flex-col">
            {service.actions.map((action, index) => (
              <ActionBlock key={index} action={action} snapshot={snapshot} heading={heading} />
            ))}
          </div>
        )}
      </Section>

      {/* What the owner said about the occasion, before what they filed under it. */}
      {service.note !== null && service.note.trim() !== "" && (
        <Section icon={<NotepadText size={16} />} title={heading.note}>
          <p className="text-sm leading-relaxed whitespace-pre-line">{service.note}</p>
        </Section>
      )}

      {service.attachments.length > 0 && (
        <Section icon={<Paperclip size={16} />} title={heading.attachments}>
          <ul className="flex flex-col gap-1.5">
            {service.attachments.map((attachment) => (
              <AttachmentRow key={attachment.id} attachment={attachment} language={language} />
            ))}
          </ul>
        </Section>
      )}

      <footer
        className="mt-2 pt-5 text-center font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ borderTop: `1px solid ${REPORT_PAPER.rule}`, color: REPORT_PAPER.inkMuted }}
      >
        {heading.issued} {reportDate(snapshot.generatedAt, language)} · bikecheck.cloud
      </footer>
    </article>
  );
}

// One item of work: what was done, what it cost, on which parts, and in whose words. The
// break-inside guard is what keeps an action off two pages once this is printed.
function ActionBlock({
  action,
  snapshot,
  heading,
}: {
  action: ReportAction;
  snapshot: ServiceReportSnapshot;
  heading: ReportHeadings;
}): ReactElement {
  return (
    <div
      className="break-inside-avoid flex flex-col gap-2 py-3 first:pt-0"
      style={{ borderBottom: `1px solid ${REPORT_PAPER.rule}` }}
    >
      <div className="flex justify-between items-baseline gap-4">
        <h4 className="font-semibold text-[15px] leading-snug min-w-0">{action.name}</h4>
        <span className="font-mono text-sm shrink-0">
          {action.cost === null ? "—" : reportCost(action.cost, snapshot)}
        </span>
      </div>

      {/* A buyer must be able to tell a new part from a serviced one. */}
      {action.replacement && (
        <span
          className="font-mono uppercase text-[10px] font-semibold tracking-[0.12em] self-start px-1.5 py-0.5 rounded"
          style={{ backgroundColor: REPORT_PAPER.accentWash, color: REPORT_PAPER.accent }}
        >
          <RefreshCw size={10} className="inline-block mr-1 -mt-0.5" />
          {heading.replacement}
        </span>
      )}

      {action.components.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <RowLabel>{heading.components}</RowLabel>
          {action.components.map((component, index) => (
            <p key={index} className="text-[13px] leading-snug">
              {reportComponentLabel(component)}
            </p>
          ))}
        </div>
      )}

      {action.note !== null && action.note.trim() !== "" && (
        <p className="text-[13px] leading-relaxed whitespace-pre-line">{action.note}</p>
      )}
    </div>
  );
}

// A receipt names itself before it is opened. Opening it is served through the report
// itself, never from storage — that route lands with the attachments ticket.
function AttachmentRow({ attachment, language }: { attachment: ReportAttachment; language: string }): ReactElement {
  return (
    <li className="flex justify-between items-baseline gap-4 text-[13px]">
      <span className="min-w-0 break-all">{attachment.name}</span>
      {attachment.sizeBytes !== null && (
        <span className="font-mono text-xs shrink-0" style={{ color: REPORT_PAPER.inkMuted }}>
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
  accent = false,
  muted = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  muted?: boolean;
}): ReactElement {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <RowLabel>{label}</RowLabel>
      <span
        className={`${mono ? "font-mono" : ""} text-sm leading-snug break-words`}
        style={{ color: accent ? REPORT_PAPER.accent : muted ? REPORT_PAPER.inkMuted : REPORT_PAPER.ink }}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }): ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <div
        className="flex items-center gap-2 pb-2"
        style={{ borderBottom: `1px solid ${REPORT_PAPER.ruleStrong}`, color: REPORT_PAPER.ink }}
      >
        {icon}
        <h3 className="font-mono uppercase text-xs font-semibold tracking-[0.14em]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

// The metadata voice: mono, small, quiet. Names a thing without speaking for the section.
function RowLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <span
      className="font-mono uppercase text-[10px] font-semibold tracking-[0.12em]"
      style={{ color: REPORT_PAPER.inkMuted }}
    >
      {children}
    </span>
  );
}
