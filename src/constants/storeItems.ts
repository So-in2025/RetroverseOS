export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'filter' | 'skin' | 'effect';
  value: string;
}

export const STORE_ITEMS: StoreItem[] = [
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
  {
    id: 'filter-matrix',
    name: 'Matrix Digital',
    description: 'Todo es código. Tinte verde y lluvia digital.',
    price: 1200,
    category: 'filter',
    value: 'matrix'
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
  },
  {
    id: 'skin-carbon',
    name: 'Fibra de Carbono',
    description: 'Ligero, resistente y táctico.',
    price: 1500,
    category: 'skin',
    value: 'carbon'
  },
  {
    id: 'skin-translucent',
    name: 'Púrpura Translúcido',
    description: 'Nostalgia pura de los años 90.',
    price: 2000,
    category: 'skin',
    value: 'translucent'
  }
];
