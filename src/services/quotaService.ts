import { storage } from './storage';

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
}

class QuotaService {
  private readonly DAILY_LIMIT = 5; // Default free limit
  private readonly PREMIUM_LIMIT = 25; // Premium limit
  private readonly QUOTA_KEY = 'ai_tactical_quota';

  async getStatus(isPremium: boolean = false): Promise<QuotaStatus> {
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const resetAt = today + 24 * 60 * 60 * 1000;
    const limit = isPremium ? this.PREMIUM_LIMIT : this.DAILY_LIMIT;

    const data = await storage.getSetting(this.QUOTA_KEY);
    
    // If no data or data is from a previous day, reset
    if (!data || data.lastReset < today) {
      return {
        used: 0,
        limit,
        remaining: limit,
        resetAt
      };
    }

    return {
      used: data.used,
      limit,
      remaining: Math.max(0, limit - data.used),
      resetAt
    };
  }

  async incrementUsage(isPremium: boolean = false): Promise<boolean> {
    const status = await this.getStatus(isPremium);
    if (status.remaining <= 0) return false;

    const today = new Date().setHours(0, 0, 0, 0);
    await storage.saveSetting(this.QUOTA_KEY, {
      used: status.used + 1,
      lastReset: today
    });

    return true;
  }

  async canUse(isPremium: boolean = false): Promise<boolean> {
    const status = await this.getStatus(isPremium);
    return status.remaining > 0;
  }

  async resetQuota(): Promise<void> {
    const today = new Date().setHours(0, 0, 0, 0);
    await storage.saveSetting(this.QUOTA_KEY, {
      used: 0,
      lastReset: today
    });
  }

  getTimeUntilReset(): number {
    const now = Date.now();
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return Math.max(0, tomorrow.getTime() - now);
  }
}

export const quotaService = new QuotaService();
