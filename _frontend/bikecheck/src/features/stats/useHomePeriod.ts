// Home's Period, kept in the URL as `?period=` or `?from=&to=`, so a reload or Back keeps it.
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { parseHomePeriod, writeHomePeriod } from "./homePeriod";
import type { HomePeriod } from "./stats.types";

export interface HomePeriodControls {
  period: HomePeriod;
  setPeriod: (period: HomePeriod) => void;
}

export function useHomePeriod(): HomePeriodControls {
  const [searchParams, setSearchParams] = useSearchParams();

  // Replaced rather than pushed, so Back leaves Home instead of stepping through the switcher.
  const setPeriod = useCallback(
    (next: HomePeriod): void => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          writeHomePeriod(params, next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Held, because the cards compare the Period by identity and a custom one is an object.
  const period = useMemo(() => parseHomePeriod(searchParams), [searchParams]);

  return { period, setPeriod };
}
