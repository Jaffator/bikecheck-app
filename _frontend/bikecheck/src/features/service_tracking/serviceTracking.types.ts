// Which of four bands a Tracked Action's percentage falls in. The badge and the meters
// read the same four values as a HealthLevel, which is what they have always called them.
export type AttentionLevel = "good" | "warning" | "critical" | "overdue";

// Which reading a Tracked Action is measured on — whichever the bike's Service Interval
// fills in.
export type TrackedAxis = "km" | "min" | "health_index";

// One mounted component paired with one action the bike keeps a Service Interval for. Every
// figure on it is derived by the API on read, so nothing here is cached longer than the
// query that fetched it.
export interface TrackedAction {
  bike_id: number;
  component_mounted_id: number;
  component_type_id: number;
  component_type: string;
  component_type_i18n_key: string | null;
  component_desc: string | null;
  position: string | null;
  action_id: number;
  action_name: string;
  action_i18n_key: string | null;
  axis: TrackedAxis;
  // Wear on that axis since the pair was last serviced.
  current_value: number;
  // The Service Interval on that axis, with any Extension already added.
  interval_value: number;
  // Never capped: an overdue part reads past 100.
  percentage: number;
  attention_level: AttentionLevel;
}
