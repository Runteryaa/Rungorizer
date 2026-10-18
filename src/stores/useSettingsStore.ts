import { create } from 'zustand';

export interface SettingsState {
  openInAppBrowser: boolean;
  autoDetectClipboard: boolean;
  selectedAccent: string;
  setOpenInAppBrowser: (val: boolean) => void;
  setAutoDetectClipboard: (val: boolean) => void;
  setSelectedAccent: (color: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openInAppBrowser: true, // Default: fast in-app custom tabs
  autoDetectClipboard: true, // Default: detect URL in clipboard when app focused
  selectedAccent: '#3b82f6', // Default Ocean Blue

  setOpenInAppBrowser: (val) => set({ openInAppBrowser: val }),
  setAutoDetectClipboard: (val) => set({ autoDetectClipboard: val }),
  setSelectedAccent: (color) => set({ selectedAccent: color }),
}));
