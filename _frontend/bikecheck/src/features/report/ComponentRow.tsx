// One part on a bike, as a Period Report and a BikeCheck both write it down - so the two
// never word the same thing differently.
import type { ReactElement } from "react";
import type { ReportComponent } from "./report.types";
import { REPORT_PAPER, reportComponentLabel, reportDate, reportNumber, reportRideTime } from "./reportFormat";
import type { ReportHeadings } from "./reportHeadings";
import { RowLabel } from "./ReportPaper";

// One part on the bike: what it is, how far it has gone, and when it was last worked on —
// which is what a buyer checks against the machine in front of them.
export function ComponentRow({
  component,
  heading,
  language,
  compact = false,
}: {
  component: ReportComponent;
  heading: ReportHeadings;
  language: string;
  compact?: boolean;
}): ReactElement {
  const mounted = reportDate(component.mountedAt, language);
  const lastService = reportDate(component.lastServiceAt, language);

  return (
    <div
      className={`break-inside-avoid flex justify-between items-baseline gap-4 ${compact ? "py-2" : "py-3"} first:pt-0`}
      style={{ borderBottom: `1px solid ${REPORT_PAPER.rule}` }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={`font-semibold leading-snug ${compact ? "text-[12px]" : "text-[15px]"}`}>
          {reportComponentLabel(component)}
        </span>
        <span className="font-mono text-[11px]" style={{ color: REPORT_PAPER.inkMuted }}>
          {mounted === null ? "" : `${heading.mounted}: ${mounted} · `}
          {`${heading.lastService}: ${lastService ?? heading.neverServiced}`}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <RowLabel>{heading.wear}</RowLabel>
        <span className={`font-mono ${compact ? "text-[11px]" : "text-sm"}`}>{wear(component, language)}</span>
      </div>
    </div>
  );
}

// How far the part has gone, in whichever of the two axes was recorded for it.
function wear(component: ReportComponent, language: string): string {
  const parts: string[] = [];
  if (component.totalKm !== null) parts.push(`${reportNumber(component.totalKm, language)} km`);
  if (component.totalTimeMin !== null) parts.push(reportRideTime(component.totalTimeMin, language));

  return parts.length === 0 ? "—" : parts.join(" · ");
}
