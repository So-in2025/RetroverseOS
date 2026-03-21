export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'filter' | 'skin' | 'effect' | 'console' | 'pack';
  value: string;
  image?: string;
}

export const STORE_ITEMS: StoreItem[] = [
  // Consolas (Desbloqueables)
  {
    id: 'console-psx',
    name: 'PlayStation 1',
    description: 'Desbloquea el acceso completo a la biblioteca de PSX.',
    price: 5000,
    category: 'console',
    value: 'psx',
    image: 'https://images.unsplash.com/photo-1592155934442-cd18014315b8?w=400&h=400&fit=crop'
  },
  {
    id: 'console-n64',
    name: 'Nintendo 64',
    description: 'Desbloquea el acceso completo a la biblioteca de N64.',
    price: 4500,
    category: 'console',
    value: 'n64',
    image: 'https://images.unsplash.com/photo-1527176930608-09cb256ab504?w=400&h=400&fit=crop'
  },
  {
    id: 'console-gba',
    name: 'Game Boy Advance',
    description: 'Desbloquea el acceso completo a la biblioteca de GBA.',
    price: 3000,
    category: 'console',
    value: 'gba',
    image: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&h=400&fit=crop'
  },
  // Paquetes de Juegos
  {
    id: 'pack-elite-arcade',
    name: 'Elite Arcade Pack',
    description: 'Los 50 juegos arcade más jugados de la historia.',
    price: 2000,
    category: 'pack',
    value: 'elite_arcade',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=400&fit=crop'
  },
  {
    id: 'pack-rpg-legends',
    name: 'RPG Legends Pack',
    description: 'Una colección de los mejores RPGs de 16 y 32 bits.',
    price: 3500,
    category: 'pack',
    value: 'rpg_legends',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop'
  },
  // Filters
  {
    id: 'filter-classic',
    name: 'CRT Clásico',
    description: 'El look original de las máquinas arcade.',
    price: 0,
    category: 'filter',
    value: 'classic'
  },
  {
    id: 'filter-cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Colores vibrantes y aberración cromática intensa.',
    price: 500,
    category: 'filter',
    value: 'cyberpunk'
  },
  {
    id: 'filter-vhs',
    name: 'VHS Glitch',
    description: 'Efecto de cinta vieja con ruido y tracking.',
    price: 800,
    category: 'filter',
    value: 'vhs'
  },
  // Skins
  {
    id: 'skin-default',
    name: 'Estándar',
    description: 'El diseño original de RetroVerse.',
    price: 0,
    category: 'skin',
    value: 'default'
  },
  {
    id: 'skin-gold',
    name: 'Oro Puro',
    description: 'Para los jugadores con más clase.',
    price: 2500,
    category: 'skin',
    value: 'gold'
  }
];
