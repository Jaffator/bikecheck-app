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
  // A category's catch-all Replacement, kept for owner-created Component Types alone
  // (ADR 0022). It carries no targets, so its category is stored on the Action itself.
  catch_all?: boolean;
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
  bike_types: string[];
  bike_models: SeedBikeModel[];
  bike_brands: string[];
  actions: SeedActions;
}
