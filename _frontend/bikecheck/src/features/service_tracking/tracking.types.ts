// Service Tracking, as the API serves it. Nothing here is stored on the server either —
// every figure is derived from the part's wear, its Wear Baseline and the bike's Service
// Interval at the moment of the read.

// How much attention one Tracked Action is asking for: very good below 60%, good 60–74,
// warning 75–89, critical 90–99, overdue at 100 and above. One step per stop of the colour
// ramp, so the word and the colour can never tell two different stories.
export type AttentionLevel = "very_good" | "good" | "warning" | "critical" | "overdue";

// Which measure the Service Interval behind a reading is expressed in.
export type WearAxis = "km" | "min" | "health_index";

// Which accumulator the reading was actually taken from — not implied by the axis, since a
// chain and a tyre are both measured in kilometres but only the chain's are the drivetrain's.
export type WearMeasure = "total_km" | "drivetrain_km" | "total_time_min" | "suspension_min" | "health_index";

// One mounted part paired with one action the bike keeps a Service Interval for, and how
// far the part has come towards that action being due.
export interface TrackedAction {
  bike_id: number;
  component_mounted_id: number;
  component_type_id: number;
  // The Component Category the part sits in — what a link into the service wizard names.
  component_group_id: number;
  component_type: string;
  component_type_i18n_key: string | null;
  component_desc: string | null;
  position: string | null;
  event_action_id: number;
  action_name: string;
  action_i18n_key: string | null;
  axis: WearAxis;
  measure: WearMeasure;
  // Wear on that axis since the Wear Baseline, and the Service Interval in force it is
  // measured against — the two numbers behind the percentage, so it can be checked rather
  // than trusted.
  current: number;
  interval: number;
  // Whole percent of the way to being due. Never capped: a neglected chain reads 132.
  percentage: number;
  level: AttentionLevel;
  // The bike's own plan on this axis, which Reset to default restores.
  default_interval: number;
  // The owner's own Service Interval, or null where the reading follows the bike's plan —
  // which is also what tells a custom interval from the app's.
  interval_override: number | null;
  // False silences this pairing's announcements and nothing else.
  notify: boolean;
  // When the part went on the bike, which the reading is judged against.
  mounted_at: string | null;
  // Recording this job replaces the part rather than servicing it, which names the button.
  replace_action: boolean;
}

// The same reading on the dashboard, where the list is flat across the whole garage and a
// row has to name the bike it belongs to. The pieces of the name rather than the name, so
// bikeTitle stays the one place a bike is written out.
export interface GarageTrackedAction extends TrackedAction {
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
}

// What setting an owner's own Service Interval asks for. Null clears it, which puts the
// bike's plan back — only the number is theirs, never the axis.
export interface SetTrackedActionIntervalInput {
  component_mounted_id: number;
  event_action_id: number;
  interval_override: number | null;
}

// What muting one Tracked Action asks for. False stops the push and nothing else.
export interface SetTrackedActionNotifyInput {
  component_mounted_id: number;
  event_action_id: number;
  notify: boolean;
}
