export interface Permission {
  id: number;
  code: string;
  module: string;
  action: string;
  description: string | null;
}

export interface RoleSummary {
  id: number;
  name: string;
  slug: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  org_id: number;
  created_at: string;
  permissions: Permission[];
}
