import { supabase } from '../services/supabase';
import { netplayService } from '../services/netplayService';
import { withRetry } from '../utils/retry';

export const matchmakingService = {
  // --- FASE 5: NUEVO SISTEMA DE MATCHMAKING POR MMR ---
  
  async addToQueue(userId: string, gameId: string, mmr: number) {
    if (!supabase) return false;
    
    try {
      // Clean up stale entries before adding a new one
      await this.cleanupStaleEntries();

      await withRetry(async () => {
        const { error } = await supabase!
          .from('matchmaking_queue')
          .upsert({
            user_id: userId,
            game_id: gameId,
            mmr: mmr,
            joined_at: new Date().toISOString()
          });
        if (error) throw error;
      });
      return true;
    } catch (error) {
      console.error('Error adding to matchmaking queue:', error);
      return false;
    }
  },

  async removeFromQueue(userId: string) {
    if (!supabase) return false;
    
    try {
      await withRetry(async () => {
        const { error } = await supabase!
          .from('matchmaking_queue')
          .delete()
          .eq('user_id', userId);
        if (error) throw error;
      });
      return true;
    } catch (error) {
      console.error('Error removing from matchmaking queue:', error);
      return false;
    }
  },

  async cleanupStaleEntries() {
    if (!supabase) return;
    
    try {
      // Remove entries older than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabase
        .from('matchmaking_queue')
        .delete()
        .lt('joined_at', fiveMinutesAgo);
    } catch (error) {
      console.error('Error cleaning up stale matchmaking entries:', error);
    }
  },

  async findMatchByMMR(userId: string, mmr: number, gameId: string, elapsedTime: number) {
    if (!supabase) return null;
    
    // Rango inicial ±100, expandir cada 5s (+50)
    const expansionFactor = Math.floor(elapsedTime / 5000);
    const range = 100 + (expansionFactor * 50);
    
    const minMmr = mmr - range;
    const maxMmr = mmr + range;

    const { data, error } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('game_id', gameId)
      .neq('user_id', userId)
      .is('room_id', null)
      .gte('mmr', minMmr)
      .lte('mmr', maxMmr)
      .order('joined_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error finding match by MMR:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  },

  async pollMatchmakingQueue(userId: string, gameId: string, currentMmr: number, elapsedTime: number, user: any, game: any) {
    if (!supabase) return null;

    // 1. Revisar si alguien más ya me asignó una sala (alguien me encontró a mí)
    const { data: myQueueEntry, error: myQueueError } = await supabase
      .from('matchmaking_queue')
      .select('room_id')
      .eq('user_id', userId)
      .single();

    if (myQueueError) {
      console.error('Error checking my queue status:', myQueueError);
      return null;
    }

    // ¡Alguien me encontró y creó una sala para mí!
    if (myQueueEntry && myQueueEntry.room_id) {
      const joined = await netplayService.joinRoom(myQueueEntry.room_id, userId);
      if (joined) {
        await this.removeFromQueue(userId);
        // Obtener los datos de la sala para retornarlos a la UI
        const { data: room } = await supabase
          .from('netplay_rooms')
          .select('*')
          .eq('id', myQueueEntry.room_id)
          .single();
        return { room, opponentId: room.host_id };
      } else {
        // La sala ya no existe o está llena. Limpiar mi room_id para seguir buscando.
        await supabase
          .from('matchmaking_queue')
          .update({ room_id: null })
          .eq('user_id', userId);
      }
      return null;
    }

    // 2. Si nadie me ha encontrado, buscar yo a un oponente
    const opponent = await this.findMatchByMMR(userId, currentMmr, gameId, elapsedTime);
    
    if (opponent) {
      // 3. Oponente encontrado. Crear sala de netplay.
      const room = await netplayService.createRoom(user, game);
      if (room) {
        // 4. Asignar la sala al oponente (solo si no le han asignado una ya)
        const { data: updatedOpponent, error: updateError } = await supabase
          .from('matchmaking_queue')
          .update({ room_id: room.id })
          .eq('user_id', opponent.user_id)
          .is('room_id', null)
          .select()
          .single();
          
        if (updatedOpponent && !updateError) {
          // Éxito: Reclamé al oponente. Me salgo de la cola y retorno la sala.
          await this.removeFromQueue(userId);
          return { room, opponentId: opponent.user_id };
        } else {
          // Fracaso: Alguien más reclamó a este oponente justo al mismo tiempo.
          // Limpiar la sala que creé por error y seguir esperando.
          await supabase.from('netplay_rooms').delete().eq('id', room.id);
        }
      }
    }

    // Si no hay oponente o hubo colisión, retornar null para que el polling continúe
    return null;
  },

  // --- SISTEMA ACTUAL (LEGACY) ---
  async findMatch(userId: string, gameId: string, currentMmr: number, user: any, game: any) {
    if (!supabase) return null;

    // 1. Try to find an existing waiting room for this game
    const { data: rooms, error } = await supabase
      .from('netplay_rooms')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'waiting')
      .neq('host_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Matchmaking error:', error);
      return null;
    }

    if (rooms && rooms.length > 0) {
      const room = rooms[0];
      const joined = await netplayService.joinRoom(room.id, userId);
      return joined ? room : null;
    }

    // 2. If no room found, create one
    return await netplayService.createRoom(user, game);
  },
};
