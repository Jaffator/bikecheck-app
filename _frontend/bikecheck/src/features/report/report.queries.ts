// React Query hooks for making, publishing and reading Reports.
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import {
  discardReport,
  exportReport,
  fetchOwnedAttachment,
  getPublicReport,
  publicAttachmentUrl,
  publicReportPdfUrl,
  publishReport,
} from "./report.api";
import type { ExportReportInput, ExportedReport, ReportAttachment, ReportSnapshot, ReportSummary } from "./report.types";
import type { ApiError } from "@/api/client";

// Making a Report adds one to what the owner has out in their name.
export function useExportReport(): UseMutationResult<ExportedReport, Error, ExportReportInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExportReportInput) => exportReport(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// Publishing opens the link, which changes what the Reports list says about it.
export function usePublishReport(): UseMutationResult<ReportSummary, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => publishReport(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// Discarding leaves no trace, so nothing is left to list.
export function useDiscardReport(): UseMutationResult<ReportSummary, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => discardReport(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// The document behind a Share Link. A closed link is an answer, not a fault worth
// retrying, and the read counts a view — so it is asked once and held. The print variant
// asks for the same document without being counted.
export function usePublicReport(
  token: string | undefined,
  print: boolean,
): UseQueryResult<ReportSnapshot, ApiError> {
  return useQuery<ReportSnapshot, ApiError>({
    queryKey: ["reports", "public", token, print],
    queryFn: () => getPublicReport(token ?? "", print),
    enabled: token !== undefined && token !== "",
    retry: false,
    staleTime: Infinity,
  });
}

// How a reader opens one of the report's attachments behind a share link. Public, so the
// address can simply be followed - and it stops opening the instant the link is revoked.
export function usePublicAttachmentOpener(token: string | undefined): (attachment: ReportAttachment) => void {
  return useCallback(
    (attachment: ReportAttachment) => {
      window.open(publicAttachmentUrl(token ?? "", attachment.id), "_blank", "noopener");
    },
    [token],
  );
}

// Where the reader downloads the document as a file. Public, so the address is simply
// followed - and it stops answering the instant the link is revoked.
export function usePublicReportPdfUrl(token: string | undefined): string {
  return useMemo(() => publicReportPdfUrl(token ?? ""), [token]);
}

// The same for the owner, before anything is public. The bytes are pulled through the
// session and handed to the browser as a blob: the route is authenticated, and a system
// browser tab would arrive at it without the app's cookies.
export function useOwnedAttachmentOpener(reportId: number | undefined): (attachment: ReportAttachment) => void {
  return useCallback(
    (attachment: ReportAttachment) => {
      if (reportId === undefined) return;

      void (async () => {
        const blob = await fetchOwnedAttachment(reportId, attachment.id);
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, "_blank", "noopener");
        // The tab has taken its own reference by now; this one only has to stop leaking.
        setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_LIFETIME_MS);
      })();
    },
    [reportId],
  );
}

// Long enough for the opened tab to have read the blob, short enough not to hold it for
// the life of the session.
const OBJECT_URL_LIFETIME_MS = 60_000;
