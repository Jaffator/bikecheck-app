// The desktop table's bike, period and page, kept in the URL so a refresh keeps them.
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_HOME_PERIOD } from "@/features/stats/homePeriod";
import type { HomePeriod } from "@/features/stats/stats.types";
import { readTableParams, type RideTableParams } from "./ridesTable";

export interface RideTableControls extends RideTableParams {
  setBike: (bikeId: number | null) => void;
  setPeriod: (period: HomePeriod) => void;
  setPage: (page: number) => void;
}

export function useRideTableParams(): RideTableControls {
  const [searchParams, setSearchParams] = useSearchParams();

  // Replaced, not pushed, so Back leaves the page; the other parameters stay.
  const update = useCallback(
    (change: (params: URLSearchParams) => void): void => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          change(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // A new filter starts on its first page.
  const setBike = useCallback(
    (bikeId: number | null): void =>
      update((params) => {
        if (bikeId === null) params.delete("bike");
        else params.set("bike", String(bikeId));
        params.delete("page");
      }),
    [update],
  );
  const setPeriod = useCallback(
    (period: HomePeriod): void =>
      update((params) => {
        if (period === DEFAULT_HOME_PERIOD) params.delete("period");
        else params.set("period", period);
        params.delete("page");
      }),
    [update],
  );
  const setPage = useCallback(
    (page: number): void => update((params) => (page === 1 ? params.delete("page") : params.set("page", String(page)))),
    [update],
  );

  return { ...readTableParams(searchParams), setBike, setPeriod, setPage };
}
