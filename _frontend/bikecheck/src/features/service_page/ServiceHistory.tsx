// Full service history page.
import type { ReactElement } from "react";
import { Group, Loader, Stack } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { useBikes } from "@/features/bikes/bikes.queries";
import { BikeFilterChips } from "@/features/service/BikeFilterChips";
import { ServiceList } from "@/features/service/ServiceList";
import { useServiceHistory } from "@/features/service/service.queries";

// A bike id the user cannot have typed by hand reads as no filter at all, so junk in the
// URL never reaches the API as ?bikeId=NaN.
function parseBikeId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Every service the user has recorded, newest work first, divided into Month Groups and
// paged in as they scroll.
export function ServiceHistory(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: bikes } = useBikes();

  // The filter lives in the URL, so arriving from the service page keeps the chip
  // the user had already chosen.
  const bikeId = parseBikeId(searchParams.get("bike"));

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useServiceHistory(
    bikeId ?? undefined,
  );
  const sentinel = useInfiniteScrollSentinel(hasNextPage, () => void fetchNextPage());

  const services = data?.pages.flatMap((page) => page.items) ?? [];
  const showChips = (bikes?.length ?? 0) > 1;

  function selectBike(next: number | null): void {
    const params = new URLSearchParams(searchParams);
    if (next === null) {
      params.delete("bike");
    } else {
      params.set("bike", String(next));
    }
    setSearchParams(params, { replace: true });
  }

  return (
    <Stack gap={0} pb="xl">
      {showChips && <BikeFilterChips bikes={bikes ?? []} selected={bikeId} onSelect={selectBike} />}

      {/* Month Groups need more air between them than cards do inside one. */}
      <Stack gap="lg" className="m-3">
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
    </Stack>
  );
}
