// Service API calls use the shared client.
import { apiFetch } from "@/api/client";
import type { ServiceHistoryPage } from "./service.types";

// Gets one page of the caller's services, newest work first. Omitting the bike asks
// across every bike they own.
export async function getServiceHistory(limit: number, offset: number, bikeId?: number): Promise<ServiceHistoryPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (bikeId !== undefined) {
    params.set("bikeId", String(bikeId));
  }
  return apiFetch<ServiceHistoryPage>(`/bike-events/history?${params.toString()}`);
}
