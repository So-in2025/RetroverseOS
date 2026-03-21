import { ROMCandidate } from './AgenticROMDiscovery';

const CACHE_KEY = 'rom_discovery_cache';

export class DiscoveryCache {
  static async get(gameId: string, system: string): Promise<ROMCandidate | null> {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return cache[`${system}:${gameId}`] || null;
  }

  static async set(gameId: string, system: string, candidate: ROMCandidate): Promise<void> {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[`${system}:${gameId}`] = candidate;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }
}
