// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ReportCard } from "@/features/report/ReportCard";
import { useMyReports, useRevokeReport } from "@/features/report/report.queries";

// How many placeholder rows stand in while the list loads.
const SKELETON_ROWS = 3;

// A bike id the user cannot have typed by hand reads as no filter at all, so junk in the
// URL never reaches the API as ?bikeId=NaN.
function parseBikeId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Everything the owner has out in their name, newest first. Arriving from a bike detail
// narrows it to that bike, so the owner is not hunting through every link they ever made.
export function Reports(): ReactElement {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  // The filter lives in the URL, so the back button undoes the filter rather than the page.
  const bikeId = parseBikeId(searchParams.get("bike"));
  const { data: reports, isLoading, isError } = useMyReports(bikeId ?? undefined);
  const revoke = useRevokeReport();
  // Which link the owner is taking back. Null keeps the confirmation shut.
  const [revoking, setRevoking] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Stack gap="sm" px="md" pt="md">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} h={132} radius="lg" />
        ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Text m="md" c="red">
        {t("report.listFailed")}
      </Text>
    );
  }

  return (
    <Stack gap="sm" px="md" pt="md" pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {reports === undefined || reports.length === 0 ? (
        <Text fz={14} c="var(--color-text-dim)">
          {t("report.listEmpty")}
        </Text>
      ) : (
        reports.map((report) => (
          <ReportCard key={report.id} report={report} onRevoke={() => setRevoking(report.id)} />
        ))
      )}

      {/* Revoking closes the page and its attachments at the same instant, and is final. */}
      <ConfirmModal
        opened={revoking !== null}
        onCancel={() => setRevoking(null)}
        onConfirm={() => {
          if (revoking === null) return;
          revoke.mutate(revoking, { onSuccess: () => setRevoking(null) });
        }}
        title={t("report.revokeConfirmTitle")}
        body={t("report.revokeConfirmBody")}
        cancelLabel={t("report.revokeConfirmCancel")}
        confirmLabel={t("report.revoke")}
        pending={revoke.isPending}
      />

      {revoke.isError && (
        <Text fz={13} c="red.5">
          {t("report.revokeFailed")}
        </Text>
      )}
    </Stack>
  );
}
