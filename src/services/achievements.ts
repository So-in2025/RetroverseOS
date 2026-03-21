import { storage } from './storage';
import { economy } from './economy';

export type AchievementRarity = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'combat' | 'economy' | 'social' | 'exploration' | 'mastery';
  rarity: AchievementRarity;
  reward: number; // RetroCoins reward
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_boot',
    title: 'System Online',
    description: 'Boot Retroverse for the first time.',
    icon: 'Power',
    category: 'exploration',
    rarity: 'bronze',
    reward: 50
  },
  {
    id: 'first_match',
    title: 'Combat Ready',
    description: 'Enter your first game match.',
    icon: 'Swords',
    category: 'combat',
    rarity: 'bronze',
    reward: 100
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Play a game between 2 AM and 5 AM.',
    icon: 'Moon',
    category: 'exploration',
    rarity: 'silver',
    reward: 250
  },
  {
    id: 'save_scummer',
    title: 'Time Traveler',
    description: 'Load a save state 5 times in a single session.',
    icon: 'History',
    category: 'mastery',
    rarity: 'silver',
    reward: 150
  },
  {
    id: 'ai_tactician',
    title: 'AI Tactician',
    description: 'Request tactical advice from the AI Coach.',
    icon: 'BrainCircuit',
    category: 'combat',
    rarity: 'bronze',
    reward: 100
  },
  {
    id: 'capitalist',
    title: 'Retroverse Capitalist',
    description: 'Accumulate your first 5,000 RetroCoins.',
    icon: 'Coins',
    category: 'economy',
    rarity: 'gold',
    reward: 1000
  },
  {
    id: 'collector',
    title: 'The Collector',
    description: 'Purchase your first item from the Marketplace.',
    icon: 'ShoppingBag',
    category: 'economy',
    rarity: 'silver',
    reward: 200
  },
  {
    id: 'social_link',
    title: 'Social Link',
    description: 'Send a message in multiplayer chat.',
    icon: 'MessageSquare',
    category: 'social',
    rarity: 'bronze',
    reward: 50
  },
  {
    id: 'arcade_master',
    title: 'Arcade Master',
    description: 'Play 10 different games.',
    icon: 'Gamepad2',
    category: 'mastery',
    rarity: 'gold',
    reward: 500
  },
  {
    id: 'console_unlocker',
    title: 'Console Unlocker',
    description: 'Unlock your first premium console.',
    icon: 'Monitor',
    category: 'economy',
    rarity: 'silver',
    reward: 300
  },
  {
    id: 'pack_collector',
    title: 'Pack Collector',
    description: 'Purchase a game pack from the marketplace.',
    icon: 'Package',
    category: 'economy',
    rarity: 'silver',
    reward: 200
  },
  {
    id: 'marathon_gamer',
    title: 'Marathon Gamer',
    description: 'Play for a total of 60 minutes.',
    icon: 'Clock',
    category: 'mastery',
    rarity: 'gold',
    reward: 500
  },
  {
    id: 'retro_fanatic',
    title: 'Retro Fanatic',
    description: 'Play games from 5 different systems.',
    icon: 'LayoutGrid',
    category: 'exploration',
    rarity: 'silver',
    reward: 300
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    description: 'Spend a total of 10,000 RetroCoins.',
    icon: 'Zap',
    category: 'economy',
    rarity: 'gold',
    reward: 1000
  },
  {
    id: 'completionist',
    title: 'Completionist',
    description: 'Have 50 games in your library.',
    icon: 'Star',
    category: 'mastery',
    rarity: 'gold',
    reward: 1000
  },
  {
    id: 'perfectionist',
    title: 'Platinum Trophy',
    description: 'Unlock all other achievements.',
    icon: 'Crown',
    category: 'mastery',
    rarity: 'platinum',
    reward: 5000
  }
];

type AchievementUnlockHandler = (achievement: Achievement) => void;

export class AchievementService {
  private unlockedIds: Set<string> = new Set();
  private handlers: Set<AchievementUnlockHandler> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    const unlocked = await storage.getUnlockedAchievements();
    unlocked.forEach(id => this.unlockedIds.add(id));
    this.initialized = true;
    
    // Check for "first_boot" immediately
    this.unlock('first_boot');
  }

  public onUnlock(handler: AchievementUnlockHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public async unlock(id: string) {
    if (!this.initialized) {
      // Wait for initialization if called too early
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (this.initialized) {
            clearInterval(check);
            resolve(null);
          }
        }, 50);
      });
    }

    if (this.unlockedIds.has(id)) return;

    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (!achievement) return;

    this.unlockedIds.add(id);
    await storage.saveAchievement({ id, unlockedAt: new Date().toISOString() });
    
    // Sync to cloud if enabled
    import('./supabase').then(({ supabase }) => {
      if (supabase) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            import('./profileSyncService').then(({ profileSync }) => {
              profileSync.syncProfile(user.id);
            });
          }
        });
      }
    });

    // Grant Reward
    if (achievement.reward > 0) {
      await economy.addCoins(achievement.reward, `Achievement Unlocked: ${achievement.title}`);
    }
    
    // Notify listeners
    this.handlers.forEach(handler => handler(achievement));
    console.log(`[Achievements] Unlocked: ${achievement.title} (+${achievement.reward} RC)`);

    // Check for Platinum
    this.checkPlatinum();
  }

  private async checkPlatinum() {
    if (this.unlockedIds.has('perfectionist')) return;
    
    const allOthersUnlocked = ACHIEVEMENTS.every(a => a.id === 'perfectionist' || this.unlockedIds.has(a.id));
    if (allOthersUnlocked) {
      await this.unlock('perfectionist');
    }
  }

  public isUnlocked(id: string): boolean {
    return this.unlockedIds.has(id);
  }

  public getProgress(): number {
    return (this.unlockedIds.size / ACHIEVEMENTS.length) * 100;
  }

  public getUnlockedCount(): number {
    return this.unlockedIds.size;
  }

  public getTotalCount(): number {
    return ACHIEVEMENTS.length;
  }
  
  public getAllAchievements(): (Achievement & { unlocked: boolean, unlockedAt?: string })[] {
    // We would ideally fetch the actual unlocked dates from storage, but for now we just map the boolean
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: this.unlockedIds.has(a.id)
    }));
  }
}

export const achievements = new AchievementService();
