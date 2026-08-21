// Backend component group response.
export interface ComponentGroup {
  id: number;
  group_name: string;
  i18n_key: string | null;
  side_choice: boolean;
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
