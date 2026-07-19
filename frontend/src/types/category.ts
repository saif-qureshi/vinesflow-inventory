export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

export interface CategorySummary {
  id: number;
  name: string;
}
