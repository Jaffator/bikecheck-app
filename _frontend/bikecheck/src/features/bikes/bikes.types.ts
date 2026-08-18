import type { components } from "@/api/schema";

// Mirrors the backend ResponseBikeDto (bike/dto/response-bike.dto.ts).
// Dates arrive as ISO strings over JSON, so they are typed as string here.
export interface Bike {
  id: number;
  user_id: number;
  ebike: boolean;
  organization_id: number | null;
  bike_brand: string;
  bike_model: string | null;
  image_url: string | null;
  bike_type_id: number | null;
  bikename: string | null;
  year: number | null;
  description: string | null;
  wheel_size: string | null;
  bike_size: string | null;
  total_km: number | null;
  total_time_min: number | null;
  has_front_suspension: boolean;
  has_rear_suspension: boolean;
  created_at: string | null;
  updated_at: string | null;
  frame_material: string | null;
  is_deleted: boolean | null;
  deleted_at: string | null;
  strava_gear_id: string | null;
  strava_name: string | null;
}

// What the wizard sends to POST /bike/create. The photo is kept apart from the
// DTO because it travels as a multipart file, not as JSON.
export interface CreateBikeInput {
  bike: CreateBikePayload;
  components: CreateMountedComponentPayload[];
  image: File | null;
}

// Both payloads drop a field the client cannot know: user_id comes from the auth
// token, bike_id exists only once the bike row is written.
// CreateBikeDto is spelled out because the generated schema does not carry it:
// the create body is declared as a raw multipart schema, so nothing references
// the DTO. Re-derive this from the schema if that ever changes.
export interface CreateBikePayload {
  bike_brand: string;
  ebike: boolean;
  has_front_suspension: boolean;
  has_rear_suspension: boolean;
  bike_model?: string;
  organization_id?: number;
  bikename?: string;
  year?: number;
  description?: string;
  wheel_size?: string;
  bike_size?: string;
  // The type is sent by name; the backend resolves it to bike_type_id.
  bike_type?: string;
  total_km?: number;
  image_url?: string;
}

export type CreateMountedComponentPayload = Omit<components["schemas"]["CreateMountedComponentsDto"], "bike_id">;

// Generated from the backend DTOs — run `npm run gen:api` after changing them.
export type BikeFormOptions = components["schemas"]["NewBikeFormDataDto"];
export type BikeBrand = components["schemas"]["BikeBrands"];
export type BikeModel = components["schemas"]["BikeModels"];
export type BikeSearchResult = components["schemas"]["SearchBikeExternalResponseDto"];

// The scraper answers with the same DTO the component domain owns, so the type
// lives there. The generated schema.d.ts is still one revision behind on it.
export type { AssembleBikeComponent as ExternalBikeComponent } from "../components/components.types";
