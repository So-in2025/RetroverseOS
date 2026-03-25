export interface SaveState {
  id: string;
  gameId: string;
  timestamp: number;
  screenshot: string; // Base64 image
  stateData: Blob;
  type: 'auto' | 'manual';
}

export interface SramSave {
  gameId: string;
  timestamp: number;
  sramData: Blob;
}

export interface CachedRom {
  gameId: string;
  blob: Blob;
  size: number;
  lastAccessed: number;
}

export interface CachedRomMetadata {
  gameId: string;
  size: number;
  lastAccessed: number;
}

const DB_NAME = 'RetroverseDB';
const DB_VERSION = 6; // Incremented to add credits and achievements stores

// Stores requested by Critical Directive
const STORE_GAMES = 'games';
const STORE_ROMS = 'roms';
const STORE_SAVES = 'saves';
const STORE_BIOS = 'bios';
const STORE_SETTINGS = 'settings';
const STORE_CREDITS = 'credits';
const STORE_ACHIEVEMENTS = 'achievements';
const STORE_RECENT = 'recent_games';
const STORE_SRAM = 'sram_saves'; // Keeping this as it wasn't explicitly renamed but needed for functionality
const STORE_GCTS = 'gcts_results'; // Keeping this too
const STORE_STATS = 'game_stats';
const STORE_PARTIAL_ROMS = 'partial_roms'; // For "Play Instantly" pre-caching

