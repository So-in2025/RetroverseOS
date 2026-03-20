import { storage } from './storage';
import { economy } from './economy';
import { achievements } from './achievements';

export type ItemCategory = 'theme' | 'bezel' | 'avatar' | 'voice' | 'pack';

export interface StoreItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  price: number;
  image: string;
  description: string;
  value?: string; // e.g., 'crt-blue', 'voice-zephyr', 'theme-neon'
}

export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'theme_neon',
    name: 'Neon Cyberpunk Theme',
    category: 'theme',
    rarity: 'Epic',
    price: 1500,
    image: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'A dark, neon-infused UI theme for the entire Retroverse.',
    value: 'theme-neon'
  },
  {
    id: 'bezel_arcade',
    name: 'Classic Arcade Cabinet',
    category: 'bezel',
    rarity: 'Rare',
    price: 800,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Wraps your game screen in a classic wooden arcade cabinet bezel.',
    value: 'bezel-arcade'
  },
  {
    id: 'bezel_gameboy',
    name: 'Handheld Console Bezel',
    category: 'bezel',
    rarity: 'Legendary',
    price: 2000,
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Play your games inside a retro handheld console frame.',
    value: 'bezel-gameboy'
  },
  {
    id: 'avatar_glitch',
    name: 'Glitch Entity Avatar',
    category: 'avatar',
    rarity: 'Epic',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'An animated glitch avatar frame for your profile.',
    value: 'avatar-glitch'
  },
  {
    id: 'voice_zephyr',
    name: 'Tactical Commander (Zephyr)',
    category: 'voice',
    rarity: 'Epic',
    price: 850,
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Replaces default AI Coach voice with a stern, tactical commander.',
    value: 'Zephyr'
  },
  {
    id: 'pack_fighting',
    name: 'Fighting Classics Pack',
    category: 'pack',
    rarity: 'Legendary',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Unlock premium fighting games in the library.',
    value: 'pack-fighting'
  }
];

class CustomizationService {
  private ownedItems: Set<string> = new Set();
  private equipped: Record<ItemCategory, string | null> = {
    theme: null,
    bezel: null,
    avatar: null,
    voice: 'Kore',
    pack: null
  };
  private listeners: Set<() => void> = new Set();

  async init() {
    const savedOwned = await storage.getSetting('owned_items') || [];
    this.ownedItems = new Set(savedOwned);

    const savedEquipped = await storage.getSetting('equipped_items') || {};
    this.equipped = { ...this.equipped, ...savedEquipped };
    
    this.applyTheme(this.equipped.theme);
  }

  getOwnedItems(): string[] {
    return Array.from(this.ownedItems);
  }

  getEquipped(category: ItemCategory): string | null {
    return this.equipped[category];
  }

  async buyItem(itemId: string): Promise<boolean> {
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    if (this.ownedItems.has(itemId)) return false;

    const success = await economy.spendCoins(item.price, `Purchased ${item.name}`);
    if (success) {
      this.ownedItems.add(itemId);
      await storage.saveSetting('owned_items', Array.from(this.ownedItems));
      achievements.unlock('collector');
      this.notifyListeners();
      return true;
    }
    return false;
  }

  async grantItem(itemId: string): Promise<boolean> {
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    if (this.ownedItems.has(itemId)) return false;

    this.ownedItems.add(itemId);
    await storage.saveSetting('owned_items', Array.from(this.ownedItems));
    achievements.unlock('collector');
    this.notifyListeners();
    return true;
  }

  async equipItem(category: ItemCategory, itemId: string | null) {
    if (itemId && !this.ownedItems.has(itemId)) return;

    this.equipped[category] = itemId;
    await storage.saveSetting('equipped_items', this.equipped);
    
    if (category === 'theme') {
      this.applyTheme(itemId);
    }

    this.notifyListeners();
  }

  private applyTheme(themeId: string | null) {
    if (themeId === 'theme-neon') {
      document.documentElement.classList.add('theme-neon');
    } else {
      document.documentElement.classList.remove('theme-neon');
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

export const customization = new CustomizationService();
