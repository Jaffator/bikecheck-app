// Service API calls use the shared client.
import { apiFetch } from "@/api/client";
import type {
  BikeCategory,
  CategoryActions,
  CreateServiceInput,
  ServiceRecord,
  ServiceHistoryPage,
  UploadedAttachment,
} from "./service.types";

// Gets one page of the caller's services, newest work first. Omitting the bike asks
// across every bike they own.
export async function getServiceHistory(limit: number, offset: number, bikeId?: number): Promise<ServiceHistoryPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (bikeId !== undefined) {
    params.set("bikeId", String(bikeId));
  }
  return apiFetch<ServiceHistoryPage>(`/bike-events/history?${params.toString()}`);
}

// GET /bike-events/categories — the Component Categories the bike has parts in.
export async function getBikeCategories(bikeId: number): Promise<BikeCategory[]> {
  return apiFetch<BikeCategory[]>(`/bike-events/categories?bikeId=${bikeId}`);
}

// GET /bike-events/group-actions — the work this bike can receive in one category.
// The endpoint still calls a Component Category a group.
export async function getCategoryActions(bikeId: number, categoryId: number): Promise<CategoryActions> {
  return apiFetch<CategoryActions>(`/bike-events/group-actions?bikeId=${bikeId}&groupId=${categoryId}`);
}

// GET /bike-events/:id — one Service in full.
export async function getServiceDetail(id: number): Promise<ServiceRecord> {
  return apiFetch<ServiceRecord>(`/bike-events/${id}`);
}

// POST /bike-events/create — records one Service with every block's Actions.
export async function createService(input: CreateServiceInput): Promise<ServiceRecord> {
  return apiFetch<ServiceRecord>("/bike-events/create", { method: "POST", body: JSON.stringify(input) });
}

// POST /bike-events/attachment — stores one receipt while the wizard is still open, so
// Save is not a long silent wait.
export async function uploadServiceAttachment(file: File): Promise<UploadedAttachment> {
  const form = new FormData();
  form.append("file", file, file.name);
  return apiFetch<UploadedAttachment>("/bike-events/attachment", { method: "POST", body: form });
}

// DELETE /bike-events/delsoft/:id — a Service entered by mistake leaves the history but
// stays on record. Answers with what it removed.
export async function deleteService(id: number): Promise<ServiceRecord> {
  return apiFetch<ServiceRecord>(`/bike-events/delsoft/${id}`, { method: "DELETE" });
}
