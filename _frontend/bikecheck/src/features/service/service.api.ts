// Service API calls use the shared client.
import { apiFetch } from "@/api/client";
import type {
  ActionTag,
  HistoryTotals,
  ServicePeriod,
  BikeCategory,
  CategoryActions,
  CreateActionTagInput,
  CreateServiceInput,
  ServiceRecord,
  ServiceHistoryPage,
  UploadedAttachment,
} from "./service.types";

// Gets one page of the caller's services, newest work first. Omitting the bike asks
// across every bike they own.
export async function getServiceHistory(
  limit: number,
  offset: number,
  bikeId?: number,
  period: ServicePeriod = { from: null, to: null },
): Promise<ServiceHistoryPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (bikeId !== undefined) {
    params.set("bikeId", String(bikeId));
  }
  appendPeriod(params, period);
  return apiFetch<ServiceHistoryPage>(`/bike-events/history?${params.toString()}`);
}

// The period as the API takes it: an absent end is an absent parameter.
function appendPeriod(params: URLSearchParams, period: ServicePeriod): void {
  if (period.from !== null) {
    params.set("from", period.from);
  }
  if (period.to !== null) {
    params.set("to", period.to);
  }
}

// GET /bike-events/history/totals — what the same filter the list runs on adds up to.
export async function getHistoryTotals(bikeId: number | undefined, period: ServicePeriod): Promise<HistoryTotals> {
  const params = new URLSearchParams();
  if (bikeId !== undefined) {
    params.set("bikeId", String(bikeId));
  }
  appendPeriod(params, period);
  const query = params.toString();
  return apiFetch<HistoryTotals>(`/bike-events/history/totals${query === "" ? "" : `?${query}`}`);
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

// POST /bike-events/action-tags — adds a tag of the caller's own to a catalogue action.
// Answers with the existing tag when the action already carries that name.
export async function createActionTag(input: CreateActionTagInput): Promise<ActionTag> {
  return apiFetch<ActionTag>("/bike-events/action-tags", { method: "POST", body: JSON.stringify(input) });
}

// DELETE /bike-events/action-tags/:id — drops one of the caller's own tags. Seeded tags
// are not theirs to remove.
export async function deleteActionTag(id: number): Promise<ActionTag> {
  return apiFetch<ActionTag>(`/bike-events/action-tags/${id}`, { method: "DELETE" });
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
