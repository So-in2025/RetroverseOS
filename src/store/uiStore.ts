import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  socialPanelOpen: boolean;
  searchModalOpen: boolean;
  toggleSocialPanel: () => void;
  setSocialPanel: (open: boolean) => void;
  setSearchModal: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      socialPanelOpen: true,
      searchModalOpen: false,
      toggleSocialPanel: () => set((state) => ({ socialPanelOpen: !state.socialPanelOpen })),
      setSocialPanel: (open) => set({ socialPanelOpen: open }),
      setSearchModal: (open) => set({ searchModalOpen: open }),
    }),
    {
      name: 'dominion-ui-storage',
    }
  )
);
