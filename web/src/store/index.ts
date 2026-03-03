import { create } from 'zustand';
import type { AppConfig } from '../lib/api';

interface AppState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  config: AppConfig | null;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setConfig: (config: AppConfig) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  sidebarOpen: true,
  config: null,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setConfig: (config) => set({ config }),
}));
