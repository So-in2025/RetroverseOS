import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  isFounder: boolean;
  inviteCode: string;
  invitesRemaining: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, code: string) => boolean;
  logout: () => void;
}

// Authorized Beta Access Keys (Invite Codes)
const BETA_ACCESS_KEYS = [
  'FOUNDER-001', 'FOUNDER-002', 'RETRO-2026', 'ADMIN-KEY', 'DOMINION-2026'
];

const MAX_FOUNDERS = 25;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (username, code) => {
        // 1. Check if it's a valid invite code
        const isValidInvite = BETA_ACCESS_KEYS.includes(code);
        
        // 2. Check if user is within the first 25 (Founders)
        // In a real app, this would be a server-side check.
        // Here we simulate it using a local counter for demonstration.
        const founderCount = parseInt(localStorage.getItem('dominion_founder_count') || '0');
        const isWithinFounderLimit = founderCount < MAX_FOUNDERS;

        if (isValidInvite || isWithinFounderLimit) {
          // If they didn't have a code but were within limit, they become a founder
          if (!isValidInvite && isWithinFounderLimit) {
            localStorage.setItem('dominion_founder_count', (founderCount + 1).toString());
          }

          set({
            isAuthenticated: true,
            user: {
              id: 'user-' + Math.random().toString(36).substr(2, 9),
              username,
              isFounder: isValidInvite ? code.startsWith('FOUNDER') : isWithinFounderLimit,
              inviteCode: 'INV-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
              invitesRemaining: 3
            }
          });
          return true;
        }
        return false;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'retro-auth-storage',
    }
  )
);
