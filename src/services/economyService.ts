import { storage } from './storage';
import { cloudEconomyService } from './cloudEconomyService';

export interface PremiumPack {
  id: string;
  name: string;
  price: number;
  games: string[]; // Array of game IDs
}

export interface ReferralData {
  code: string;
  invites: number;
  claimedRewards: string[];
}

class EconomyService {
  private readonly RETRO_PASS_KEY = 'retro_pass_active';
  private readonly REFERRAL_KEY = 'referral_data';
  private readonly OWNED_PACKS_KEY = 'owned_packs';

  // --- Credits ---
  async getCredits(userId?: string): Promise<number> {
    if (userId) return await cloudEconomyService.getCredits(userId);
    return await storage.getCredits();
  }

  async addCredits(userId: string | undefined, amount: number): Promise<number> {
    if (userId) return await cloudEconomyService.addCredits(userId, amount);
    return await storage.addCredits(amount);
  }

  // --- Retro Pass ---
  async hasRetroPass(userId?: string): Promise<boolean> {
    if (userId) return await cloudEconomyService.hasRetroPass(userId);
    const status = await storage.getSetting(this.RETRO_PASS_KEY);
    return !!status;
  }

  async subscribeRetroPass(userId?: string): Promise<boolean> {
    if (userId) return await cloudEconomyService.subscribeRetroPass(userId);
    await storage.saveSetting(this.RETRO_PASS_KEY, true);
    return true;
  }

  // --- Premium Packs ---
  async getOwnedPacks(userId?: string): Promise<string[]> {
    if (userId) return await cloudEconomyService.getOwnedPacks(userId);
    const packs = await storage.getSetting(this.OWNED_PACKS_KEY);
    return packs || [];
  }

  async buyPack(userId: string | undefined, packId: string, price: number): Promise<boolean> {
    if (userId) return await cloudEconomyService.buyPack(userId, packId, price);
    
    const credits = await storage.getCredits();
    if (credits >= price) {
      await storage.addCredits(-price);
      const owned = await this.getOwnedPacks();
      if (!owned.includes(packId)) {
        owned.push(packId);
        await storage.saveSetting(this.OWNED_PACKS_KEY, owned);
      }
      return true;
    }
    return false;
  }

  // --- Referrals ---
  async getReferralData(userId?: string): Promise<ReferralData> {
    if (userId) return await cloudEconomyService.getReferralData(userId);
    
    // Referrals are currently local-only in this implementation
    let data = await storage.getSetting(this.REFERRAL_KEY);
    if (!data) {
      // Generate a random code for the user
      const code = 'RV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      data = { code, invites: 0, claimedRewards: [] };
      await storage.saveSetting(this.REFERRAL_KEY, data);
    }
    return data;
  }

  async claimReferralReward(userId: string | undefined, rewardId: string, requiredInvites: number): Promise<boolean> {
    if (userId) return await cloudEconomyService.claimReferralReward(userId, rewardId, requiredInvites);
    
    const data = await this.getReferralData();
    if (data.invites >= requiredInvites && !data.claimedRewards.includes(rewardId)) {
      data.claimedRewards.push(rewardId);
      await storage.saveSetting(this.REFERRAL_KEY, data);
      
      // Grant reward (e.g., 500 CR)
      if (rewardId === 'reward_1') {
        await storage.addCredits(500);
      } else if (rewardId === 'reward_2') {
        await storage.addCredits(1500);
      } else if (rewardId === 'reward_3') {
        await this.subscribeRetroPass();
      }
      return true;
    }
    return false;
  }
  // --- Cosmetics & Settings ---
  async getCoachVoice(userId?: string): Promise<string> {
    if (userId) return await cloudEconomyService.getCoachVoice(userId);
    return await storage.getSetting('coach_voice') || 'Kore';
  }

  async saveCoachVoice(userId: string | undefined, voiceId: string): Promise<void> {
    if (userId) return await cloudEconomyService.saveCoachVoice(userId, voiceId);
    await storage.saveSetting('coach_voice', voiceId);
  }

  async getPurchasedItems(userId?: string): Promise<number[]> {
    if (userId) return await cloudEconomyService.getPurchasedItems(userId);
    return await storage.getSetting('purchased_items') || [];
  }

  async savePurchasedItems(userId: string | undefined, items: number[]): Promise<void> {
    if (userId) return await cloudEconomyService.savePurchasedItems(userId, items);
    await storage.saveSetting('purchased_items', items);
  }
  async getUserPreferences(userId?: string): Promise<any> {
    if (userId) return await cloudEconomyService.getUserPreferences(userId);
    return await storage.getSetting('user_preferences');
  }

  async saveUserPreferences(userId: string | undefined, prefs: any): Promise<void> {
    if (userId) return await cloudEconomyService.saveUserPreferences(userId, prefs);
    await storage.saveSetting('user_preferences', prefs);
  }

  async getControls(userId?: string): Promise<any> {
    if (userId) return await cloudEconomyService.getControls(userId);
    return await storage.getSetting('controls');
  }

  async saveControls(userId: string | undefined, controls: any): Promise<void> {
    if (userId) return await cloudEconomyService.saveControls(userId, controls);
    await storage.saveSetting('controls', controls);
  }
  async getVideoSettings(userId?: string): Promise<any> {
    if (userId) return await cloudEconomyService.getVideoSettings(userId);
    return await storage.getSetting('videoSettings');
  }

  async saveVideoSettings(userId: string | undefined, settings: any): Promise<void> {
    if (userId) return await cloudEconomyService.saveVideoSettings(userId, settings);
    await storage.saveSetting('videoSettings', settings);
  }

  async getAudioSettings(userId?: string): Promise<any> {
    if (userId) return await cloudEconomyService.getAudioSettings(userId);
    return await storage.getSetting('audioSettings');
  }

  async saveAudioSettings(userId: string | undefined, settings: any): Promise<void> {
    if (userId) return await cloudEconomyService.saveAudioSettings(userId, settings);
    await storage.saveSetting('audioSettings', settings);
  }
  async getSetting(key: string, userId?: string): Promise<any> {
    if (userId) {
      // For general settings, we might need a specific cloud method or use user_preferences
      // For now, let's assume they are stored in user_preferences
      const prefs = await cloudEconomyService.getUserPreferences(userId);
      return prefs ? prefs[key] : null;
    }
    return await storage.getSetting(key);
  }

  async saveSetting(key: string, value: any, userId?: string): Promise<void> {
    if (userId) {
      let prefs = await cloudEconomyService.getUserPreferences(userId) || {};
      prefs[key] = value;
      await cloudEconomyService.saveUserPreferences(userId, prefs);
      return;
    }
    await storage.saveSetting(key, value);
  }
}

export const economyService = new EconomyService();
