import { GameObject } from './metadataNormalization';
import { storage } from './storage';

class RomPreloaderService {
  private queue: GameObject[] = [];
  private isProcessing = false;
  private MAX_CONCURRENT = 2;
  private PRELOAD_SIZE = 1024 * 1024; // 1MB

  public async addToQueue(games: GameObject[]) {
    // Limit to 20 games per call to avoid massive background downloads
    const targetGames = games.slice(0, 20);
    
    // Filter out games already in queue or storage
    const filtered = [];
    for (const game of targetGames) {
      // Avoid duplicates in queue
      if (this.queue.some(q => q.game_id === game.game_id)) continue;
      
      const isFull = await storage.isRomCached(game.game_id);
      const isPartial = await storage.isPartialRomCached(game.game_id);
      if (!isFull && !isPartial) {
        filtered.push(game);
      }
    }

    // Keep only the most recent 40 games in queue to avoid memory/network bloat
    this.queue = [...this.queue, ...filtered].slice(-40);
    
    // Start with a small delay to ensure the user has stopped scrolling
    this.startProcessing();
  }

  private async startProcessing() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    // Wait 3 seconds before starting to ensure the user is actually looking at these games
    await new Promise(resolve => setTimeout(resolve, 3000));

    while (this.queue.length > 0) {
      const game = this.queue.shift();
      if (game) {
        await this.preload(game);
        // Pause between preloads to be polite to the network and Archive.org
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.isProcessing = false;
  }

  private async preload(game: GameObject) {
    try {
      console.debug(`[Preloader] Pre-caching 1MB for: ${game.title}`);
      
      // Usar el proxy para soportar Range
      const proxyUrl = `/api/rom?url=${encodeURIComponent(game.rom_url)}`;
      
      const response = await fetch(proxyUrl, {
        headers: {
          'Range': `bytes=0-${this.PRELOAD_SIZE - 1}`
        }
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      await storage.savePartialRom(game.game_id, blob);
      
      console.debug(`[Preloader] Success: ${game.title}`);
    } catch (error) {
      console.warn(`[Preloader] Failed to preload ${game.title}:`, error);
    }
  }
}

export const romPreloader = new RomPreloaderService();
