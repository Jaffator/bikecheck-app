// The timeline on paper, one table per year. Bike and Period Reports share it.
import type { ReactElement } from "react";
import type { ReportService } from "@/features/report/report.types";
import {
  REPORT_PAPER,
  reportComponentLabel,
  reportCost,
  reportDate,
  reportPlace,
} from "@/features/report/reportFormat";
import type { ReportHeadings } from "@/features/report/reportHeadings";
import { groupByYear } from "@/features/report/reportTimeline";
import { Section } from "./ReportPaper";

// The language and currency the document was frozen in.
interface DocumentVoice {
  language: string;
  currency: string;
}

interface ServiceTimelinePrintProps {
  services: ReportService[];
  voice: DocumentVoice;
  heading: ReportHeadings;
}

export function ServiceTimelinePrint({ services, voice, heading }: ServiceTimelinePrintProps): ReactElement {
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
        <Section key={group.year ?? "undated"} title={group.year ?? heading.noDate}>
          <table className="w-full text-left text-[12px] border-collapse">
            <tbody>
              {group.services.map((service, index) => (
                <ServiceRow key={index} service={service} voice={voice} heading={heading} />
              ))}
            </tbody>
          </table>
        </Section>
      ))}
    </>
  );
}

// One occasion, on one row — and never broken across two pages.
function ServiceRow({
  service,
  voice,
  heading,
}: {
  service: ReportService;
  voice: DocumentVoice;
  heading: ReportHeadings;
}): ReactElement {
  const date = reportDate(service.serviceDate, voice.language);
  const place = reportPlace(service, heading);
  const replaced = service.actions.some((action) => action.replacement);
  const components = service.actions.flatMap((action) => action.components);

  return (
    <tr className="break-inside-avoid" style={{ borderBottom: `1px solid ${REPORT_PAPER.rule}` }}>
      {/* The date never breaks; a long shop name wraps under it rather than widening the column. */}
      <td className="py-2.5 pr-4 align-top w-[18%] tabular-nums" style={{ color: REPORT_PAPER.inkMuted }}>
        <span className="whitespace-nowrap">{date ?? heading.noDate}</span>
        {place !== null && ` · ${place}`}
      </td>
      <td className="py-2.5 pr-4 align-top w-[46%]">
        <span className="font-semibold leading-snug">
          {service.actions.length === 0 ? heading.noWork : service.actions.map((action) => action.name).join(", ")}
        </span>
        {/* A buyer must be able to tell a new part from a serviced one. */}
        {replaced && (
          <span
            className="block mt-1 tabular-nums uppercase text-[9px] font-semibold tracking-label"
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
      <td className="py-2.5 align-top text-right tabular-nums whitespace-nowrap">
        {reportCost(service.totalCost, voice)}
      </td>
    </tr>
  );
}
