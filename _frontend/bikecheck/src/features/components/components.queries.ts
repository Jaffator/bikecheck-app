// React Query hooks. This is where loading / error / cache state lives.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getComponentGroups, getDefaultComponents } from "./components.api";
import type { AssembleBikeComponent, ComponentGroup } from "./components.types";

// Groups and default types are seeded reference data — they do not change while
// the user is filling in the wizard, so they are fetched once and kept.
export function useComponentGroups(): UseQueryResult<ComponentGroup[]> {
  return useQuery({
    queryKey: ["component-groups"],
    queryFn: getComponentGroups,
    staleTime: Infinity,
  });
}

// Cached per ebike flag: toggling the switch on step 2 adds the motor/battery
// types, and switching back must not refetch the list it already had.
export function useDefaultComponents(ebike: boolean): UseQueryResult<AssembleBikeComponent[]> {
  return useQuery({
    queryKey: ["default-components", ebike],
    queryFn: () => getDefaultComponents(ebike),
    staleTime: Infinity,
  });
}
