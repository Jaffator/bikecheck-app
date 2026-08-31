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
  // The type by name, which is what the form offers and sends back.
  bike_type: string | null;
  bikename: string | null;
  year: number | null;
  description: string | null;
  wheel_size: string | null;
  bike_size: string | null;
  total_km: number | null;
  total_time_min: number | null;
  // What the bike itself weighs. Never the rider's weight, which lives on the user.
  bike_weight_kg: number | null;
  // Accumulated from rides as they arrive, and not backfilled - a bike ridden before this
  // existed reads lower than it has actually climbed.
  total_elevation_m: number | null;
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
  frame_material?: string;
  // The type is sent by name; the backend resolves it to bike_type_id.
  bike_type?: string;
  total_km?: number;
  bike_weight_kg?: number;
  image_url?: string;
}

// What the edit form sends. Every field is optional - the form writes only what it holds,
// and the photo travels beside the JSON rather than inside it.
export interface UpdateBikeInput {
  id: number;
  bike: UpdateBikePayload;
  image: File | null;
}

export type UpdateBikePayload = Partial<Omit<CreateBikePayload, "ebike" | "has_front_suspension" | "has_rear_suspension">>;

export type CreateMountedComponentPayload = Omit<components["schemas"]["CreateMountedComponentsDto"], "bike_id">;

// Generated from the backend DTOs — run `npm run gen:api` after changing them.
export type BikeFormOptions = components["schemas"]["NewBikeFormDataDto"];
export type BikeBrand = components["schemas"]["BikeBrands"];
export type BikeModel = components["schemas"]["BikeModels"];
export type BikeSearchResult = components["schemas"]["SearchBikeExternalResponseDto"];

// Reuse the component-domain DTO until generated schema catches up.
export type { AssembleBikeComponent as ExternalBikeComponent } from "../components/components.types";
