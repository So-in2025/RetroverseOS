import { supabase } from '../services/supabase';
import { CompetitivePlayer } from './competitiveTypes';

export const leaderboardService = {
  async getTopPlayers(limit: number = 10): Promise<CompetitivePlayer[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('players_rankings')
      .select('*')
      .order('mmr', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
    return data || [];
  }
};
