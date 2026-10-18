export interface FolderRecord {
  id: string;
  domain: string;
  display_name: string;
  icon_url: string | null;
  color: string;
  is_pinned: number; // 0 or 1
  created_at: number;
  updated_at: number;
  link_count?: number;
}

export interface LinkRecord {
  id: string;
  folder_id: string;
  original_url: string;
  clean_url: string;
  title: string;
  description: string;
  image_url: string | null;
  favicon_url: string | null;
  is_favorite: number; // 0 or 1
  is_read: number; // 0 or 1
  notes: string | null;
  tags: string; // JSON string array
  created_at: number;
  updated_at: number;
  folder_domain?: string;
  folder_display_name?: string;
  folder_color?: string;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  icon_url TEXT,
  color TEXT NOT NULL,
  is_pinned INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  clean_url TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  favicon_url TEXT,
  is_favorite INTEGER DEFAULT 0,
  is_read INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_links_folder_id ON links(folder_id);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_is_favorite ON links(is_favorite);
CREATE INDEX IF NOT EXISTS idx_folders_is_pinned ON folders(is_pinned DESC);
`;
