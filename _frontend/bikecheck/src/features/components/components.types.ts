// Backend component group response.
export interface ComponentGroup {
  id: number;
  group_name: string;
  i18n_key: string | null;
  side_choice: boolean;
}

// A kind of part, as the catalogue holds it. Read back when an owner names one of their
// own, so the form can pick it the moment it exists.
export interface ComponentType {
  id: number;
  component_group_id: number;
  user_id: number | null;
  component_type: string;
  i18n_key: string | null;
  ebike: boolean;
  has_position: boolean;
}

// A part an owner names themselves. The side is not asked for — it follows the category's
// side_choice — and the type is never marked e-bike-only, which would hide it on the rest
// of their bikes.
export interface CreateComponentTypeInput {
  component_group_id: number;
  component_type: string;
  ebike: boolean;
  has_position: boolean;
}

// One of the owner's own catalogue entries, as the settings list reads it. The counts say
// what still leans on the type: removing it leaves every one of those parts alone (ADR 0021).
export interface CustomComponentType {
  id: number;
  component_type: string;
  component_group_id: number;
  component_group: string;
  component_group_i18n_key: string | null;
  parts_in_use: number;
  bikes_in_use: number;
}

export interface DeleteComponentTypeInput {
  id: number;
}

// Mounted component draft before bike creation.
export interface MountedComponentDraft {
  bike_id: number;
  component_type_id: number;
  component_desc?: string | null;
  position?: string;
  mounted_at?: string;
  total_km?: number;
  is_active?: boolean;
  note?: string | null;
  interval_id?: number;
}

// Backend bike component assembly response.
export interface AssembleBikeComponent {
  component: MountedComponentDraft;
  component_name: string;
  component_group_id: number;
  component_i18n_key: string | null;
  // Whether the component supports a position.
  has_position: boolean;
  // Whether the component is required.
  essential: boolean;
}

// One Mounted Component as the bike detail's components section reads it. Richer than the
// shape the service wizard asks for: that one names a target for work, this one describes
// the part. The two are deliberately not merged.
export interface BikeComponent {
  id: number;
  bike_id: number;
  component_type_id: number;
  component_type: string;
  component_type_i18n_key: string | null;
  component_group_id: number;
  component_group: string;
  component_group_i18n_key: string | null;
  // The category takes a front / rear choice.
  side_choice: boolean;
  component_desc: string | null;
  position: string | null;
  note: string | null;
  mounted_at: string | null;
  // The day the part came off. Null while it is still on the bike.
  removed_at: string | null;
  is_active: boolean | null;
  total_km: number | null;
  total_time_min: number | null;
  drivetrain_km: number | null;
  suspension_min: number | null;
  health_index: number | null;
  // The bike watches a wear index on this kind of part, so the reading is one to show.
  // Decided by the server from the bike's own service intervals, never re-derived here.
  tracks_health_index: boolean;
  last_service_at: string | null;
  // No Service has recorded work against the part, so its wear may still be corrected and
  // the row deleted. Decided by the server, never re-derived here — see ADR 0016.
  unserviced: boolean;
}

// What the add and edit forms write. Every field but the type may be left out: a part can
// be added in a moment and described later.
export interface BikeComponentFields {
  component_desc?: string | null;
  position?: string | null;
  mounted_at?: string | null;
  total_km?: number | null;
  total_time_min?: number | null;
}

export interface CreateBikeComponentInput extends BikeComponentFields {
  bike_id: number;
  component_type_id: number;
}

export interface UpdateBikeComponentInput {
  id: number;
  // Which build to refresh once the write lands; never sent to the server.
  bikeId: number;
  fields: BikeComponentFields;
}

export interface DismountBikeComponentInput {
  id: number;
  bikeId: number;
  // Defaults to today on the server when the owner does not say.
  removed_at?: string | null;
}

export interface DeleteBikeComponentInput {
  id: number;
  bikeId: number;
}

// The four things an owner can do to a part on the build, which travel together from the
// components section down to the part's own row (ADR 0018).
export interface PartActions {
  onReplace: (component: BikeComponent, actionId: number) => void;
  onEdit: (component: BikeComponent) => void;
  onDismount: (component: BikeComponent) => void;
  onDelete: (component: BikeComponent) => void;
}
