// Report API calls use the shared client. The public read is the one call in the app
// that expects no session behind it.
import { apiFetch, apiFetchBlob, apiUrl } from "@/api/client";
import type {
  ExportReportInput,
  ExportedReport,
  ReportBulkResult,
  ReportSnapshot,
  ReportSummary,
} from "./report.types";

// POST /reports/export — makes one Report and hands back the document it just froze.
// Nothing is public yet.
export async function exportReport(input: ExportReportInput): Promise<ExportedReport> {
  return apiFetch<ExportedReport>("/reports/export", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// GET /reports/mine — everything the owner has out in their name, newest first. Metadata
// only: the list says what each link is, never what is behind it. Omitting the bike asks
// across the whole garage.
export async function listMyReports(bikeId?: number): Promise<ReportSummary[]> {
  const query = bikeId === undefined ? "" : `?bikeId=${String(bikeId)}`;
  return apiFetch<ReportSummary[]>(`/reports/mine${query}`);
}

// PATCH /reports/:id/publish — opens the Share Link. The deliberate second act.
export async function publishReport(id: number): Promise<ReportSummary> {
  return apiFetch<ReportSummary>(`/reports/${id}/publish`, { method: "PATCH" });
}

// PATCH /reports/:id/revoke — takes the link back. Final: the page and every attachment
// behind it close at the same instant, and a revoked Report is never published again.
export async function revokeReport(id: number): Promise<ReportSummary> {
  return apiFetch<ReportSummary>(`/reports/${id}/revoke`, { method: "PATCH" });
}

// DELETE /reports/:id — throws away a Report nobody has seen. Answers with what it
// removed. A published Report is revoked instead.
export async function discardReport(id: number): Promise<ReportSummary> {
  return apiFetch<ReportSummary>(`/reports/${id}`, { method: "DELETE" });
}

// PATCH /reports/mine/revoke - closes every link the owner still has open, in one act.
// Only open links: a Report never published stays publishable. Answers with how many it
// actually reached, which the list the owner was looking at cannot know.
export async function revokeAllReports(bikeId?: number): Promise<ReportBulkResult> {
  const query = bikeId === undefined ? "" : `?bikeId=${String(bikeId)}`;
  return apiFetch<ReportBulkResult>(`/reports/mine/revoke${query}`, {
    method: "PATCH",
  });
}

// DELETE /reports/mine - throws away every Report nobody can read. A live link is left
// standing, exactly as the single delete refuses one.
export async function discardAllReports(bikeId?: number): Promise<ReportBulkResult> {
  const query = bikeId === undefined ? "" : `?bikeId=${String(bikeId)}`;
  return apiFetch<ReportBulkResult>(`/reports/mine${query}`, {
    method: "DELETE",
  });
}

// GET /reports/public/:token — the document behind a Share Link. Every closed state
// answers 410 alike, so the reader is told the link is gone and never which way. Asked for
// as the print variant, the same document comes back without counting a view: the server
// drawing the page for a file is not a reader opening it.
export async function getPublicReport(token: string, print: boolean): Promise<ReportSnapshot> {
  const variant = print ? "?print=1" : "";
  return apiFetch<ReportSnapshot>(`/reports/public/${encodeURIComponent(token)}${variant}`);
}

// Where one attachment's bytes are read from behind a share link. The report serves its
// own files, so a reader never gets the storage address and revoking closes the invoices
// at the same instant as the page.
export function publicAttachmentUrl(token: string, attachmentId: number): string {
  return apiUrl(`/reports/public/${encodeURIComponent(token)}/attachment/${attachmentId}`);
}

// Where the report is printed to A4. The reader downloads the very page they are on, so
// the document is designed once and printed rather than built a second time.
export function publicReportPdfUrl(token: string): string {
  return apiUrl(`/reports/public/${encodeURIComponent(token)}/pdf`);
}

// The same file on the owner's side, so the preview can open what it lists before any of
// it is public. Fetched rather than linked: the route is behind the session, and a system
// browser tab does not carry the app's cookies.
export async function fetchOwnedAttachment(reportId: number, attachmentId: number): Promise<Blob> {
  return apiFetchBlob(`/reports/${reportId}/attachment/${attachmentId}`);
}
