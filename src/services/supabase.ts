import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

const isPlaceholder = supabaseUrl?.includes('your-project-id') || supabaseAnonKey?.includes('your-anon-key');

if (supabaseUrl && supabaseAnonKey && !isPlaceholder) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('⚠️ [Supabase] Missing or placeholder environment variables. Cloud saves and Multiplayer features will be disabled.');
}

export const supabase = supabaseClient;

export interface GameSession {
  id: string;
  game_id: string;
  host_id: string;
  opponent_id?: string;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
}

export const multiplayerService = {
  async createSession(gameId: string, userId: string) {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return null;
    }
    const { data, error } = await supabase
      .from('game_sessions')
      .insert([
        { game_id: gameId, host_id: userId, status: 'waiting' }
      ])
      .select()
      .single();

    if (error) throw error;
    return data as GameSession;
  },

  async joinSession(sessionId: string, userId: string) {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return null;
    }
    const { data, error } = await supabase
      .from('game_sessions')
      .update({ opponent_id: userId, status: 'playing' })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data as GameSession;
  },

  onSessionUpdate(sessionId: string, callback: (session: GameSession) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    return supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, payload => {
        callback(payload.new as GameSession);
      })
      .subscribe();
  }
};
