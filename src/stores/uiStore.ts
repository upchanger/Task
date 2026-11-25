import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  activeTaskId: string | null;
  searchQuery: string;
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setActiveTaskId: (taskId: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      mobileNavOpen: false,
      activeTaskId: null,
      searchQuery: '',
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      setActiveTaskId: (activeTaskId) => set({ activeTaskId }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: 'collabtask-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
