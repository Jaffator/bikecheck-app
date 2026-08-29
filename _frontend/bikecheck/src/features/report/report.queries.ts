// React Query hooks for making, publishing and reading Reports.
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { discardReport, exportReport, getPublicReport, publishReport } from "./report.api";
import type { ExportReportInput, ExportedReport, ReportSnapshot, ReportSummary } from "./report.types";
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
// retrying, and the read counts a view — so it is asked once and held.
export function usePublicReport(token: string | undefined): UseQueryResult<ReportSnapshot, ApiError> {
  return useQuery<ReportSnapshot, ApiError>({
    queryKey: ["reports", "public", token],
    queryFn: () => getPublicReport(token ?? ""),
    enabled: token !== undefined && token !== "",
    retry: false,
    staleTime: Infinity,
  });
}
