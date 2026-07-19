export interface ActivityActor {
  id: number;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface Activity {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  summary: string;
  context: Record<string, unknown> | null;
  actor: ActivityActor | null;
  created_at: string;
}
