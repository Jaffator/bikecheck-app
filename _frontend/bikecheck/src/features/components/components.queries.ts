// React Query hooks. This is where loading / error / cache state lives.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getComponentGroups, getDefaultComponents } from "./components.api";
import type { AssembleBikeComponent, ComponentGroup } from "./components.types";

// Groups and default types are seeded reference data, but the seed itself gets
// edited during development — so they follow the default staleTime and pick up
// a reseed on the next refetch instead of being held for the whole session.
export function useComponentGroups(): UseQueryResult<ComponentGroup[]> {
  return useQuery({
    queryKey: ["component-groups"],
    queryFn: getComponentGroups,
  });
}

// Cached per ebike flag: toggling the switch on step 2 adds the motor/battery
// types, and switching back reuses the list it already had until it goes stale.
export function useDefaultComponents(ebike: boolean): UseQueryResult<AssembleBikeComponent[]> {
  return useQuery({
    queryKey: ["default-components", ebike],
    queryFn: () => getDefaultComponents(ebike),
  });
}
