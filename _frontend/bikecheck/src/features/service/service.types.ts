// Mirrors the backend service history DTOs.

// One Service as a history card needs it — the full occasion comes from the detail endpoint.
export interface ServiceHistoryItem {
  id: number;
  bike_id: number;
  // Falls back to brand and model when the bike has no nickname; null when it is gone.
  bike_name: string | null;
  // When the work happened, which may predate when it was recorded.
  service_date: string | null;
  action_count: number;
  action_names: string[];
  total_cost: number | null;
}

export interface ServiceHistoryPage {
  items: ServiceHistoryItem[];
  // Services matching the filter, ignoring limit and offset.
  total: number;
}
