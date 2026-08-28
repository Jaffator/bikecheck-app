// Access bike endpoints through the shared authenticated API client.
import { apiFetch } from "@/api/client";
import type { Bike, BikeFormOptions, BikeSearchResult, CreateBikeInput, ExternalBikeComponent } from "./bikes.types";

// GET /bike — bikes of the current user.
export async function getBikes(): Promise<Bike[]> {
  return apiFetch<Bike[]>("/bike");
}

// GET /bike/:id — one bike by id.
export async function getBike(id: number): Promise<Bike> {
  return apiFetch<Bike>(`/bike/${id}`);
}

export async function getBikeFormOptions(): Promise<BikeFormOptions> {
  return apiFetch<BikeFormOptions>(`/bike/form-options`);
}

// GET /bike/external — scrapes bike specs from an external source.
export async function searchBikeExternal(bikeName: string, year: string): Promise<BikeSearchResult[]> {
  const query = new URLSearchParams({ bikeName, year });
  return apiFetch<BikeSearchResult[]>(`/bike/external?${query.toString()}`);
}

// GET /bike/external/family — scrapes the bikes filed under one collection.
export async function getExternalFamilyBikes(url: string): Promise<BikeSearchResult[]> {
  const query = new URLSearchParams({ url });
  return apiFetch<BikeSearchResult[]>(`/bike/external/family?${query.toString()}`);
}

// GET /bike/external/components — scrapes the component list of one bike.
export async function getExternalBikeComponents(bikeUrl: string): Promise<ExternalBikeComponent[]> {
  const query = new URLSearchParams({ bikeUrl });
  return apiFetch<ExternalBikeComponent[]>(`/bike/external/components?${query.toString()}`);
}

// Supply an extension when Capacitor images lack a filename.
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

function uploadFilename(image: File): string {
  if (/\.[a-z0-9]+$/i.test(image.name)) return image.name;
  return `bike${EXTENSION_BY_TYPE[image.type] ?? ".jpg"}`;
}

// Submit bike data and optional device photo as multipart form data.
export async function createBike(input: CreateBikeInput): Promise<Bike> {
  const form = new FormData();
  form.append("data", JSON.stringify({ bike: input.bike, components: input.components }));
  if (input.image) {
    form.append("image", input.image, uploadFilename(input.image));
  }

  return apiFetch<Bike>("/bike/create", { method: "POST", body: form });
}

// Soft-delete a bike while preserving ride and service history.
export async function deleteBike(id: number): Promise<Bike> {
  return apiFetch<Bike>(`/bike/delsoft/${id}`, { method: "DELETE" });
}
