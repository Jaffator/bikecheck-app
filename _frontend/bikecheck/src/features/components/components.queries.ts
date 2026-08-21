// Component query hooks.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getComponentGroups, getDefaultComponents } from "./components.api";
import type { AssembleBikeComponent, ComponentGroup } from "./components.types";

// Use default cache timing for seeded data.
export function useComponentGroups(): UseQueryResult<ComponentGroup[]> {
  return useQuery({
    queryKey: ["component-groups"],
    queryFn: getComponentGroups,
  });
}

// Cache defaults by e-bike status.
export function useDefaultComponents(ebike: boolean): UseQueryResult<AssembleBikeComponent[]> {
  return useQuery({
    queryKey: ["default-components", ebike],
    queryFn: () => getDefaultComponents(ebike),
  });
}
