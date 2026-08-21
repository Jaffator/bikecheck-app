// Component API requests.
import { apiFetch } from "@/api/client";
import type { AssembleBikeComponent, ComponentGroup } from "./components.types";

// Get component groups.
export async function getComponentGroups(): Promise<ComponentGroup[]> {
  return apiFetch<ComponentGroup[]>("/components/groups");
}

// Get default components for the bike type.
export async function getDefaultComponents(ebike: boolean): Promise<AssembleBikeComponent[]> {
  const query = new URLSearchParams({ ebike: String(ebike) });
  return apiFetch<AssembleBikeComponent[]>(`/components/default-components?${query.toString()}`);
}
