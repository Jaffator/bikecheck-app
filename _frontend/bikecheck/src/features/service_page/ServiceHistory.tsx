// Full service history page.
import { useEffect, useState, type ReactElement } from "react";
import { ActionIcon, Box, Group, Loader, Stack } from "@mantine/core";
import { ListFilter } from "lucide-react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useHeaderStore } from "@/store/store";
import { BikeFilterChips } from "@/features/service/ui/BikeFilterChips";
import { SWIPE_AREA_STYLE, useBikePanel, useBikeSwipe } from "@/features/service/useBikeSwipe";
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
// they scroll. Two doors, two shapes: `/service/history` is the garage's, with a chip to
// narrow it to one bike; `/bikes/:id/history` is one bike's alone, chosen before coming
// here, so it carries no chip and names the bike instead. The History Totals above the
// list sum whatever the page is narrowed to.
export function ServiceHistory(): ReactElement {
  const { t, i18n } = useTranslation();
  const { id: routeBikeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: bikes } = useBikes();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const [filterOpened, setFilterOpened] = useState(false);
  // What the Share button is exporting. Null keeps the export sheet shut.
  const [exporting, setExporting] = useState<ExportReportInput | null>(null);

  // A bike in the path locks the page to it; in the garage's shape the chip lives in the
  // query, so the back button undoes a filter rather than the page.
  const lockedBikeId = parseBikeId(routeBikeId);
  const locked = routeBikeId !== undefined;
  const bikeId = locked ? lockedBikeId : parseBikeId(searchParams.get("bike"));
  const bike = bikes?.find((candidate) => candidate.id === bikeId) ?? null;
  const period: ServicePeriod = {
    from: parseDay(searchParams.get("from")),
    to: parseDay(searchParams.get("to")),
  };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPlaceholderData: historyStale,
  } = useServiceHistory(bikeId ?? undefined, period);
  const {
    data: totals,
    isLoading: totalsLoading,
    isPlaceholderData: totalsStale,
  } = useHistoryTotals(bikeId ?? undefined, period);
  const sentinel = useInfiniteScrollSentinel(hasNextPage, () => void fetchNextPage());

  const services = data?.pages.flatMap((page) => page.items) ?? [];
  // The garage's shape offers a chip when there is a choice to make; one bike's never does.
  const showChips = !locked && (bikes?.length ?? 0) > 1;
  // Nothing under these filters: totals of zero and an empty list say less than one clear
  // empty state, so they stand down and it takes the page - the same as Reports.
  const isEmpty = !isLoading && !isError && services.length === 0;

  // A Period Report covers one bike, so a garage of one needs no chip to say which. With
  // several bikes and none chosen there is nothing to export yet.
  const exportBikeId = bikeId ?? (bikes?.length === 1 ? bikes[0].id : null);

  // The chips and a swipe across the content are two ways into the same filter. Locked to
  // one bike there is no filter, and the swipe is given nothing to move between.
  const selectBike = (next: number | null): void => setParams({ bike: next === null ? null : String(next) });
  const swipeHandlers = useBikeSwipe(locked ? [] : (bikes ?? []), bikeId, selectBike);
  // The history the previous bike left on screen dims until the new one lands, and the new
  // one arrives from the side the selection moved.
  const panel = useBikePanel(locked ? [] : (bikes ?? []), bikeId, historyStale);

  // Opens at the top whichever page it came from: the service page may have been scrolled
  // deep into its list, and the browser would otherwise keep that offset.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [lockedBikeId]);

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

  // Locked to a bike the garage does not have - a URL typed by hand, or a bike since
  // archived. The garage's history is the nearest thing to show.
  if (locked && bikes !== undefined && bike === null) return <Navigate to="/service/history" replace />;

  return (
    <Stack gap={0} pb={FAB_CLEARANCE}>
      {showChips && <BikeFilterChips bikes={bikes ?? []} selected={bikeId} onSelect={selectBike} />}

      {/* The chips stay above it: they are the only way back to a bike that does have a
          history, and the period filter still hangs in the header. pan-y leaves vertical
          scrolling to the browser and hands the sideways gesture here; the bar sits outside
          it, so it keeps its own sideways scroll. */}
      <Box style={SWIPE_AREA_STYLE} {...swipeHandlers}>
        <Box key={panel.key} className={panel.className} style={panel.style}>
          {isEmpty ? (
            <EmptyService forBike={bikeId !== null} forPeriod={period.from !== null || period.to !== null} />
          ) : (
            <Stack gap="lg" className="m-3">
              <HistoryTotalsCard
                totals={totals}
                // Only the locked page names the bike: the garage's has the chip to say so.
                bikeName={locked && bike !== null ? bikeTitle(bike) : null}
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
        </Box>
      </Box>

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
