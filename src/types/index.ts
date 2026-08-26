export interface Link {
  id: number;
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  og_image: string | null;
  created_at: number;
  is_read: number; // 0 | 1
  is_favorite: number; // 0 | 1
  tags: string | null; // JSON array string
}

export interface Domain {
  domain: string;
  count: number;
  favicon: string | null;
  last_added: number;
  unread_count: number;
}

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  favicon: string | null;
  og_image: string | null;
}

export type SortOption = 'newest' | 'oldest' | 'title' | 'domain';
export type FilterOption = 'all' | 'unread' | 'favorites';
