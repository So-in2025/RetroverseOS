import { storage } from './storage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'combat' | 'economy' | 'social' | 'exploration';
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_boot',
    title: 'System Online',
    description: 'Boot Retroverse for the first time.',
    icon: 'Power',
    category: 'exploration'
  },
  {
    id: 'first_match',
    title: 'Combat Ready',
    description: 'Enter your first game match.',
    icon: 'Swords',
    category: 'combat'
  },
  {
    id: 'ai_tactician',
    title: 'AI Tactician',
    description: 'Request tactical advice from the AI Coach.',
    icon: 'BrainCircuit',
    category: 'combat'
  },
  {
    id: 'capitalist',
    title: 'Retroverse Capitalist',
    description: 'Earn your first 1000 credits.',
    icon: 'Coins',
    category: 'economy'
  },
  {
    id: 'collector',
    title: 'The Collector',
    description: 'Purchase your first item from the Marketplace.',
    icon: 'ShoppingBag',
    category: 'economy'
  },
  {
    id: 'social_link',
    title: 'Social Link',
    description: 'Send a message in multiplayer chat.',
    icon: 'MessageSquare',
    category: 'social'
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
    
    // Notify listeners
    this.handlers.forEach(handler => handler(achievement));
    console.log(`[Achievements] Unlocked: ${achievement.title}`);
  }

  public isUnlocked(id: string): boolean {
    return this.unlockedIds.has(id);
  }

  public getProgress(): number {
    return (this.unlockedIds.size / ACHIEVEMENTS.length) * 100;
  }
}

export const achievements = new AchievementService();
