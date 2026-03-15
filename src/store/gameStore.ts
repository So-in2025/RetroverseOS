import { create } from 'zustand';

interface GameSession {
  id: string;
  gameId: string;
  players: string[];
  status: 'waiting' | 'playing' | 'finished';
}

interface SentinelStats {
  testedToday: number;
  successful: number;
  repairs: number;
}

interface GameState {
  currentSession: GameSession | null;
  setSession: (session: GameSession | null) => void;
  sentinelStats: SentinelStats;
  updateSentinelStats: (stats: Partial<SentinelStats>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentSession: null,
  setSession: (session) => set({ currentSession: session }),
  sentinelStats: {
    testedToday: 0,
    successful: 0,
    repairs: 0
  },
  updateSentinelStats: (stats) => set((state) => ({
    sentinelStats: { ...state.sentinelStats, ...stats }
  })),
}));
