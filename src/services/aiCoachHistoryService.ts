import { supabase } from './supabase';
import { storage } from './storage';
import { customization } from './customization';

export interface CoachAdvice {
  id: string;
  game_id: string;
  advice: string;
  timestamp: string;
  screenshot?: string; // Optional: store small thumbnail
}

class AICoachHistoryService {
  private history: CoachAdvice[] = [];
  private listeners: Set<() => void> = new Set();

  async init() {
    const saved = await storage.getSetting('ai_coach_history') || [];
    this.history = saved;
  }

  getHistory(): CoachAdvice[] {
    return this.history;
  }

  async addAdvice(gameId: string, advice: string, screenshot?: string) {
    const newAdvice: CoachAdvice = {
      id: crypto.randomUUID(),
      game_id: gameId,
      advice,
      timestamp: new Date().toISOString(),
      screenshot
    };

    this.history.unshift(newAdvice);
    // Keep only last 50 entries
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }

    await storage.saveSetting('ai_coach_history', this.history);
    this.notifyListeners();

    // Sync to cloud if enabled
    const hasCloudSync = await customization.isCloudSyncEnabled();
    if (hasCloudSync && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('coach_history').upsert({
          user_id: user.id,
          advice_id: newAdvice.id,
          game_id: newAdvice.game_id,
          advice: newAdvice.advice,
          timestamp: newAdvice.timestamp,
          screenshot: newAdvice.screenshot
        });
        if (error) console.error('[AICoachHistory] Cloud sync error:', error);
      }
    }
  }

  async pullHistory(userId: string) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('coach_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[AICoachHistory] Error pulling history:', error);
      return;
    }

    if (data) {
      this.history = data.map(d => ({
        id: d.advice_id,
        game_id: d.game_id,
        advice: d.advice,
        timestamp: d.timestamp,
        screenshot: d.screenshot
      }));
      await storage.saveSetting('ai_coach_history', this.history);
      this.notifyListeners();
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export const aiCoachHistory = new AICoachHistoryService();
