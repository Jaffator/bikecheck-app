// A document's Services read as a timeline, one Section per year. Bike and Period Reports share it.
import type { ReactElement } from "react";
import { Paperclip, RefreshCw, Wrench } from "lucide-react";
import { formatFileSize } from "@/features/service/attachmentLabels";
import type { ReportAttachment, ReportService } from "@/features/report/report.types";
import {
  REPORT_PAPER,
  reportComponentLabel,
  reportCost,
  reportDate,
  reportPlace,
} from "@/features/report/reportFormat";
import type { ReportHeadings } from "@/features/report/reportHeadings";
import { groupByYear } from "@/features/report/reportTimeline";
import { RowLabel, Section } from "./ReportPaper";

// The language and currency the document was frozen in.
interface DocumentVoice {
  language: string;
  currency: string;
}

interface ServiceTimelineProps {
  services: ReportService[];
  voice: DocumentVoice;
  heading: ReportHeadings;
  // How a receipt is opened. The bytes come through the report either way, so the reader
  // never sees a storage address.
  onOpenAttachment: (attachment: ReportAttachment) => void;
}

export function ServiceTimeline({ services, voice, heading, onOpenAttachment }: ServiceTimelineProps): ReactElement {
  if (services.length === 0) {
    return (
      <p className="text-sm" style={{ color: REPORT_PAPER.inkMuted }}>
        {heading.noServices}
      </p>
    );
  }

  return (
    <>
      {groupByYear(services).map((group) => (
        <Section key={group.year ?? "undated"} icon={<Wrench size={16} />} title={group.year ?? heading.noDate}>
          <div className="flex flex-col">
            {group.services.map((service, index) => (
              <ServiceEntry
                key={index}
                service={service}
                voice={voice}
                heading={heading}
                onOpenAttachment={onOpenAttachment}
              />
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

// One occasion on the timeline: when it happened, what was done, and what it came to.
function ServiceEntry({
  service,
  voice,
  heading,
  onOpenAttachment,
}: {
  service: ReportService;
  voice: DocumentVoice;
  heading: ReportHeadings;
  onOpenAttachment: (attachment: ReportAttachment) => void;
}): ReactElement {
  const date = reportDate(service.serviceDate, voice.language);
  const place = reportPlace(service, heading);
  const replaced = service.actions.some((action) => action.replacement);

  return (
    <div
      className="break-inside-avoid flex flex-col gap-2 py-3 first:pt-0"
      style={{ borderBottom: `1px solid ${REPORT_PAPER.rule}` }}
    >
      <div className="flex justify-between items-baseline gap-4">
        <span className="tabular-nums text-xs min-w-0" style={{ color: REPORT_PAPER.inkMuted }}>
          {date ?? heading.noDate}
          {place !== null && ` · ${place}`}
        </span>
        <span className="tabular-nums text-sm shrink-0">{reportCost(service.totalCost, voice)}</span>
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
          className="tabular-nums uppercase text-[10px] font-semibold tracking-label self-start px-1.5 py-0.5 rounded"
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
                <span className="tabular-nums text-xs shrink-0" style={{ color: REPORT_PAPER.inkMuted }}>
                  {formatFileSize(attachment.sizeBytes, voice.language)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
