import { supabase } from '../services/supabase';
import { SEASON_END_DATE } from './competitiveConfig';

export const statsService = {
  async getCompetitiveStats() {
    if (!supabase) {
      return {
        activePlayers: null,
        matchesToday: null,
        seasonEnd: null
      };
    }

    try {
      // 1. Jugadores activos (en matchmaking queue o en netplay_rooms activos)
      const { count: queueCount, error: queueError } = await supabase
        .from('matchmaking_queue')
        .select('*', { count: 'exact', head: true });

      const { count: roomsCount, error: roomsError } = await supabase
        .from('netplay_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'playing');

      let activePlayers = 0;
      if (!queueError && queueCount !== null) activePlayers += queueCount;
      if (!roomsError && roomsCount !== null) activePlayers += (roomsCount * 2); // 2 players per room

      // 2. Partidas hoy (contar salas únicas reportadas hoy)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const { data: matchesData, error: matchesError } = await supabase
        .from('match_results')
        .select('room_id')
        .gte('reported_at', today.toISOString());

      let matchesToday = 0;
      if (!matchesError && matchesData) {
        // Use a Set to count unique room IDs
        const uniqueRooms = new Set(matchesData.map(m => m.room_id));
        matchesToday = uniqueRooms.size;
      }

      // 3. Temporada
      const seasonEnd = new Date(SEASON_END_DATE);
      const now = new Date();
      const diffTime = Math.abs(seasonEnd.getTime() - now.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      const seasonEndFormatted = `${diffDays}D ${diffHours.toString().padStart(2, '0')}H`;

      return {
        activePlayers: activePlayers > 0 ? activePlayers : null,
        matchesToday: matchesToday > 0 ? matchesToday : null,
        seasonEnd: seasonEndFormatted
      };
    } catch (error) {
      console.error('Error fetching competitive stats:', error);
      return {
        activePlayers: null,
        matchesToday: null,
        seasonEnd: null
      };
    }
  }
};
