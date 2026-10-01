// Desktop Service's bike, period and page, kept in the URL: `?bike=&period=&page=`.
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { parseHomePeriod } from "@/features/stats/homePeriod";
import type { HomePeriod } from "@/features/stats/stats.types";

export interface ServicePageParams {
  // Null is every bike.
  bikeId: number | null;
  period: HomePeriod;
  page: number;
}

export interface ServicePageControls extends ServicePageParams {
  setBike: (bikeId: number | null) => void;
  setPeriod: (period: HomePeriod) => void;
  setPage: (page: number) => void;
}

// Anything unreadable falls back to every bike, the year and the first page.
export function readServicePageParams(params: URLSearchParams): ServicePageParams {
  const bike = Number(params.get("bike"));
  const page = Number(params.get("page"));
  return {
    bikeId: Number.isInteger(bike) && bike > 0 ? bike : null,
    period: parseHomePeriod(params.get("period")),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function useServicePageParams(): ServicePageControls {
  const [searchParams, setSearchParams] = useSearchParams();

  // Pushed, so Back undoes a filter or a page; defaults stay out of the URL.
  const update = useCallback(
    (change: (params: URLSearchParams) => void): void => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        change(next);
        return next;
      });
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
        if (period === "year") params.delete("period");
        else params.set("period", period);
        params.delete("page");
      }),
    [update],
  );
  const setPage = useCallback(
    (page: number): void => update((params) => (page === 1 ? params.delete("page") : params.set("page", String(page)))),
    [update],
  );

  return { ...readServicePageParams(searchParams), setBike, setPeriod, setPage };
}
