import { useState, useEffect, useCallback, useRef } from 'react';
import { matchmakingService } from './matchmakingService';
import { useAuth } from '../services/AuthContext';
import { gameCatalog } from '../services/gameCatalog';
import { MATCHMAKING_CONFIG } from './competitiveConfig';

export function useMatchmaking() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'timeout' | 'error'>('idle');
  const [foundMatch, setFoundMatch] = useState<{room: any, opponentId: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cancelSearch = useCallback(async () => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current);
      searchIntervalRef.current = null;
    }
    if (user) {
      await matchmakingService.removeFromQueue(user.id);
    }
    setStatus('idle');
    setFoundMatch(null);
    setError(null);
  }, [user]);

  const startSearch = useCallback(async (gameId: string, currentMmr: number) => {
    if (!user) return;
    
    // Cleanup any previous search
    await cancelSearch();

    setStatus('searching');
    setError(null);
    setFoundMatch(null);

    const game = await gameCatalog.getGame(gameId);
    if (!game) {
      setError('Game not found');
      setStatus('error');
      return;
    }

    // 1. Join the matchmaking queue
    const joined = await matchmakingService.addToQueue(user.id, gameId, currentMmr);
    if (!joined) {
      setError('Failed to join matchmaking queue');
      setStatus('error');
      return;
    }

    const startTime = Date.now();

    // 2. Start polling
    searchIntervalRef.current = setInterval(async () => {
      const elapsedTime = Date.now() - startTime;
      
      // Check for timeout
      if (elapsedTime > MATCHMAKING_CONFIG.TIMEOUT_MS) {
        await cancelSearch();
        setStatus('timeout');
        return;
      }

      try {
        const match = await matchmakingService.pollMatchmakingQueue(
          user.id, 
          gameId, 
          currentMmr, 
          elapsedTime, 
          user, 
          game
        );

        if (match) {
          if (searchIntervalRef.current) {
            clearInterval(searchIntervalRef.current);
            searchIntervalRef.current = null;
          }
          setFoundMatch(match);
          setStatus('found');
        }
      } catch (err) {
        console.error("Error polling matchmaking queue:", err);
      }
    }, MATCHMAKING_CONFIG.SEARCH_INTERVAL_MS);

  }, [user, cancelSearch]);

  // Cleanup on unmount and window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && status === 'searching') {
        // Use sendBeacon or synchronous fetch if possible, but standard async might not complete.
        // matchmakingService.removeFromQueue(user.id) is async.
        // We'll just call it and hope it fires, or let the server handle stale entries.
        matchmakingService.removeFromQueue(user.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
        if (user) {
          matchmakingService.removeFromQueue(user.id);
        }
      }
    };
  }, [user, status]);

  return { status, foundMatch, error, startSearch, cancelSearch };
}
