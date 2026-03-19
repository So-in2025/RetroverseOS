import { storage } from './storage';

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

  // --- Retro Pass ---
  async hasRetroPass(): Promise<boolean> {
    const status = await storage.getSetting(this.RETRO_PASS_KEY);
    return !!status;
  }

  async subscribeRetroPass(): Promise<boolean> {
    // In a real app, this would integrate with Stripe/Google Pay
    await storage.saveSetting(this.RETRO_PASS_KEY, true);
    return true;
  }

  // --- Premium Packs ---
  async getOwnedPacks(): Promise<string[]> {
    const packs = await storage.getSetting(this.OWNED_PACKS_KEY);
    return packs || [];
  }

  async buyPack(packId: string, price: number): Promise<boolean> {
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
  async getReferralData(): Promise<ReferralData> {
    let data = await storage.getSetting(this.REFERRAL_KEY);
    if (!data) {
      // Generate a random code for the user
      const code = 'RV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      data = { code, invites: 0, claimedRewards: [] };
      await storage.saveSetting(this.REFERRAL_KEY, data);
    }
    return data;
  }

  async simulateReferralSignup(): Promise<void> {
    // For demo purposes, simulate someone signing up with the user's code
    const data = await this.getReferralData();
    data.invites += 1;
    await storage.saveSetting(this.REFERRAL_KEY, data);
  }

  async claimReferralReward(rewardId: string, requiredInvites: number): Promise<boolean> {
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
}

export const economyService = new EconomyService();
