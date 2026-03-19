import { supabase } from './supabase';

export interface ReferralData {
  code: string;
  invites: number;
  claimedRewards: string[];
}

class CloudEconomyService {
  // --- Retro Pass ---
  async hasRetroPass(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('has_retro_pass')
      .eq('user_id', userId)
      .single();
    if (error) return false;
    return !!data?.has_retro_pass;
  }

  async subscribeRetroPass(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ has_retro_pass: true })
      .eq('user_id', userId);
    return !error;
  }

  // --- Credits ---
  async getCredits(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('user_id', userId)
      .single();
    if (error) return 0;
    return data?.credits || 0;
  }

  async addCredits(userId: string, amount: number): Promise<number> {
    const current = await this.getCredits(userId);
    const newValue = current + amount;
    const { error } = await supabase
      .from('user_profiles')
      .update({ credits: newValue })
      .eq('user_id', userId);
    if (error) throw error;
    return newValue;
  }

  // --- Premium Packs ---
  async getOwnedPacks(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_owned_packs')
      .select('pack_id')
      .eq('user_id', userId);
    if (error) return [];
    return data.map(p => p.pack_id);
  }

  async buyPack(userId: string, packId: string, price: number): Promise<boolean> {
    const credits = await this.getCredits(userId);
    if (credits >= price) {
      // Transaction-like update
      const { error: creditError } = await supabase
        .from('user_profiles')
        .update({ credits: credits - price })
        .eq('user_id', userId);
      
      if (creditError) return false;

      const { error: packError } = await supabase
        .from('user_owned_packs')
        .insert([{ user_id: userId, pack_id: packId }]);

      return !packError;
    }
    return false;
  }
  // --- Referrals ---
  async getReferralData(userId: string): Promise<ReferralData> {
    const { data, error } = await supabase
      .from('user_referrals')
      .select('referral_code, invites, claimed_rewards')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      // Return default if not found
      return { code: 'RV-' + userId.substring(0, 6).toUpperCase(), invites: 0, claimedRewards: [] };
    }
    return { 
      code: data.referral_code, 
      invites: data.invites, 
      claimedRewards: data.claimed_rewards || [] 
    };
  }

  async claimReferralReward(userId: string, rewardId: string, requiredInvites: number): Promise<boolean> {
    const data = await this.getReferralData(userId);
    if (data.invites >= requiredInvites && !data.claimedRewards.includes(rewardId)) {
      const updatedRewards = [...data.claimedRewards, rewardId];
      const { error } = await supabase
        .from('user_referrals')
        .update({ claimed_rewards: updatedRewards })
        .eq('user_id', userId);
      
      if (error) return false;
      
      // Grant reward
      if (rewardId === 'reward_1') {
        await this.addCredits(userId, 500);
      } else if (rewardId === 'reward_2') {
        await this.addCredits(userId, 1500);
      } else if (rewardId === 'reward_3') {
        await this.subscribeRetroPass(userId);
      }
      return true;
    }
    return false;
  }
  // --- Cosmetics & Settings ---
  async getCoachVoice(userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('coach_voice')
      .eq('user_id', userId)
      .single();
    if (error || !data?.coach_voice) return 'Kore';
    return data.coach_voice;
  }

  async saveCoachVoice(userId: string, voiceId: string): Promise<void> {
    await supabase
      .from('user_profiles')
      .update({ coach_voice: voiceId })
      .eq('user_id', userId);
  }

  async getPurchasedItems(userId: string): Promise<number[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('purchased_items')
      .eq('user_id', userId)
      .single();
    if (error || !data?.purchased_items) return [];
    return data.purchased_items;
  }

  async savePurchasedItems(userId: string, items: number[]): Promise<void> {
    await supabase
      .from('user_profiles')
      .update({ purchased_items: items })
      .eq('user_id', userId);
  }
  async getUserPreferences(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_preferences')
      .eq('user_id', userId)
      .single();
    if (error || !data?.user_preferences) return null;
    return data.user_preferences;
  }

  async saveUserPreferences(userId: string, prefs: any): Promise<void> {
    await supabase
      .from('user_profiles')
      .update({ user_preferences: prefs })
      .eq('user_id', userId);
  }

  async getControls(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('controls')
      .eq('user_id', userId)
      .single();
    if (error || !data?.controls) return null;
    return data.controls;
  }

  async saveControls(userId: string, controls: any): Promise<void> {
    await supabase
      .from('user_profiles')
      .update({ controls: controls })
      .eq('user_id', userId);
  }
  async getVideoSettings(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('video_settings')
      .eq('user_id', userId)
      .single();
    if (error || !data?.video_settings) return null;
    return data.video_settings;
  }

  async saveVideoSettings(userId: string, settings: any): Promise<void> {
    await supabase
      .from('user_profiles')
      .update({ video_settings: settings })
      .eq('user_id', userId);
  }

  async getAudioSettings(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('audio_settings')
      .eq('user_id', userId)
      .single();
    if (error || !data?.audio_settings) return null;
    return data.audio_settings;
  }

  async saveAudioSettings(userId: string, settings: any): Promise<void> {
    await supabase
      .from('user_profiles')
      .update({ audio_settings: settings })
      .eq('user_id', userId);
  }
}

export const cloudEconomyService = new CloudEconomyService();
