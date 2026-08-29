// Report API calls use the shared client. The public read is the one call in the app
// that expects no session behind it.
import { apiFetch } from "@/api/client";
import type { ExportReportInput, ExportedReport, ReportSnapshot, ReportSummary } from "./report.types";

// POST /reports/export — makes one Report and hands back the document it just froze.
// Nothing is public yet.
export async function exportReport(input: ExportReportInput): Promise<ExportedReport> {
  return apiFetch<ExportedReport>("/reports/export", { method: "POST", body: JSON.stringify(input) });
}

// PATCH /reports/:id/publish — opens the Share Link. The deliberate second act.
export async function publishReport(id: number): Promise<ReportSummary> {
  return apiFetch<ReportSummary>(`/reports/${id}/publish`, { method: "PATCH" });
}

// DELETE /reports/:id — throws away a Report nobody has seen. Answers with what it
// removed. A published Report is revoked instead.
export async function discardReport(id: number): Promise<ReportSummary> {
  return apiFetch<ReportSummary>(`/reports/${id}`, { method: "DELETE" });
}

// GET /reports/public/:token — the document behind a Share Link. Every closed state
// answers 410 alike, so the reader is told the link is gone and never which way.
export async function getPublicReport(token: string): Promise<ReportSnapshot> {
  return apiFetch<ReportSnapshot>(`/reports/public/${encodeURIComponent(token)}`);
}
