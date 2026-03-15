import { supabase } from './supabase';

export const saveService = {
  async uploadSave(userId: string, gameId: string, saveData: string) {
    if (!supabase) {
      console.warn('[SaveService] Supabase not initialized, skipping upload');
      return;
    }
    const { error } = await supabase
      .from('game_saves')
      .upsert({
        user_id: userId,
        game_id: gameId,
        save_data: saveData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,game_id' });

    if (error) throw error;
  },

  async downloadSave(userId: string, gameId: string) {
    if (!supabase) {
      console.warn('[SaveService] Supabase not initialized, skipping download');
      return null;
    }
    const { data, error } = await supabase
      .from('game_saves')
      .select('save_data')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data?.save_data || null;
  }
};
