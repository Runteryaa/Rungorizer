import { create } from 'zustand';
import {
  FolderRecord,
  LinkRecord,
  initDatabase,
  getFolders,
  getLinks,
  saveLinkFromMetadata,
  toggleFavorite as dbToggleFavorite,
  toggleRead as dbToggleRead,
  markLinkAsRead as dbMarkLinkAsRead,
  bulkDeleteLinks as dbBulkDeleteLinks,
  bulkSetRead as dbBulkSetRead,
  bulkSetFavorite as dbBulkSetFavorite,
  deleteLink as dbDeleteLink,
  updateLink as dbUpdateLink,
  updateFolder as dbUpdateFolder,
  deleteFolder as dbDeleteFolder,
  exportDatabaseBackup,
  importDatabaseBackup,
  repairIncompleteYouTubeLinks,
  BackupData,
} from '../db/database';
import { scrapeMetadata } from '../services/metadataScraper';
import { extractUrlFromText } from '../services/urlCleaner';

export interface ToastNotification {
  id: string;
  message: string;
  subMessage?: string;
  type: 'success' | 'info' | 'error';
}

interface LinksState {
  folders: FolderRecord[];
  links: LinkRecord[];
  isLoading: boolean;
  isSaving: boolean;
  searchQuery: string;
  selectedTag: string | null;
  activeFilter: 'all' | 'unread' | 'favorites';
  notification: ToastNotification | null;

