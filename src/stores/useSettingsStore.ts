import { create } from 'zustand';

export type ShareMode = 'silent' | 'interactive';

export interface SettingsState {
  openInAppBrowser: boolean;
  autoDetectClipboard: boolean;
  selectedAccent: string;
  shareMode: ShareMode; // 'silent': background instant save & close, 'interactive': open preview modal
  setOpenInAppBrowser: (val: boolean) => void;
  setAutoDetectClipboard: (val: boolean) => void;
  setSelectedAccent: (color: string) => void;
  setShareMode: (mode: ShareMode) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openInAppBrowser: true, // Default: fast in-app custom tabs
  autoDetectClipboard: true, // Default: detect URL in clipboard when app focused
  selectedAccent: '#3b82f6', // Default Ocean Blue
  shareMode: 'silent', // Default: instant silent auto-save

  setOpenInAppBrowser: (val) => set({ openInAppBrowser: val }),
  setAutoDetectClipboard: (val) => set({ autoDetectClipboard: val }),
  setSelectedAccent: (color) => set({ selectedAccent: color }),
  setShareMode: (mode) => set({ shareMode: mode }),
}));
