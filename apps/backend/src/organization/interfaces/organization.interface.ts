export interface OrgMemberWithRole {
  id: number;
  user_id: number;
  organization_id: number;
  role_type: string;
}

export interface CreateOrganizationData {
  name: string;
}

export interface UpdateOrganizationData {
  name?: string;
}

export interface AddMemberData {
  user_id: number;
  organization_id: number;
  role_type: 'owner' | 'admin' | 'member';
}
