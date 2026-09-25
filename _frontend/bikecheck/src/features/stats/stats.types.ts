// Home's charts, as the API serves them. An Archived Bike is in none of them (ADR 0024).

export interface SpendCategory {
  // "group:<id>", "other" (outside the top three) or "unassigned" (no category).
  key: string;
  component_group_id: number | null;
  group_name: string | null;
  i18n_key: string | null;
  amount: number;
}

export interface SpendSegment {
  key: string;
  amount: number;
}

export interface SpendBike {
  bike_id: number;
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
  total: number;
  // Same keys and order as the categories.
  segments: SpendSegment[];
}

export interface Spend {
  year: number;
  currency: string | null;
  total: number;
  categories: SpendCategory[];
  bikes: SpendBike[];
}