export class StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;
  private static STORAGE_LIMIT = 3 * 1024 * 1024 * 1024; // 3GB
  private static PARTIAL_LIMIT = 500 * 1024 * 1024; // 500MB for partials

  constructor() {
    this.initPromise = this.initDB();
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.error('[Storage] IndexedDB initialization timed out');
        resolve(); 
      }, 5000);

      const request = indexedDB.open(DB_NAME, DB_VERSION + 1); // Increment version

      request.onerror = () => {
        clearTimeout(timeoutId);
        console.error('[Storage] Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        clearTimeout(timeoutId);
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // ... (existing stores) ...
        const stores = [
          { name: STORE_GAMES, key: 'game_id' },
          { name: STORE_ROMS, key: 'gameId', index: 'lastAccessed' },
          { name: STORE_SAVES, key: 'id', indices: ['gameId', 'timestamp'] },
          { name: STORE_BIOS, key: 'filename' },
          { name: STORE_SETTINGS, key: 'key' },
          { name: STORE_CREDITS, key: 'id' },
          { name: STORE_ACHIEVEMENTS, key: 'id' },
          { name: STORE_RECENT, key: 'gameId' },
          { name: STORE_STATS, key: 'gameId' },
          { name: STORE_SRAM, key: 'gameId' },
          { name: STORE_GCTS, key: 'gameId' },
          { name: STORE_PARTIAL_ROMS, key: 'gameId', index: 'timestamp' }
        ];

        stores.forEach(s => {
          if (!db.objectStoreNames.contains(s.name)) {
            const store = db.createObjectStore(s.name, { keyPath: s.key });
            if (s.index) store.createIndex(s.index, s.index, { unique: false });
            if (s.indices) {
              s.indices.forEach(idx => store.createIndex(idx, idx, { unique: false }));
            }
          }
        });
      };
    });
  }

  // --- Partial ROM Cache (Pre-caching) ---

  async savePartialRom(gameId: string, blob: Blob): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_PARTIAL_ROMS, 'readwrite');
      const store = transaction.objectStore(STORE_PARTIAL_ROMS);
      const request = store.put({ gameId, blob, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPartialRom(gameId: string): Promise<Blob | null> {
    await this.initPromise;
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_PARTIAL_ROMS, 'readonly');
      const store = transaction.objectStore(STORE_PARTIAL_ROMS);
      const request = store.get(gameId);
      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => reject(request.error);
    });
  }

  async isPartialRomCached(gameId: string): Promise<boolean> {
    await this.initPromise;
    if (!this.db) return false;
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_PARTIAL_ROMS, 'readonly');
      const store = transaction.objectStore(STORE_PARTIAL_ROMS);
      const request = store.count(gameId);
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  }

  async cacheBios(filename: string, blob: Blob): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_BIOS, 'readwrite');
      const store = transaction.objectStore(STORE_BIOS);
      const request = store.put({ filename, blob, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getBios(filename: string): Promise<Blob | null> {
    await this.initPromise;
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_BIOS, 'readonly');
      const store = transaction.objectStore(STORE_BIOS);
      const request = store.get(filename);

      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => reject(request.error);
    });
  }

  // --- ROM Cache ---

  async cacheRom(rom: CachedRom): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    
    // Check quota and enforce 3GB limit
    await this.enforceStorageLimit(rom.size);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_ROMS, 'readwrite');
      const store = transaction.objectStore(STORE_ROMS);
      const request = store.put(rom);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async enforceStorageLimit(newSize: number) {
    if (!this.db) return;
    const currentSize = await this.getTotalRomCacheSize();
    if (currentSize + newSize <= StorageService.STORAGE_LIMIT) return;

    console.log('[Storage] 3GB Limit reached. Evicting oldest games...');
    const roms = await this.getAllCachedRomsMetadata();
    roms.sort((a, b) => a.lastAccessed - b.lastAccessed);

    let freed = 0;
    const targetToFree = (currentSize + newSize) - StorageService.STORAGE_LIMIT;

    for (const rom of roms) {
      if (freed >= targetToFree) break;
      await this.deleteCachedRom(rom.gameId);
      freed += rom.size;
      console.log(`[Storage] Evicted ${rom.gameId} to maintain 3GB limit.`);
    }
  }

  async getCachedRom(gameId: string): Promise<CachedRom | undefined> {
    await this.initPromise;
    if (!this.db) return undefined;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_ROMS, 'readonly');
      const store = transaction.objectStore(STORE_ROMS);
      const request = store.get(gameId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async isRomCached(gameId: string): Promise<boolean> {
    await this.initPromise;
    if (!this.db) return false;
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_ROMS, 'readonly');
      const store = transaction.objectStore(STORE_ROMS);
      const request = store.count(gameId);
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  }

  async updateRomAccessTime(gameId: string): Promise<void> {
    if (!this.db) return;
    const rom = await this.getCachedRom(gameId);
    if (rom) {
      rom.lastAccessed = Date.now();
      await this.cacheRom(rom);
    }
  }

  async deleteCachedRom(gameId: string): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_ROMS, 'readwrite');
      const store = transaction.objectStore(STORE_ROMS);
      const request = store.delete(gameId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCachedRomsMetadata(): Promise<CachedRomMetadata[]> {
    await this.initPromise;
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_ROMS, 'readonly');
      const store = transaction.objectStore(STORE_ROMS);
      const request = store.getAll();

      request.onsuccess = () => {
        const roms = request.result as CachedRom[];
        resolve(roms.map(r => ({
          gameId: r.gameId,
          size: r.size,
          lastAccessed: r.lastAccessed
        })));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getTotalRomCacheSize(): Promise<number> {
    if (!this.db) return 0;
    const metadata = await this.getAllCachedRomsMetadata();
    return metadata.reduce((total, rom) => total + rom.size, 0);
  }

  // --- Save States ---

  async saveState(state: SaveState): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_SAVES, 'readwrite');
      const store = transaction.objectStore(STORE_SAVES);
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStates(gameId: string): Promise<SaveState[]> {
    await this.initPromise;
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_SAVES, 'readonly');
      const store = transaction.objectStore(STORE_SAVES);
      const index = store.index('gameId');
      const request = index.getAll(gameId);

      request.onsuccess = () => {
        // Sort by timestamp descending (newest first)
        const states = (request.result as SaveState[]).sort((a, b) => b.timestamp - a.timestamp);
        resolve(states);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteState(id: string): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_SAVES, 'readwrite');
      const store = transaction.objectStore(STORE_SAVES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Stats ---

  async incrementPlayCount(gameId: string): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_STATS, 'readwrite');
      const store = transaction.objectStore(STORE_STATS);
      const request = store.get(gameId);

      request.onsuccess = () => {
        const stats = request.result || { gameId, playCount: 0, lastPlayed: 0 };
        stats.playCount++;
        stats.lastPlayed = Date.now();
        store.put(stats);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllStats(): Promise<{ gameId: string, playCount: number, lastPlayed: number }[]> {
    await this.initPromise;
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_STATS, 'readonly');
      const store = transaction.objectStore(STORE_STATS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- SRAM (In-Game Saves) ---

  async saveSRAM(sram: SramSave): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_SRAM, 'readwrite');
      const store = transaction.objectStore(STORE_SRAM);
      const request = store.put(sram);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSRAM(gameId: string): Promise<SramSave | null> {
    await this.initPromise;
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_SRAM, 'readonly');
      const store = transaction.objectStore(STORE_SRAM);
      const request = store.get(gameId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Catalog (Games) ---

  async clearCatalog(): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_GAMES, STORE_SETTINGS], 'readwrite');
      const gameStore = transaction.objectStore(STORE_GAMES);
      gameStore.clear();
      
      const settingsStore = transaction.objectStore(STORE_SETTINGS);
      settingsStore.delete('ingestion_state');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAllRoms(): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_ROMS, 'readwrite');
      const store = transaction.objectStore(STORE_ROMS);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveCatalogGame(game: any): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_GAMES, 'readwrite');
      const store = transaction.objectStore(STORE_GAMES);
      const request = store.put(game);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveCatalogGames(games: any[]): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_GAMES, 'readwrite');
      const store = transaction.objectStore(STORE_GAMES);
      
      let completed = 0;
      let hasError = false;

      transaction.oncomplete = () => {
        if (!hasError) resolve();
      };

      transaction.onerror = () => {
        hasError = true;
        reject(transaction.error);
      };

      for (const game of games) {
        store.put(game);
      }
    });
  }

  async getCatalogGames(): Promise<any[]> {
    await this.initPromise;
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_GAMES, 'readonly');
      const store = transaction.objectStore(STORE_GAMES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- GCTS Results ---

  async saveGCTSResult(result: any): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_GCTS, 'readwrite');
      const store = transaction.objectStore(STORE_GCTS);
      const request = store.put(result);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getGCTSResults(): Promise<any[]> {
    await this.initPromise;
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_GCTS, 'readonly');
      const store = transaction.objectStore(STORE_GCTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings ---
  
  async getSetting(key: string): Promise<any> {
    await this.initPromise;
    if (!this.db) return null;
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_SETTINGS, 'readonly');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => resolve(null);
    });
  }

  async saveSetting(key: string, value: any): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_SETTINGS, 'readwrite');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Credits ---

  async getCredits(): Promise<number> {
    await this.initPromise;
    if (!this.db) return 0;
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_CREDITS, 'readonly');
      const store = transaction.objectStore(STORE_CREDITS);
      const request = store.get('player_credits');
      request.onsuccess = () => resolve(request.result?.amount || 0);
      request.onerror = () => resolve(0);
    });
  }

  async addCredits(amount: number): Promise<number> {
    const current = await this.getCredits();
    const newValue = current + amount;
    await this.initPromise;
    if (!this.db) return newValue;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_CREDITS, 'readwrite');
      const store = transaction.objectStore(STORE_CREDITS);
      const request = store.put({ id: 'player_credits', amount: newValue });
      request.onsuccess = () => resolve(newValue);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Recent Games ---

  async addRecentGame(gameId: string): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_RECENT, 'readwrite');
      const store = transaction.objectStore(STORE_RECENT);
      const request = store.put({ gameId, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRecentGames(limit: number = 10): Promise<{ gameId: string, timestamp: number }[]> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_RECENT, 'readonly');
      const store = transaction.objectStore(STORE_RECENT);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as { gameId: string, timestamp: number }[])
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Achievements ---

  async saveAchievement(achievement: { id: string, unlockedAt: string }): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_ACHIEVEMENTS, 'readwrite');
      const store = transaction.objectStore(STORE_ACHIEVEMENTS);
      const request = store.put(achievement);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnlockedAchievements(): Promise<string[]> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_ACHIEVEMENTS, 'readonly');
      const store = transaction.objectStore(STORE_ACHIEVEMENTS);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as { id: string, unlockedAt: string }[];
        resolve(results.map(r => r.id));
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const storage = new StorageService();
