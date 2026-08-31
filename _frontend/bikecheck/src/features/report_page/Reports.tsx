// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { ActionIcon, Menu, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Link2Off, MoreVertical, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ReportCard } from "@/features/report/ReportCard";
import {
  useDiscardAllReports,
  useDiscardReport,
  useMyReports,
  useRevokeAllReports,
  useRevokeReport,
} from "@/features/report/report.queries";
import type { ReportSummary } from "@/features/report/report.types";
import { useHeaderStore } from "@/store/store";
import { EmptyReports } from "./EmptyReports";

// How many placeholder rows stand in while the list loads.
const SKELETON_ROWS = 3;

// A bike id the user cannot have typed by hand reads as no filter at all, so junk in the
// URL never reaches the API as ?bikeId=NaN.
function parseBikeId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Which act the owner is about to run across the whole list. Null keeps both shut.
type Sweep = "revokeAll" | "deleteAll";

// A link still open is one revoking would actually close.
function isLive(report: ReportSummary): boolean {
  return report.is_public && !report.revoked;
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
  const remove = useDiscardReport();
  const revokeAll = useRevokeAllReports();
  const removeAll = useDiscardAllReports();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  // Which link the owner is taking back. Null keeps the confirmation shut.
  const [revoking, setRevoking] = useState<number | null>(null);
  // And which closed row they are throwing away for good. Two separate acts, so two.
  const [deleting, setDeleting] = useState<number | null>(null);
  // The same two acts, across everything the list is showing.
  const [sweeping, setSweeping] = useState<Sweep | null>(null);
  // What the server said it reached, once it has run. The list the owner was looking at
  // cannot know this, so it is the answer that is reported rather than the estimate.
  const [swept, setSwept] = useState<{ act: Sweep; count: number } | null>(null);

  // What each act would reach, counted off the rows on screen — enough to word the
  // question and to know when there is nothing to ask about.
  const liveCount = useMemo(() => (reports ?? []).filter(isLive).length, [reports]);
  const closedCount = useMemo(() => (reports ?? []).filter((report) => !isLive(report)).length, [reports]);

  // The header carries the two sweeping acts, one tap off the list: destructive, and never
  // under the thumb that is scrolling.
  useEffect(() => {
    setActionSlot(
      <Menu position="bottom-end" radius="md" withinPortal>
        <Menu.Target>
          <ActionIcon variant="transparent" radius="xl" size="lg" aria-label={t("report.bulkActions")}>
            <MoreVertical size={22} color="var(--mantine-color-text-6)" />
          </ActionIcon>
        </Menu.Target>

        {/* Wears the same surface as the FAB menu, so the app has one dropdown. */}
        <Menu.Dropdown
          bg="cards.6"
          p={8}
          style={{
            border: "1px solid var(--mantine-color-cards-5)",
            boxShadow: "0 0 10px 0 color-mix(in srgb, var(--mantine-color-text-9) 35%, transparent)",
          }}
        >
          <Menu.Item
            color="text"
            py={12}
            fw={600}
            leftSection={<Link2Off size={18} />}
            disabled={liveCount === 0}
            onClick={() => setSweeping("revokeAll")}
          >
            {t("report.revokeAll")}
          </Menu.Item>
          <Menu.Item
            color="red.5"
            py={12}
            fw={600}
            leftSection={<Trash2 size={18} />}
            disabled={closedCount === 0}
            onClick={() => setSweeping("deleteAll")}
          >
            {t("report.deleteAll")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>,
    );

    return () => setActionSlot(null);
  }, [setActionSlot, t, liveCount, closedCount]);

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

  // Nothing shared leaves nothing to revoke or throw away, so the list and both of its
  // questions stand down and the page is the empty state alone.
  if (reports === undefined || reports.length === 0) {
    return <EmptyReports forBike={bikeId !== null} />;
  }

  return (
    <Stack gap="sm" px="md" pt="md" pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onRevoke={() => setRevoking(report.id)}
          onDelete={() => setDeleting(report.id)}
        />
      ))}

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

      {/* Deleting a closed row takes its history with it, so it is asked for twice too. */}
      <ConfirmModal
        opened={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting === null) return;
          remove.mutate(deleting, { onSuccess: () => setDeleting(null) });
        }}
        title={t("report.deleteConfirmTitle")}
        body={t("report.deleteConfirmBody")}
        cancelLabel={t("report.deleteConfirmCancel")}
        confirmLabel={t("report.delete")}
        pending={remove.isPending}
      />

      {remove.isError && (
        <Text fz={13} c="red.5">
          {t("report.deleteFailed")}
        </Text>
      )}

      {/* The same two questions, worded for how many rows they would reach. */}
      <ConfirmModal
        opened={sweeping === "revokeAll"}
        onCancel={() => setSweeping(null)}
        onConfirm={() =>
          revokeAll.mutate(bikeId ?? undefined, {
            onSuccess: (result) => {
              setSwept({ act: "revokeAll", count: result.count });
              setSweeping(null);
            },
          })
        }
        title={t("report.revokeAllConfirmTitle")}
        body={t("report.revokeAllConfirmBody", { count: liveCount })}
        cancelLabel={t("report.revokeConfirmCancel")}
        confirmLabel={t("report.revoke")}
        pending={revokeAll.isPending}
      />

      <ConfirmModal
        opened={sweeping === "deleteAll"}
        onCancel={() => setSweeping(null)}
        onConfirm={() =>
          removeAll.mutate(bikeId ?? undefined, {
            onSuccess: (result) => {
              setSwept({ act: "deleteAll", count: result.count });
              setSweeping(null);
            },
          })
        }
        title={t("report.deleteAllConfirmTitle")}
        body={t("report.deleteAllConfirmBody", { count: closedCount })}
        cancelLabel={t("report.deleteConfirmCancel")}
        confirmLabel={t("report.delete")}
        pending={removeAll.isPending}
      />

      {swept !== null && (
        <Text fz={13} c="text.8">
          {t(swept.act === "revokeAll" ? "report.revokeAllDone" : "report.deleteAllDone", { count: swept.count })}
        </Text>
      )}

      {revokeAll.isError && (
        <Text fz={13} c="red.5">
          {t("report.revokeAllFailed")}
        </Text>
      )}

      {removeAll.isError && (
        <Text fz={13} c="red.5">
          {t("report.deleteAllFailed")}
        </Text>
      )}
    </Stack>
  );
}
