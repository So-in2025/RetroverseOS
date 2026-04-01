import { supabase } from '../services/supabase';
import { ELO_CONFIG } from './competitiveConfig';
import { withRetry } from '../utils/retry';

export const rankingService = {
  async getPlayerRank(userId: string) {
    if (!supabase) return null;

    try {
      const data = await withRetry(async () => {
        const { data, error } = await supabase!
          .from('players_rankings')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (error) throw error;
        return data;
      });
      return data;
    } catch (error) {
      // If not found or error, create initial ranking
      return await this.createInitialRank(userId);
    }
  },

  async createInitialRank(userId: string) {
    if (!supabase) return null;
    try {
      const data = await withRetry(async () => {
        const { data, error } = await supabase!
          .from('players_rankings')
          .insert({ user_id: userId, mmr: ELO_CONFIG.BASE_MMR, wins: 0, losses: 0, rank_tier: 'Bronze' })
          .select()
          .single();
        if (error) throw error;
        return data;
      });
      return data;
    } catch (error) {
      console.error('Error creating initial rank:', error);
      return null;
    }
  },

  getRankTier(mmr: number): string {
    if (mmr < 1100) return 'Bronze';
    if (mmr < 1300) return 'Silver';
    if (mmr < 1500) return 'Gold';
    if (mmr < 1800) return 'Platinum';
    if (mmr < 2200) return 'Diamond';
    return 'Master';
  },

  async updateTrustScore(userId: string, change: number) {
    if (!supabase) return;
    
    const currentRank = await this.getPlayerRank(userId);
    if (!currentRank) return;

    const newTrustScore = Math.max(0, Math.min(100, (currentRank.trust_score || 100) + change));

    try {
      await withRetry(async () => {
        const { error } = await supabase!
          .from('players_rankings')
          .update({
            trust_score: newTrustScore
          })
          .eq('user_id', userId);
        if (error) throw error;
      });
    } catch (error) {
      console.error('Error updating trust score:', error);
    }
  },

  async updateRank(userId: string, opponentMmr: number, result: 'win' | 'loss' | 'draw') {
    if (!supabase) return;
    
    const currentRank = await this.getPlayerRank(userId);
    if (!currentRank) return;

    const expectedScore = 1 / (1 + Math.pow(10, (opponentMmr - currentRank.mmr) / 400));
    
    let actualScore = 0;
    if (result === 'win') actualScore = 1;
    else if (result === 'draw') actualScore = 0.5;
    
    let newMmr = Math.round(currentRank.mmr + ELO_CONFIG.K_FACTOR * (actualScore - expectedScore));
    
    // Trust score < 50 -> no gana MMR
    if (newMmr > currentRank.mmr && (currentRank.trust_score !== undefined && currentRank.trust_score < 50)) {
      newMmr = currentRank.mmr;
      console.warn(`Player ${userId} won but gained no MMR due to low trust score (${currentRank.trust_score})`);
    }

    const newTier = this.getRankTier(newMmr);

    try {
      await withRetry(async () => {
        const { error } = await supabase!
          .from('players_rankings')
          .update({
            mmr: newMmr,
            rank_tier: newTier,
            wins: result === 'win' ? currentRank.wins + 1 : currentRank.wins,
            losses: result === 'loss' ? currentRank.losses + 1 : currentRank.losses
          })
          .eq('user_id', userId);
        if (error) throw error;
      });
    } catch (error) {
      console.error('Error updating rank:', error);
    }
  }
};