  // Actions
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  addLink: (rawText: string, notes?: string, tags?: string[]) => Promise<{ success: boolean; isExisting?: boolean }>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleRead: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkSetRead: (ids: string[], isRead: boolean) => Promise<void>;
  bulkSetFavorite: (ids: string[], isFavorite: boolean) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  updateLink: (
    id: string,
    updates: {
      title?: string;
      description?: string;
      notes?: string;
      tags?: string[];
      folder_id?: string;
      image_url?: string;
    }
  ) => Promise<void>;
  updateFolder: (id: string, updates: Partial<Pick<FolderRecord, 'display_name' | 'color' | 'is_pinned'>>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setActiveFilter: (filter: 'all' | 'unread' | 'favorites') => void;
  showNotification: (msg: string, sub?: string, type?: 'success' | 'info' | 'error') => void;
  dismissNotification: () => void;
  exportBackup: () => Promise<BackupData>;
  importBackup: (data: BackupData) => Promise<{ foldersCount: number; linksCount: number }>;
}

export const useLinksStore = create<LinksState>((set, get) => ({
  folders: [],
  links: [],
  isLoading: true,
  isSaving: false,
  searchQuery: '',
  selectedTag: null,
  activeFilter: 'all',
  notification: null,

  initialize: async () => {
    try {
      set({ isLoading: true });
      await initDatabase();
      const [folders, links] = await Promise.all([
        getFolders(),
        getLinks(),
      ]);
      set({ folders, links, isLoading: false });

      // In the background, auto-repair any YouTube links saved previously with missing metadata
      repairIncompleteYouTubeLinks().then((count) => {
        if (count > 0) {
          get().refresh();
        }
      });
    } catch (error) {
      console.error('Veritabanı başlatma hatası:', error);
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    try {
      const [folders, links] = await Promise.all([
        getFolders(),
        getLinks(),
      ]);
      set({ folders, links });
    } catch (error) {
      console.error('Yenileme hatası:', error);
    }
  },

  addLink: async (rawText: string, notes?: string, tags?: string[]) => {
    const url = extractUrlFromText(rawText);
    if (!url) {
      get().showNotification('Geçerli bir web bağlantısı bulunamadı', undefined, 'error');
      return { success: false };
    }

    set({ isSaving: true });
    try {
      const meta = await scrapeMetadata(url);
      const { link, folder, isExisting } = await saveLinkFromMetadata(meta, notes, tags);

      // Refresh local store
      await get().refresh();

      if (isExisting) {
        get().showNotification(
          `Güncellendi: ${folder.display_name}`,
          link.title || url,
          'info'
        );
      } else {
        get().showNotification(
          `Kaydedildi: ${folder.display_name}`,
          link.title || url,
          'success'
        );
      }

      set({ isSaving: false });
      return { success: true, isExisting };
    } catch (error) {
      console.error('Link kaydetme hatası:', error);
      get().showNotification('Link kaydedilirken bir hata oluştu', undefined, 'error');
      set({ isSaving: false });
      return { success: false };
    }
  },

  toggleFavorite: async (id: string) => {
    // Optimistic update
    set((state) => ({
      links: state.links.map((l) =>
        l.id === id ? { ...l, is_favorite: l.is_favorite === 1 ? 0 : 1 } : l
      ),
    }));
    await dbToggleFavorite(id);
  },

  toggleRead: async (id: string) => {
    // Optimistic update
    set((state) => ({
      links: state.links.map((l) =>
        l.id === id ? { ...l, is_read: l.is_read === 1 ? 0 : 1 } : l
      ),
    }));
    await dbToggleRead(id);
  },

  markAsRead: async (id: string) => {
    // Check if already read to avoid unnecessary updates
    const current = get().links.find((l) => l.id === id);
    if (current && current.is_read === 1) return;

    set((state) => ({
      links: state.links.map((l) =>
        l.id === id ? { ...l, is_read: 1 } : l
      ),
    }));
    await dbMarkLinkAsRead(id);
  },

  bulkDelete: async (ids: string[]) => {
    if (ids.length === 0) return;
    set((state) => ({
      links: state.links.filter((l) => !ids.includes(l.id)),
    }));
    await dbBulkDeleteLinks(ids);
    await get().refresh();
    get().showNotification(`${ids.length} bağlantı silindi`, undefined, 'info');
  },

  bulkSetRead: async (ids: string[], isRead: boolean) => {
    if (ids.length === 0) return;
    set((state) => ({
      links: state.links.map((l) =>
        ids.includes(l.id) ? { ...l, is_read: isRead ? 1 : 0 } : l
      ),
    }));
    await dbBulkSetRead(ids, isRead);
    get().showNotification(
      isRead ? `${ids.length} bağlantı okundu yapıldı` : `${ids.length} bağlantı okunmadı yapıldı`,
      undefined,
      'success'
    );
  },

  bulkSetFavorite: async (ids: string[], isFavorite: boolean) => {
    if (ids.length === 0) return;
    set((state) => ({
      links: state.links.map((l) =>
        ids.includes(l.id) ? { ...l, is_favorite: isFavorite ? 1 : 0 } : l
      ),
    }));
    await dbBulkSetFavorite(ids, isFavorite);
    get().showNotification(
      isFavorite ? `${ids.length} bağlantı favorilere eklendi` : `${ids.length} bağlantı favorilerden çıkarıldı`,
      undefined,
      'success'
    );
  },

  deleteLink: async (id: string) => {
    await dbDeleteLink(id);
    await get().refresh();
    get().showNotification('Bağlantı silindi', undefined, 'info');
  },

  updateLink: async (id: string, updates) => {
    const safeTags = updates.tags ? updates.tags.slice(0, 5) : undefined;
    const dbPayload: Parameters<typeof dbUpdateLink>[1] = {
      title: updates.title,
      description: updates.description,
      notes: updates.notes !== undefined ? (updates.notes.trim() || null) : undefined,
      folder_id: updates.folder_id,
      image_url: updates.image_url,
      tags: safeTags ? JSON.stringify(safeTags) : undefined,
    };
    await dbUpdateLink(id, dbPayload);
    await get().refresh();
    get().showNotification('Bağlantı güncellendi', undefined, 'success');
  },

  updateFolder: async (id: string, updates) => {
    await dbUpdateFolder(id, updates);
    await get().refresh();
    get().showNotification('Klasör güncellendi', undefined, 'success');
  },

  deleteFolder: async (id: string) => {
    await dbDeleteFolder(id);
    await get().refresh();
    get().showNotification('Klasör ve içeriği silindi', undefined, 'info');
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedTag: (tag: string | null) => {
    set({ selectedTag: tag });
  },

  setActiveFilter: (filter: 'all' | 'unread' | 'favorites') => {
    set({ activeFilter: filter });
  },

  showNotification: (message: string, subMessage?: string, type: 'success' | 'info' | 'error' = 'success') => {
    set({
      notification: {
        id: Date.now().toString(),
        message,
        subMessage,
        type,
      },
    });
  },

  dismissNotification: () => {
    set({ notification: null });
  },

  exportBackup: async () => {
    return await exportDatabaseBackup();
  },

  importBackup: async (data: BackupData) => {
    const counts = await importDatabaseBackup(data);
    await get().refresh();
    get().showNotification(
      'Yedek Başarıyla İçe Aktarıldı',
      `${counts.foldersCount} klasör, ${counts.linksCount} link geri yüklendi`,
      'success'
    );
    return counts;
  },
}));
