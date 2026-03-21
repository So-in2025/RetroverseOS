import { supabase } from './supabase';

export interface NetplayRoom {
  id: string;
  host_id: string;
  host_name: string;
  game_id: string;
  game_title: string;
  system_id: string;
  status: 'waiting' | 'playing' | 'closed';
  players_count: number;
  max_players: number;
  created_at: string;
}

class NetplayService {
  private channel: any = null;

  async createRoom(user: any, game: any): Promise<NetplayRoom | null> {
    const { data, error } = await supabase
      .from('netplay_rooms')
      .insert({
        host_id: user.id,
        host_name: user.user_metadata.full_name || 'Operador',
        game_id: game.game_id,
        game_title: game.title,
        system_id: game.system_id,
        status: 'waiting',
        players_count: 1,
        max_players: 2 // Default for retro games
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating netplay room:', error);
      return null;
    }

    return data;
  }

  async getActiveRooms(): Promise<NetplayRoom[]> {
    const { data, error } = await supabase
      .from('netplay_rooms')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }

    return data || [];
  }

  async joinRoom(roomId: string, userId: string) {
    // In a real app, this would update the room state and notify the host
    // For now, we simulate the join
    const { error } = await supabase
      .from('netplay_rooms')
      .update({ players_count: 2, status: 'playing' })
      .eq('id', roomId);

    return !error;
  }

  subscribeToRooms(callback: (rooms: NetplayRoom[]) => void) {
    const channel = supabase
      .channel('netplay_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'netplay_rooms' }, async () => {
        const rooms = await this.getActiveRooms();
        callback(rooms);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const netplayService = new NetplayService();
