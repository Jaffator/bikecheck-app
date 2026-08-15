// Mirrors the backend Response_ComponentGroupDto
// (component/dto/response-components.ts).
export interface ComponentGroup {
  id: number;
  group_name: string;
  i18n_key: string | null;
  side_choice: boolean;
}

// Mirrors the backend CreateMountedComponentsDto — the mounted-component record
// the wizard assembles before the bike exists, so bike_id is still a placeholder.
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

// Mirrors the backend AssembleBikeComponentsDto. The generated schema.d.ts is
// still missing component_group_id — re-run `npm run gen:api` once the backend
// snapshot is refreshed, then this can move to components["schemas"].
export interface AssembleBikeComponent {
  component: MountedComponentDraft;
  component_name: string;
  component_group_id: number;
  component_i18n_key: string | null;
  // The part sits on a side of the bike, so the form offers front / rear.
  has_position: boolean;
  // Every bike carries it, so it is saved even when the user leaves the
  // description blank — wear tracking starts before the part has a name.
  essential: boolean;
}
