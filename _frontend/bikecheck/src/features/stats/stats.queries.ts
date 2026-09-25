// Home's chart queries.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getSpend } from "./stats.api";
import type { Spend } from "./stats.types";

// Keyed under "services", so every write that drops the history drops the spend with it.
export function useSpend(): UseQueryResult<Spend> {
  return useQuery({
    queryKey: ["services", "spend"],
    queryFn: getSpend,
  });
}
