import { ROMCandidate } from './AgenticROMDiscovery';

const CACHE_KEY = 'rom_discovery_cache';

export class DiscoveryCache {
  static async get(gameId: string, system: string): Promise<ROMCandidate | null> {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const candidate = cache[`${system}:${gameId}`] || null;
    
    if (candidate && candidate.url) {
      const url = candidate.url.toLowerCase();
      // Filtrar URLs malformadas, colecciones ZIP o dominios caídos (Myrient)
      const isCollection = (url.endsWith('/nes.zip') || url.endsWith('/gb.zip') || url.endsWith('/gba.zip')) && !url.includes('nointro');
      const isMalformed = url.includes('f:/') || url.includes('c:/') || url.includes('d:/');
      const isMyrient = url.includes('myrient.erista.me');
      
      if (isCollection || isMalformed || isMyrient) {
        console.warn(`[Cache] Descartando URL inválida o dominio caído del caché para ${gameId}: ${candidate.url}`);
        delete cache[`${system}:${gameId}`];
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return null;
      }
    }
    
    return candidate;
  }

  static async set(gameId: string, system: string, candidate: ROMCandidate): Promise<void> {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[`${system}:${gameId}`] = candidate;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }

  static async clear(gameId: string, system: string): Promise<void> {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    delete cache[`${system}:${gameId}`];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }
}
