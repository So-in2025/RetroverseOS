import { GameObject } from './metadataNormalization';
import { storage } from './storage';

class RomPreloaderService {
  private queue: GameObject[] = [];
  private isProcessing = false;
  private MAX_CONCURRENT = 2;
  private PRELOAD_SIZE = 1024 * 1024; // 1MB

  public async addToQueue(games: GameObject[]) {
    // Solo pre-cachear si no están ya en cache (completa o parcial)
    const filtered = [];
    for (const game of games) {
      const isFull = await storage.isRomCached(game.game_id);
      const isPartial = await storage.isPartialRomCached(game.game_id);
      if (!isFull && !isPartial) {
        filtered.push(game);
      }
    }

    this.queue.push(...filtered);
    this.startProcessing();
  }

  private async startProcessing() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.MAX_CONCURRENT);
      await Promise.all(batch.map(game => this.preload(game)));
      
      // Pequeña pausa entre batches para no saturar
      await new Promise(resolve => setTimeout(resolve, 2000));
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
