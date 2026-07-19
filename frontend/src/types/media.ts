export interface Media {
  id: number;
  url: string;
  filename: string | null;
  content_type: string | null;
  size: number | null;
  sort_order: number;
}

export interface MediaInput {
  url: string;
  filename?: string | null;
  content_type?: string | null;
  size?: number | null;
  sort_order?: number;
}
