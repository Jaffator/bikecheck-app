// Full service history page.
import { useEffect, useState, type ReactElement } from "react";
import { ActionIcon, Group, Loader, Stack } from "@mantine/core";
import { ListFilter } from "lucide-react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useHeaderStore } from "@/store/store";
import { HistoryTotalsCard } from "@/features/service/ui/HistoryTotalsCard";
import { ServiceList } from "@/features/service/ui/ServiceList";
import { PeriodFilterModal } from "@/features/service/ui/PeriodFilterModal";
import { periodLabel } from "@/features/service/servicePeriod";
import type { ServicePeriod } from "@/features/service/service.types";
import { useHistoryTotals, useServiceHistory } from "@/features/service/service.queries";
import { ExportSheet } from "@/features/report/ui/ExportSheet";
import { EmptyService } from "./EmptyService";
import type { ExportReportInput } from "@/features/report/report.types";

// Clears the FAB and the bottom nav, so the last row can still be tapped.
const FAB_CLEARANCE = "calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

// A bike id the user cannot have typed by hand reads as no filter at all, so junk in the
// URL never reaches the API as ?bikeId=NaN.
function parseBikeId(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Anything that is not a plain YYYY-MM-DD day reads as an open end, so junk in the URL
// widens the period rather than emptying the screen.
function parseDay(raw: string | null): string | null {
  if (raw === null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

// Every service recorded, newest work first, divided into Month Groups and paged in as
// they scroll. Two doors, two shapes, and no chip on either: `/service/history` is the
// whole garage's, `/bikes/:id/history` one bike's alone. Which one is chosen before coming
// here, on the service page, and the History Totals above the list name it.
export function ServiceHistory(): ReactElement {
  const { t, i18n } = useTranslation();
  const { id: routeBikeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: bikes } = useBikes();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const [filterOpened, setFilterOpened] = useState(false);
  // What the Share button is exporting. Null keeps the export sheet shut.
  const [exporting, setExporting] = useState<ExportReportInput | null>(null);

  // A bike in the path narrows the page to it; none means the whole garage. The period
  // lives in the query, so the back button undoes a filter rather than the page.
  const bikeId = parseBikeId(routeBikeId);
  const forBike = routeBikeId !== undefined;
  const bike = bikes?.find((candidate) => candidate.id === bikeId) ?? null;
  const period: ServicePeriod = {
    from: parseDay(searchParams.get("from")),
    to: parseDay(searchParams.get("to")),
  };

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useServiceHistory(
    bikeId ?? undefined,
    period,
  );
  const {
    data: totals,
    isLoading: totalsLoading,
    isPlaceholderData: totalsStale,
  } = useHistoryTotals(bikeId ?? undefined, period);
  const sentinel = useInfiniteScrollSentinel(hasNextPage, () => void fetchNextPage());

  const services = data?.pages.flatMap((page) => page.items) ?? [];
  // Nothing under these filters: totals of zero and an empty list say less than one clear
  // empty state, so they stand down and it takes the page - the same as Reports.
  const isEmpty = !isLoading && !isError && services.length === 0;

  // A Period Report covers one bike, so a garage of one needs no choice to say which. The
  // whole garage of several is nothing a Period Report could be about.
  const exportBikeId = bikeId ?? (bikes?.length === 1 ? bikes[0].id : null);

  // Opens at the top whichever page it came from: the service page may have been scrolled
  // deep into its list, and the browser would otherwise keep that offset.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [bikeId]);

  // The period filter hangs in the app header, which is the layout's to render - see the
  // header store. It leaves with the page.
  useEffect(() => {
    setActionSlot(
      // Exporting lives on the Totals card, which states what it is summing. The header
      // carries only what changes that summary.
      <ActionIcon
        variant="subtle"
        color="gray"
        radius="md"
        size="lg"
        aria-label={t("service.periodTitle")}
        onClick={() => setFilterOpened(true)}
      >
        <ListFilter size={20} color="var(--mantine-color-text-6)" />
      </ActionIcon>,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, t]);

  function setParams(next: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params, { replace: true });
  }

  // A bike the garage does not have - a URL typed by hand, or a bike since archived. The
  // garage's history is the nearest thing to show.
  if (forBike && bikes !== undefined && bike === null) return <Navigate to="/service/history" replace />;

  return (
    <Stack gap={0} pb={FAB_CLEARANCE}>
      {isEmpty ? (
        <EmptyService forBike={forBike} forPeriod={period.from !== null || period.to !== null} />
      ) : (
        <Stack gap="lg" className="m-3">
          <HistoryTotalsCard
            totals={totals}
            // The card says what the page is: one bike by name, or every bike at once.
            bikeName={bike !== null ? bikeTitle(bike) : t("service.allBikes")}
            periodLabel={periodLabel(period, t, i18n.language)}
            isLoading={totalsLoading}
            isStale={totalsStale}
            onShare={
              exportBikeId === null
                ? null
                : () =>
                    setExporting({
                      kind: "PERIOD",
                      bike_id: exportBikeId,
                      from: period.from ?? undefined,
                      to: period.to ?? undefined,
                    })
            }
          />

          {/* Month Groups need more air between them than cards do inside one. */}
          <ServiceList
            grouped
            services={services}
            isLoading={isLoading}
            isError={isError}
            footer={
              // Sentinel for loading the next page.
              hasNextPage ? (
                <Group ref={sentinel} justify="center" p="md">
                  {isFetchingNextPage && <Loader size="sm" />}
                </Group>
              ) : null
            }
          />
        </Stack>
      )}

      <ExportSheet input={exporting} onClose={() => setExporting(null)} />

      <PeriodFilterModal
        opened={filterOpened}
        onClose={() => setFilterOpened(false)}
        period={period}
        onApply={(next) => setParams({ from: next.from, to: next.to })}
      />
    </Stack>
  );
}
