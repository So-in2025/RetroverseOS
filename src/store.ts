import { create } from 'zustand';
import { Game, EmulatorState } from './types';

interface Store extends EmulatorState {
  setGame: (game: Game | null) => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export const useStore = create<Store>((set) => ({
  isPlaying: false,
  currentGame: null,
  volume: 0.5,
  isMuted: false,
  setGame: (game) => set({ currentGame: game }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));
