// The desktop table's bike, month and page, kept in the URL so a refresh keeps them.
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { readTableParams, type RideTableParams } from "./ridesTable";

export interface RideTableControls extends RideTableParams {
  setBike: (bikeId: number | null) => void;
  setMonth: (month: string) => void;
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
  const setMonth = useCallback(
    (month: string): void =>
      update((params) => {
        params.set("month", month);
        params.delete("page");
      }),
    [update],
  );
  const setPage = useCallback(
    (page: number): void => update((params) => (page === 1 ? params.delete("page") : params.set("page", String(page)))),
    [update],
  );

  return { ...readTableParams(searchParams), setBike, setMonth, setPage };
}
