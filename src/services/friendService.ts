import { supabase } from './supabase';

export interface Friend {
  user_id: string;
  username: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'playing';
  current_game?: string;
}

class FriendService {
  private friends: Friend[] = [];
  private listeners: Set<() => void> = new Set();
  private presenceChannel: any = null;

  async init(userId: string) {
    if (!supabase) return;

    // Fetch friends list
    const { data, error } = await supabase
      .from('friends')
      .select('friend_id, friend_username, friend_avatar')
      .eq('user_id', userId);

    if (error) {
      console.error('[FriendService] Error fetching friends:', error);
      return;
    }

    this.friends = (data || []).map(f => ({
      user_id: f.friend_id,
      username: f.friend_username,
      avatar_url: f.friend_avatar,
      status: 'offline'
    }));

    // Setup Presence
    this.presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel.presenceState();
        this.updateOnlineStatus(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel.track({
            online_at: new Date().toISOString(),
            status: 'online'
          });
        }
      });

    this.notifyListeners();
  }

  private updateOnlineStatus(presenceState: any) {
    const onlineUserIds = Object.keys(presenceState);
    
    this.friends = this.friends.map(friend => {
      const isOnline = onlineUserIds.includes(friend.user_id);
      const presence = presenceState[friend.user_id]?.[0];
      
      return {
        ...friend,
        status: isOnline ? (presence?.status || 'online') : 'offline',
        current_game: presence?.current_game
      };
    });

    this.notifyListeners();
  }

  async setStatus(status: 'online' | 'playing', currentGame?: string) {
    if (this.presenceChannel) {
      await this.presenceChannel.track({
        online_at: new Date().toISOString(),
        status,
        current_game: currentGame
      });
    }
  }

  getFriends(): Friend[] {
    return this.friends;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  async addFriend(userId: string, friendId: string, friendUsername: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendId,
        friend_username: friendUsername
      });

    if (error) console.error('[FriendService] Error adding friend:', error);
    else await this.init(userId);
  }
}

export const friendService = new FriendService();
