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
  wheel_size_id: number | null;
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
