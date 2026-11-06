// Which Reports count as out there, so the Reports list and the marks on a bike agree.
import type { ReportSummary } from "./report.types";

// A link still open is one revoking would actually close.
export function isLive(report: ReportSummary): boolean {
  return report.is_public && !report.revoked;
}
