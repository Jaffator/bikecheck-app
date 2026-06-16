export interface SeedInterval {
  health_index_interval?: number;
  service_interval_km?: number;
  service_interval_min?: number;
  category: string[];
}

export interface SeedAction {
  action: string;
  targets: string[];
  tags: string[] | null;
  replace: boolean;
  reset_interval: boolean;
  intervals?: SeedInterval[];
}

export interface SeedBikeModel {
  brand: string;
  models: string[];
}

export interface SeedActions {
  Brakes: SeedAction[];
  Drivetrain: SeedAction[];
  Suspension: SeedAction[];
  Wheels: SeedAction[];
  Cockpit: SeedAction[];
  'Saddle & Seatpost': SeedAction[];
  Frame: SeedAction[];
  'E-bike': SeedAction[];
  Other: SeedAction[];
}

export interface SeedData {
  bike_sizes: string[];
  wheel_sizes: string[];
  bike_types: string[];
  ride_styles: string[];
  bike_models: SeedBikeModel[];
  bike_brands: string[];
  actions: SeedActions;
}
