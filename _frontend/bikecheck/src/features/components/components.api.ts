// Component API requests.
import { apiFetch } from "@/api/client";
import type {
  AssembleBikeComponent,
  BikeComponent,
  ComponentGroup,
  CreateBikeComponentInput,
  DeleteBikeComponentInput,
  DismountBikeComponentInput,
  UpdateBikeComponentInput,
} from "./components.types";

// Get component groups.
export async function getComponentGroups(): Promise<ComponentGroup[]> {
  return apiFetch<ComponentGroup[]>("/components/groups");
}

// Get default components for the bike type.
export async function getDefaultComponents(ebike: boolean): Promise<AssembleBikeComponent[]> {
  const query = new URLSearchParams({ ebike: String(ebike) });
  return apiFetch<AssembleBikeComponent[]>(`/components/default-components?${query.toString()}`);
}

// The build of one bike: what is on it now and what has come off it.
export async function getBikeComponents(bikeId: number): Promise<BikeComponent[]> {
  const query = new URLSearchParams({ bikeId: String(bikeId) });
  return apiFetch<BikeComponent[]>(`/components/mounted-components?${query.toString()}`);
}

// Add a part to a bike that already exists.
export async function createBikeComponent(input: CreateBikeComponentInput): Promise<BikeComponent> {
  return apiFetch<BikeComponent>("/components/mounted-components", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Correct a part. Wear and mounted date are refused by the server once a Service has
// touched it, so the form omits them for a hardened part.
export async function updateBikeComponent({ id, fields }: UpdateBikeComponentInput): Promise<BikeComponent> {
  return apiFetch<BikeComponent>(`/components/mounted-components/${String(id)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

// Take a part off the bike, keeping everything it did.
export async function dismountBikeComponent({ id, removed_at }: DismountBikeComponentInput): Promise<BikeComponent> {
  return apiFetch<BikeComponent>(`/components/mounted-components/${String(id)}/dismount`, {
    method: "PATCH",
    body: JSON.stringify({ removed_at }),
  });
}

// Take back a row that should never have existed.
export async function deleteBikeComponent({ id }: DeleteBikeComponentInput): Promise<BikeComponent> {
  return apiFetch<BikeComponent>(`/components/mounted-components/${String(id)}`, { method: "DELETE" });
}
