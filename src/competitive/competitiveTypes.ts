export interface CompetitivePlayer {
  user_id: string;
  mmr: number;
  wins: number;
  losses: number;
  rank_tier: string;
}

export interface CompetitiveMatch {
  id: string;
  player1_id: string;
  player2_id: string;
  game_id: string;
  winner_id: string | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'upcoming' | 'ongoing' | 'finished';
  created_at: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  player1: string;
  player2: string;
  winner: string | null;
}
