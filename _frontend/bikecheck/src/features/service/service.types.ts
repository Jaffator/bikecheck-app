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

// ------------------------------------------------------------------
// The wizard's catalogue: what the bike can receive
// ------------------------------------------------------------------

// One tile on the wizard's category step.
export interface BikeCategory {
  group_id: number;
  group_name: string;
  group_i18n_key: string | null;
  side_choice: boolean;
  // Active Mounted Components the bike carries in this category; never zero.
  component_count: number;
}

// What an Action covers. Describes the Action itself, so it is never recorded per
// service — see ADR 0004. A user can add tags of their own to an action; those carry no
// key, and only those may be deleted — see ADR 0008.
export interface ActionTag {
  id: number;
  tag: string;
  i18n_key: string | null;
  custom: boolean;
}

// What creating one of the caller's own tags needs.
export interface CreateActionTagInput {
  event_action_id: number;
  tag: string;
}

// One part on the bike. The wear fields are filled only when it is read back from a
// recorded service, where they are the baselines frozen at the time.
export interface MountedComponent {
  id: number;
  // What a Replacement needs to create the part going on in its place.
  component_type_id: number;
  component_desc: string | null;
  position: string | null;
  component_type: string;
  component_type_i18n_key: string | null;
  km_at_time: number | null;
  time_min_at_time: number | null;
  drivetrain_km_at_time: number | null;
  suspension_min_at_time: number | null;
}

// One Action the bike can receive, with the parts it would be performed on.
export interface CatalogueAction {
  id: number;
  action_name: string;
  action_i18n_key: string | null;
  replace_action: boolean;
  tags: ActionTag[];
  components: MountedComponent[];
}

// The Actions available in one Component Category on one bike.
export interface CategoryActions {
  group_id: number;
  group_name: string;
  group_i18n_key: string | null;
  side_choice: boolean;
  actions: CatalogueAction[];
}

// ------------------------------------------------------------------
// One recorded Service, in full
// ------------------------------------------------------------------

export interface ServiceActionDone {
  // The recorded row, which is what an edit addresses — not the catalogue action.
  action_done_id: number;
  action_id: number;
  action_name: string;
  action_i18n_key: string | null;
  // Null when no price was recorded; the detail reads that as work that carried no
  // charge.
  partial_cost: number | null;
  replace_action: boolean;
  note: string | null;
  tags: ActionTag[];
  mounted_components: MountedComponent[];
}

export interface ServiceAttachment {
  id: number;
  name?: string;
  url?: string;
  content_type?: string;
}

export interface ServiceRecord {
  id: number;
  bike_id: number;
  bike_name: string | null;
  // The bike's odometer as it stood on the service date; null when nothing was recorded.
  bike_km_at_time: number | null;
  bike_minutes_at_time: number | null;
  note?: string | null;
  total_cost: number;
  service_date: string | null;
  created_at: string;
  updated_at?: string | null;
  actions_done: ServiceActionDone[];
  attachments?: ServiceAttachment[];
}

// ------------------------------------------------------------------
// Saving a Service
// ------------------------------------------------------------------

// An attachment already stored; the wizard holds these until the Service is saved.
export interface UploadedAttachment {
  name: string;
  url: string;
  content_type: string;
}

export interface ServiceActionInput {
  action_id: number;
  description?: string;
  partial_cost?: number;
  part_replaced: boolean;
  mounted_components_involved: number[];
}

// A Replacement ends one Mounted Component and begins another — see ADR 0003.
export interface ServiceReplacementInput {
  old_component_mounted_id: number;
  component_type_id: number;
  new_component_desc: string;
  partial_cost?: number;
  note?: string;
  action_id: number;
}

export interface CreateServiceInput {
  bike_id: number;
  total_cost?: number;
  // When the work happened; omitted means it happened now.
  service_date?: string;
  note?: string;
  attachment?: UploadedAttachment[];
  actions_done: ServiceActionInput[];
  actions_replaced?: ServiceReplacementInput[];
}
