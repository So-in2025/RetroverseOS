import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  socialPanelOpen: boolean;
  searchModalOpen: boolean;
  achievementsModalOpen: boolean;
  debugPanelOpen: boolean;
  reducedMotion: boolean;
  muteGlobal: boolean;
  toggleSocialPanel: () => void;
  setSocialPanel: (open: boolean) => void;
  setSearchModal: (open: boolean) => void;
  setAchievementsModal: (open: boolean) => void;
  setDebugPanel: (open: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setMuteGlobal: (muted: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      socialPanelOpen: true,
      searchModalOpen: false,
      achievementsModalOpen: false,
      debugPanelOpen: false,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      muteGlobal: false,
      toggleSocialPanel: () => set((state) => ({ socialPanelOpen: !state.socialPanelOpen })),
      setSocialPanel: (open) => set({ socialPanelOpen: open }),
      setSearchModal: (open) => set({ searchModalOpen: open }),
      setAchievementsModal: (open) => set({ achievementsModalOpen: open }),
      setDebugPanel: (open) => set({ debugPanelOpen: open }),
      setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
      setMuteGlobal: (muted) => set({ muteGlobal: muted }),
    }),
    {
      name: 'dominion-ui-storage',
    }
  )
);
