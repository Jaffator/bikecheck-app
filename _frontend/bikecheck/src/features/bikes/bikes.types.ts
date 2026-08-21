import type { components } from "@/api/schema";

// Mirror backend bike responses with JSON date strings.
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

// Keep multipart photo data separate from the create DTO.
export interface CreateBikeInput {
  bike: CreateBikePayload;
  components: CreateMountedComponentPayload[];
  image: File | null;
}

// Model client-known fields missing from the raw multipart schema.
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

// Reuse the component-domain DTO until generated schema catches up.
export type { AssembleBikeComponent as ExternalBikeComponent } from "../components/components.types";
