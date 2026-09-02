// Full service history page.
import { useEffect, useState, type ReactElement } from "react";
import { ActionIcon, Box, Group, Loader, Stack } from "@mantine/core";
import { ListFilter } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useHeaderStore } from "@/store/store";
import { BikeFilterChips } from "@/features/service/BikeFilterChips";
import { SWIPE_AREA_STYLE, useBikePanel, useBikeSwipe } from "@/features/service/useBikeSwipe";
import { HistoryTotalsCard } from "@/features/service/HistoryTotalsCard";
import { ServiceList } from "@/features/service/ServiceList";
import { PeriodFilterModal } from "@/features/service/PeriodFilterModal";
import { periodLabel } from "@/features/service/servicePeriod";
import type { ServicePeriod } from "@/features/service/service.types";
import { useHistoryTotals, useServiceHistory } from "@/features/service/service.queries";
import { ExportSheet } from "@/features/report/ExportSheet";
import { EmptyService } from "./EmptyService";
import type { ExportReportInput } from "@/features/report/report.types";

// A bike id the user cannot have typed by hand reads as no filter at all, so junk in the
// URL never reaches the API as ?bikeId=NaN.
function parseBikeId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Anything that is not a plain YYYY-MM-DD day reads as an open end, so junk in the URL
// widens the period rather than emptying the screen.
function parseDay(raw: string | null): string | null {
  if (raw === null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

// Every service the user has recorded, newest work first, divided into Month Groups and
// paged in as they scroll. The History Totals above them sum whatever the bike chip and
// the period filter have narrowed the page to.
export function ServiceHistory(): ReactElement {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: bikes } = useBikes();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const [filterOpened, setFilterOpened] = useState(false);
  // What the Share button is exporting. Null keeps the export sheet shut.
  const [exporting, setExporting] = useState<ExportReportInput | null>(null);

  // Both filters live in the URL, so arriving from the service page keeps the chip the
  // user had already chosen, and the back button undoes a filter rather than the page.
  const bikeId = parseBikeId(searchParams.get("bike"));
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
  const showChips = (bikes?.length ?? 0) > 1;
  // Nothing under these filters: totals of zero and an empty list say less than one clear
  // empty state, so they stand down and it takes the page - the same as Reports.
  const isEmpty = !isLoading && !isError && services.length === 0;

  // A Period Report covers one bike, so a garage of one needs no chip to say which. With
  // several bikes and none chosen there is nothing to export yet.
  const exportBikeId = bikeId ?? (bikes?.length === 1 ? bikes[0].id : null);

  // The chips and a swipe across the content are two ways into the same filter.
  const selectBike = (next: number | null): void => setParams({ bike: next === null ? null : String(next) });
  const swipeHandlers = useBikeSwipe(bikes ?? [], bikeId, selectBike);
  // The history the previous bike left on screen dims until the new one lands, and the new
  // one arrives from the side the selection moved.
  const panel = useBikePanel(bikes ?? [], bikeId, historyStale);

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

  return (
    <Stack gap={0} pb="xl">
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
