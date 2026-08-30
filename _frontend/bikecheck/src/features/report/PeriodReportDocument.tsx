// The Period Report: what one bike had done to it inside one Period, read as a timeline.
// The owner previews this and the recipient reads this — one layout, so what was reviewed
// is what is read.
import type { ReactElement } from "react";
import { Cog, Paperclip, RefreshCw, Wrench } from "lucide-react";
import { formatFileSize } from "@/features/service/attachmentLabels";
import type { PeriodReportSnapshot, ReportAttachment, ReportService } from "./report.types";
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
import { DocumentFooter, DocumentHeader, Field, RowLabel, ScreenSheet, Section } from "./ReportPaper";

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
          mono
        />
        <Field label={heading.spent} value={reportCost(totals.totalCost, snapshot)} mono accent />
      </section>

      <section className="flex gap-8">
        <Count label={heading.services} value={totals.serviceCount} />
        <Count label={heading.replacements} value={totals.replacementCount} />
      </section>

      {snapshot.services.length === 0 ? (
        <p className="text-sm" style={{ color: REPORT_PAPER.inkMuted }}>
          {heading.noServices}
        </p>
      ) : (
        groupByYear(snapshot.services).map((group) => (
          <Section key={group.year ?? "undated"} icon={<Wrench size={16} />} title={group.year ?? heading.noDate}>
            <div className="flex flex-col">
              {group.services.map((service, index) => (
                <ServiceEntry
                  key={index}
                  service={service}
                  snapshot={snapshot}
                  heading={heading}
                  onOpenAttachment={onOpenAttachment}
                />
              ))}
            </div>
          </Section>
        ))
      )}

      {/* Only when the owner asked for them: null is not an empty list. */}
      {components !== null && (
        <Section icon={<Cog size={16} />} title={heading.build}>
          {components.length === 0 ? (
            <p className="text-sm" style={{ color: REPORT_PAPER.inkMuted }}>
              {heading.noComponents}
            </p>
          ) : (
            <div className="flex flex-col">
              {components.map((component, index) => (
                <ComponentRow key={index} component={component} heading={heading} language={language} />
              ))}
            </div>
          )}
        </Section>
      )}

      <DocumentFooter issued={heading.issued} generatedAt={snapshot.generatedAt} language={language} />
    </ScreenSheet>
  );
}

// One occasion on the timeline: when it happened, what was done, and what it came to.
function ServiceEntry({
  service,
  snapshot,
  heading,
  onOpenAttachment,
}: {
  service: ReportService;
  snapshot: PeriodReportSnapshot;
  heading: ReportHeadings;
  onOpenAttachment: (attachment: ReportAttachment) => void;
}): ReactElement {
  const date = reportDate(service.serviceDate, snapshot.language);
  const replaced = service.actions.some((action) => action.replacement);

  return (
    <div
      className="break-inside-avoid flex flex-col gap-2 py-3 first:pt-0"
      style={{ borderBottom: `1px solid ${REPORT_PAPER.rule}` }}
    >
      <div className="flex justify-between items-baseline gap-4">
        <span className="font-mono text-xs shrink-0" style={{ color: REPORT_PAPER.inkMuted }}>
          {date ?? heading.noDate}
        </span>
        <span className="font-mono text-sm shrink-0">{reportCost(service.totalCost, snapshot)}</span>
      </div>

      {service.actions.length === 0 ? (
        <p className="text-sm" style={{ color: REPORT_PAPER.inkMuted }}>
          {heading.noWork}
        </p>
      ) : (
        <h4 className="font-semibold text-[15px] leading-snug">
          {service.actions.map((action) => action.name).join(", ")}
        </h4>
      )}

      {/* A buyer must be able to tell a new part from a serviced one. */}
      {replaced && (
        <span
          className="font-mono uppercase text-[10px] font-semibold tracking-[0.12em] self-start px-1.5 py-0.5 rounded"
          style={{ backgroundColor: REPORT_PAPER.accentWash, color: REPORT_PAPER.accent }}
        >
          <RefreshCw size={10} className="inline-block mr-1 -mt-0.5" />
          {heading.replacement}
        </span>
      )}

      {service.actions.map((action, index) =>
        action.note === null || action.note.trim() === "" ? null : (
          <p key={index} className="text-[13px] leading-relaxed whitespace-pre-line">
            {action.note}
          </p>
        ),
      )}

      {service.note !== null && service.note.trim() !== "" && (
        <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: REPORT_PAPER.inkMuted }}>
          {service.note}
        </p>
      )}

      {service.actions.flatMap((action) => action.components).length > 0 && (
        <div className="flex flex-col gap-0.5">
          <RowLabel>{heading.components}</RowLabel>
          {service.actions
            .flatMap((action) => action.components)
            .map((component, index) => (
              <p key={index} className="text-[13px] leading-snug">
                {reportComponentLabel(component)}
              </p>
            ))}
        </div>
      )}

      {/* A receipt is the proof rather than a claim of it, so it opens — through the
          report itself, never from storage. */}
      {service.attachments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {service.attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-baseline gap-2 text-[13px]">
              <Paperclip size={12} className="shrink-0" style={{ color: REPORT_PAPER.inkMuted }} />
              <button
                type="button"
                onClick={() => onOpenAttachment(attachment)}
                className="min-w-0 break-all text-left underline underline-offset-2"
                style={{ color: REPORT_PAPER.accent }}
              >
                {attachment.name}
              </button>
              {attachment.sizeBytes !== null && (
                <span className="font-mono text-xs shrink-0" style={{ color: REPORT_PAPER.inkMuted }}>
                  {formatFileSize(attachment.sizeBytes, snapshot.language)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// One of the History Totals the document froze, under the spend it belongs to.
function Count({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      <RowLabel>{label}</RowLabel>
      <span className="font-mono text-lg font-semibold">{value}</span>
    </div>
  );
}
