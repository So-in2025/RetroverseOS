import { supabase } from './supabase';

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  score: number;
  rank_name: string;
  avatar_url?: string;
}

export interface UserRank {
  score: number;
  rank: number;
  rank_name: string;
  percentile: number;
}

class LeaderboardService {
  private readonly RANKS = [
    { name: 'BRONCE I', min: 0 },
    { name: 'BRONCE II', min: 200 },
    { name: 'PLATA I', min: 500 },
    { name: 'PLATA II', min: 800 },
    { name: 'ORO I', min: 1200 },
    { name: 'ORO II', min: 1600 },
    { name: 'PLATINO I', min: 2000 },
    { name: 'PLATINO II', min: 2500 },
    { name: 'DIAMANTE I', min: 3200 },
    { name: 'DIAMANTE II', min: 4000 },
    { name: 'MAESTRO', min: 5000 },
    { name: 'RONIN', min: 7500 }
  ];

  getRankName(score: number): string {
    const rank = [...this.RANKS].reverse().find(r => score >= r.min);
    return rank ? rank.name : 'RECLUTA';
  }

  async submitScore(userId: string, username: string, scoreDelta: number) {
    if (!supabase) return;

    // Get current score
    const { data: current } = await supabase
      .from('leaderboards')
      .select('score')
      .eq('user_id', userId)
      .single();

    const newScore = (current?.score || 0) + scoreDelta;
    const rankName = this.getRankName(newScore);

    const { error } = await supabase
      .from('leaderboards')
      .upsert({
        user_id: userId,
        username,
        score: newScore,
        rank_name: rankName,
        updated_at: new Date().toISOString()
      });

    if (error) console.error('[Leaderboard] Error submitting score:', error);
  }

  async getGlobalTop(limit = 10): Promise<LeaderboardEntry[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('leaderboards')
      .select('user_id, username, score, rank_name')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Leaderboard] Error fetching top:', error);
      return [];
    }

    return data || [];
  }

  async getUserRank(userId: string): Promise<UserRank | null> {
    if (!supabase) return null;

    const { data: userEntry, error: userError } = await supabase
      .from('leaderboards')
      .select('score, rank_name')
      .eq('user_id', userId)
      .single();

    if (userError || !userEntry) return null;

    const { count, error: countError } = await supabase
      .from('leaderboards')
      .select('*', { count: 'exact', head: true })
      .gt('score', userEntry.score);

    if (countError) return null;

    const { count: totalCount } = await supabase
      .from('leaderboards')
      .select('*', { count: 'exact', head: true });

    const rank = (count || 0) + 1;
    const percentile = totalCount ? Math.round((1 - (rank / totalCount)) * 100) : 100;

    return {
      score: userEntry.score,
      rank,
      rank_name: userEntry.rank_name,
      percentile
    };
  }
}

export const leaderboard = new LeaderboardService();
