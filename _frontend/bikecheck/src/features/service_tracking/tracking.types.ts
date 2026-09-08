// Service Tracking, as the API serves it. Nothing here is stored on the server either —
// every figure is derived from the part's wear, its Wear Baseline and the bike's Service
// Interval at the moment of the read.

// How much attention one Tracked Action is asking for: good below 80%, warning 80–94,
// critical 95–99, overdue at 100 and above.
export type AttentionLevel = "good" | "warning" | "critical" | "overdue";

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
  component_type: string;
  component_type_i18n_key: string | null;
  component_desc: string | null;
  position: string | null;
  event_action_id: number;
  action_name: string;
  action_i18n_key: string | null;
  axis: WearAxis;
  measure: WearMeasure;
  // Wear on that axis since the Wear Baseline, and the interval it is measured against —
  // the two numbers behind the percentage, so it can be checked rather than trusted.
  current: number;
  interval: number;
  // Whole percent of the way to being due. Never capped: a neglected chain reads 132.
  percentage: number;
  level: AttentionLevel;
  // The action has been put off, which lengthened the interval above.
  extended: boolean;
}

// The same reading on the dashboard, where the list is flat across the whole garage and a
// row has to name the bike it belongs to. The pieces of the name rather than the name, so
// bikeTitle stays the one place a bike is written out.
export interface GarageTrackedAction extends TrackedAction {
  bike_brand: string;
  bike_model: string | null;
  year: number | null;
}

// What putting one Tracked Action off asks for: the part and the job, which is what
// identifies one. What the Extension is worth is the server's rule — there is no number
// to enter and no dialog to enter it in.
export interface PostponeTrackedActionInput {
  component_mounted_id: number;
  event_action_id: number;
}
