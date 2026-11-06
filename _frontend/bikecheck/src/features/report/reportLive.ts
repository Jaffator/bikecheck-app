// What makes a Report's link open, so the Reports list and the marks on a bike count the same ones.
import type { ReportSummary } from "./report.types";

// A link still open is one revoking would actually close.
export function isLive(report: ReportSummary): boolean {
  return report.is_public && !report.revoked;
}
