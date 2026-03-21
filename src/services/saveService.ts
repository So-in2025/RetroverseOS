import { supabase } from './supabase';

export const saveService = {
  async uploadSave(userId: string, gameId: string, saveData: string) {
    if (!supabase) {
      console.warn('[SaveService] Supabase not initialized, skipping upload');
      return;
    }
    
    // Create blob from JSON string
    const blob = new Blob([saveData], { type: 'application/json' });
    
    const filePath = `${userId}/${gameId}/save.json`;
    
    const { error } = await supabase.storage
      .from('game_saves')
      .upload(filePath, blob, {
        upsert: true,
        contentType: 'application/json'
      });

    if (error) throw error;
  },

  async downloadSave(userId: string, gameId: string) {
    if (!supabase) {
      console.warn('[SaveService] Supabase not initialized, skipping download');
      return null;
    }
    
    const filePath = `${userId}/${gameId}/save.json`;
    
    const { data, error } = await supabase.storage
      .from('game_saves')
      .download(filePath);

    if (error) {
      if (error.message.includes('Object not found')) return null;
      throw error;
    }
    
    if (!data) return null;
    
    // Convert blob to text (JSON string)
    return await data.text();
  }
};
