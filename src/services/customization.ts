import { storage } from './storage';
import { economy } from './economy';
import { achievements } from './achievements';

export type ItemCategory = 'feature' | 'performance' | 'pack' | 'console';

export interface StoreItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  price: number;
  image: string;
  description: string;
  value?: string;
}

export const STORE_ITEMS: StoreItem[] = [
  // Licencias y Funcionalidad (Features)
  {
    id: 'feature_neural_engine',
    name: 'Neural Engine Copilot',
    category: 'feature',
    rarity: 'Legendary',
    price: 0, // Free but requires BYOK setup
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Desbloquea el Coach de IA y recomendaciones avanzadas (Requiere API Key propia - BYOK).',
    value: 'neural-engine'
  },
  {
    id: 'feature_multiplayer',
    name: 'Licencia Multijugador Pro',
    category: 'feature',
    rarity: 'Legendary',
    price: 5000,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Habilita el acceso a servidores globales para jugar con otros Ronins en tiempo real.',
    value: 'multiplayer'
  },
  {
    id: 'feature_cloud_sync',
    name: 'Sincronización en la Nube',
    category: 'feature',
    rarity: 'Epic',
    price: 3000,
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Guarda tus partidas automáticamente en la red y continúa en cualquier dispositivo.',
    value: 'cloud-sync'
  },
  {
    id: 'feature_save_slots',
    name: 'Expansión de Slots (x10)',
    category: 'feature',
    rarity: 'Rare',
    price: 1500,
    image: 'https://images.unsplash.com/photo-1580234811497-9bd7fd04013e?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Aumenta tu capacidad de guardado local de 3 a 10 slots por juego.',
    value: 'save-slots'
  },

  // Rendimiento y Calidad (Performance)
  {
    id: 'perf_4k_ultra',
    name: 'Motor 4K Ultra HD',
    category: 'performance',
    rarity: 'Legendary',
    price: 8000,
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Desbloquea el renderizado a resolución 4K nativa con filtros de post-procesado avanzado.',
    value: '4k-resolution'
  },
  {
    id: 'perf_low_latency',
    name: 'Modo Latencia Zero',
    category: 'performance',
    rarity: 'Epic',
    price: 2500,
    image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Optimización del kernel de emulación para reducir el input lag a menos de 1ms.',
    value: 'low-latency'
  },

  // Consolas (Acceso a Sistemas)
  {
    id: 'console_psx',
    name: 'Acceso PlayStation 1',
    category: 'console',
    rarity: 'Legendary',
    price: 5000,
    image: 'https://images.unsplash.com/photo-1592155934442-cd18014315b8?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Desbloquea el acceso completo a la biblioteca de PSX en el sistema.',
    value: 'psx'
  },
  {
    id: 'console_ps2',
    name: 'Acceso PlayStation 2',
    category: 'console',
    rarity: 'Legendary',
    price: 10000,
    image: 'https://images.unsplash.com/photo-1526509429168-2e43f01f6b81?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Desbloquea el acceso a la Bóveda Premium de PS2 (Nivel 5 requerido).',
    value: 'ps2'
  },
  {
    id: 'console_n64',
    name: 'Acceso Nintendo 64',
    category: 'console',
    rarity: 'Legendary',
    price: 4500,
    image: 'https://images.unsplash.com/photo-1527176930608-09cb256ab504?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Desbloquea el acceso completo a la biblioteca de N64 en el sistema.',
    value: 'n64'
  },

  // Paquetes de Juegos (Packs)
  {
    id: 'pack_elite_arcade',
    name: 'Elite Arcade Pack',
    category: 'pack',
    rarity: 'Legendary',
    price: 2000,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Los 50 juegos arcade más jugados de la historia desbloqueados.',
    value: 'pack-elite-arcade'
  },
  {
    id: 'pack_rpg_legends',
    name: 'RPG Legends Pack',
    category: 'pack',
    rarity: 'Legendary',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400&h=400',
    description: 'Una colección de los mejores RPGs de 16 y 32 bits.',
    value: 'pack-rpg-legends'
  }
];

class CustomizationService {
  private ownedItems: Set<string> = new Set();
  private retroPassActive = false;
  private equipped: Record<ItemCategory, string | null> = {
    feature: null,
    performance: null,
    pack: null,
    console: null
  };
  private listeners: Set<() => void> = new Set();

  async init() {
    const savedOwned = await storage.getSetting('owned_items') || [];
    this.ownedItems = new Set(savedOwned);

    const savedEquipped = await storage.getSetting('equipped_items') || {};
    this.equipped = { ...this.equipped, ...savedEquipped };

    const pass = await storage.getSetting('retro_pass_active');
    this.retroPassActive = !!pass;
    
    this.notifyListeners();
  }

  getOwnedItems(): string[] {
    return Array.from(this.ownedItems);
  }

  hasItem(itemId: string): boolean {
    return this.ownedItems.has(itemId);
  }

  isRetroPassActive(): boolean {
    return this.retroPassActive;
  }

  async hasRetroPass(): Promise<boolean> {
    return this.retroPassActive;
  }

  async hasFeature(featureId: string): Promise<boolean> {
    if (this.retroPassActive) return true;
    return this.ownedItems.has(featureId);
  }

  async getMaxSaveSlots(): Promise<number> {
    return (await this.hasFeature('feature_save_slots')) ? 10 : 3;
  }

  async isCloudSyncEnabled(): Promise<boolean> {
    return await this.hasFeature('feature_cloud_sync');
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

    return true;
  }

  async equipItem(category: ItemCategory, itemId: string | null) {
    if (itemId && !this.ownedItems.has(itemId)) return;

    this.equipped[category] = itemId;
    await storage.saveSetting('equipped_items', this.equipped);
    
    this.notifyListeners();

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
  }

  private applyTheme(themeId: string | null) {
    // Legacy theme support removed
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
