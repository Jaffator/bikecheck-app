// Home's Period, kept in the URL as `?period=`, so a reload or Back keeps it.
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_HOME_PERIOD, parseHomePeriod } from "./homePeriod";
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
          if (next === DEFAULT_HOME_PERIOD) params.delete("period");
          else params.set("period", next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { period: parseHomePeriod(searchParams.get("period")), setPeriod };
}
