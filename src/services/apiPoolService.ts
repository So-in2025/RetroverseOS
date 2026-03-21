import { storage } from './storage';

export interface APIKeyStatus {
  key: string;
  isExhausted: boolean;
  lastUsed: number;
  exhaustedAt: number | null;
}

class APIPoolService {
  private readonly POOL_KEY = 'api_key_pool';
  private keys: APIKeyStatus[] = [];

  constructor() {
    this.loadPool();
  }

  private async loadPool() {
    const pool = await storage.getSetting(this.POOL_KEY);
    if (pool) {
      this.keys = pool;
      this.checkResets();
    } else {
      // Initialize with the default key from env
      const defaultKey = process.env.GEMINI_API_KEY;
      if (defaultKey) {
        this.keys = [{
          key: defaultKey,
          isExhausted: false,
          lastUsed: Date.now(),
          exhaustedAt: null
        }];
        await this.savePool();
      }
    }
  }

  private async savePool() {
    await storage.saveSetting(this.POOL_KEY, this.keys);
  }

  private checkResets() {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    let changed = false;
    this.keys = this.keys.map(k => {
      if (k.isExhausted && k.exhaustedAt && (now - k.exhaustedAt > twentyFourHours)) {
        changed = true;
        return { ...k, isExhausted: false, exhaustedAt: null };
      }
      return k;
    });

    if (changed) this.savePool();
  }

  async getNextKey(): Promise<string | null> {
    // 1. Check for BYOK (Bring Your Own Key) first
    const byokKey = localStorage.getItem('retroos_gemini_key');
    if (byokKey && byokKey.startsWith('AIza')) {
      return byokKey;
    }

    // 2. Fallback to pool
    await this.loadPool();
    this.checkResets();

    const available = this.keys.find(k => !k.isExhausted);
    if (available) {
      available.lastUsed = Date.now();
      await this.savePool();
      return available.key;
    }

    return null;
  }

  async markExhausted(key: string) {
    const k = this.keys.find(item => item.key === key);
    if (k) {
      k.isExhausted = true;
      k.exhaustedAt = Date.now();
      await this.savePool();
    }
  }

  async addKey(key: string) {
    if (this.keys.some(k => k.key === key)) return;
    this.keys.push({
      key,
      isExhausted: false,
      lastUsed: 0,
      exhaustedAt: null
    });
    await this.savePool();
  }

  async removeKey(key: string) {
    this.keys = this.keys.filter(k => k.key !== key);
    await this.savePool();
  }

  async getKeys(): Promise<APIKeyStatus[]> {
    await this.loadPool();
    return this.keys;
  }
}

export const apiPoolService = new APIPoolService();
