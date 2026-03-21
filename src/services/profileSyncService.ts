import { supabase } from './supabase';
import { storage } from './storage';
import { customization } from './customization';

export interface ProfileData {
  user_id: string;
  coins: number;
  owned_items: string[];
  equipped_items: any;
  achievements: string[];
  stats: any;
  updated_at: string;
}

class ProfileSyncService {
  private syncEnabled = false;

  async init() {
    const hasCloudSync = await customization.isCloudSyncEnabled();
    this.syncEnabled = hasCloudSync;
  }

  setSyncEnabled(enabled: boolean) {
    this.syncEnabled = enabled;
  }

  async syncProfile(userId: string) {
    if (!this.syncEnabled || !supabase) return;

    try {
      // 1. Get local data
      const coins = await storage.getCredits();
      const ownedItems = await storage.getSetting('owned_items') || [];
      const equippedItems = await storage.getSetting('equipped_items') || {};
      const achievements = await storage.getUnlockedAchievements() || [];
      const totalPlayTime = await storage.getSetting('total_play_time') || 0;
      const playedSystems = await storage.getSetting('played_systems') || [];
      const playedGames = await storage.getSetting('played_games') || [];
      const localUpdatedAt = await storage.getSetting('profile_updated_at') || '1970-01-01T00:00:00Z';

      // 2. Get remote data
      const { data: remoteData, error: remoteError } = await supabase
        .from('user_profiles')
        .select('updated_at')
        .eq('user_id', userId)
        .single();

      if (remoteError && remoteError.code !== 'PGRST116') throw remoteError;

      // 3. Conflict Resolution: If remote is newer, pull instead of push
      if (remoteData && new Date(remoteData.updated_at) > new Date(localUpdatedAt)) {
        console.log('[ProfileSync] Remote profile is newer, pulling instead of pushing');
        await this.pullProfile(userId);
        return;
      }

      // 4. Push local data
      const profileData: Partial<ProfileData> = {
        user_id: userId,
        coins,
        owned_items: ownedItems,
        equipped_items: equippedItems,
        achievements,
        stats: {
          totalPlayTime,
          playedSystems,
          playedGames
        },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;
      
      // Update local timestamp
      await storage.saveSetting('profile_updated_at', profileData.updated_at);
      
      console.log('[ProfileSync] Profile synced to cloud');
    } catch (err) {
      console.error('[ProfileSync] Error syncing profile:', err);
    }
  }

  async pullProfile(userId: string) {
    if (!this.syncEnabled || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return;

      console.log('[ProfileSync] Pulling profile from cloud...');

      // Update local storage with cloud data
      if (data.coins !== undefined) await storage.saveSetting('player_credits', { id: 'player_credits', amount: data.coins });
      if (data.owned_items) await storage.saveSetting('owned_items', data.owned_items);
      if (data.equipped_items) await storage.saveSetting('equipped_items', data.equipped_items);
      if (data.achievements) {
        for (const id of data.achievements) {
          await storage.saveAchievement({ id, unlockedAt: new Date().toISOString() });
        }
      }
      if (data.stats) {
        if (data.stats.totalPlayTime) await storage.saveSetting('total_play_time', data.stats.totalPlayTime);
        if (data.stats.playedSystems) await storage.saveSetting('played_systems', data.stats.playedSystems);
        if (data.stats.playedGames) await storage.saveSetting('played_games', data.stats.playedGames);
      }

      // Update local timestamp
      await storage.saveSetting('profile_updated_at', data.updated_at);
      
      console.log('[ProfileSync] Profile pulled and updated locally');
      return true;
    } catch (err) {
      console.error('[ProfileSync] Error pulling profile:', err);
      return false;
    }
  }
}

export const profileSync = new ProfileSyncService();
