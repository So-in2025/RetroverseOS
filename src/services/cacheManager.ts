import localforage from 'localforage';

/**
 * CacheManager handles LRU (Least Recently Used) eviction for local storage.
 * This ensures that the application doesn't exceed storage limits while
 * keeping the most relevant assets available offline.
 */
class CacheManager {
  private coverStore = localforage.createInstance({
    name: 'retroverse-covers',
    storeName: 'blobs'
  });

  private metadataStore = localforage.createInstance({
    name: 'retroverse-covers-metadata',
    storeName: 'access-times'
  });

  private readonly MAX_COVERS = 500; // Limit to 500 covers
  private readonly MAX_SIZE_MB = 100; // Limit to 100MB of covers

  /**
   * Records an access to a cached item to maintain LRU order.
   */
  async recordAccess(id: string) {
    await this.metadataStore.setItem(id, Date.now());
  }

  /**
   * Saves an item to the cache and performs eviction if necessary.
   */
  async putCover(id: string, blob: Blob) {
    await this.coverStore.setItem(id, blob);
    await this.recordAccess(id);
    
    // Perform eviction in the background
    this.evictIfNeeded();
  }

  /**
   * Retrieves an item from the cache.
   */
  async getCover(id: string): Promise<Blob | null> {
    const blob = await this.coverStore.getItem<Blob>(id);
    if (blob) {
      this.recordAccess(id);
    }
    return blob;
  }

  /**
   * Evicts the oldest items if limits are exceeded.
   */
  private async evictIfNeeded() {
    try {
      const keys = await this.coverStore.keys();
      
      if (keys.length <= this.MAX_COVERS) return;

      console.log(`[CacheManager] Evicting covers... Current count: ${keys.length}`);

      // Get all access times
      const metadata: { id: string, lastAccessed: number }[] = [];
      for (const id of keys) {
        const lastAccessed = await this.metadataStore.getItem<number>(id) || 0;
        metadata.push({ id, lastAccessed });
      }

      // Sort by last accessed (oldest first)
      metadata.sort((a, b) => a.lastAccessed - b.lastAccessed);

      // Evict until we are under the limit
      const toEvict = metadata.slice(0, keys.length - this.MAX_COVERS);
      
      for (const item of toEvict) {
        await this.coverStore.removeItem(item.id);
        await this.metadataStore.removeItem(item.id);
        console.log(`[CacheManager] Evicted cover: ${item.id}`);
      }
    } catch (error) {
      console.error('[CacheManager] Eviction failed:', error);
    }
  }

  /**
   * Clears all cached covers.
   */
  async clearAll() {
    await Promise.all([
      this.coverStore.clear(),
      this.metadataStore.clear()
    ]);
  }
}

export const cacheManager = new CacheManager();
