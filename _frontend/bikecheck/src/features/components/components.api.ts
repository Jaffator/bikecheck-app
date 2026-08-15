// Knows which endpoint to call and what type comes back. Uses the shared
// apiFetch client — no fetch, base URL or token handling lives here.
// Backend routes are under "/components" (see component.controller.ts).
import { apiFetch } from "@/api/client";
import type { AssembleBikeComponent, ComponentGroup } from "./components.types";

// GET /components/groups — the categories every component type belongs to.
export async function getComponentGroups(): Promise<ComponentGroup[]> {
  return apiFetch<ComponentGroup[]>("/components/groups");
}

// GET /components/default-components — every trackable component type, as
// blank mounted-component drafts. E-bike-only types are left out unless asked for.
export async function getDefaultComponents(ebike: boolean): Promise<AssembleBikeComponent[]> {
  const query = new URLSearchParams({ ebike: String(ebike) });
  return apiFetch<AssembleBikeComponent[]>(`/components/default-components?${query.toString()}`);
}
