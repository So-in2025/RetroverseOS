import { GameObject, MetadataNormalizationEngine, ELITE_TOP_20 } from './metadataNormalization';
import { storage } from './storage';
import { INITIAL_GAMES } from './initialGames';
import { FULL_CATALOG } from './catalogManager';
import { customization } from './customization';

const PREMIUM_SYSTEMS = ['psx', 'n64', 'gba', 'ps2'];

const GAME_PACKS: Record<string, string[]> = {
  'pack_elite_arcade': [
    'Metal Slug', 'Street Fighter II', 'Pac-Man', 'Donkey Kong', 'Galaga', 
    'Dig Dug', 'Frogger', 'Asteroids', 'Centipede', 'Mortal Kombat'
  ],
  'pack_rpg_legends': [
    'Final Fantasy', 'Chrono Trigger', 'Dragon Quest', 'Secret of Mana', 
    'EarthBound', 'Phantasy Star', 'Breath of Fire', 'Suikoden', 'Xenogears'
  ]
};

class GameCatalogService {
  private games: Map<string, GameObject> = new Map();
  private isInitialized = false;

  constructor() {
    // Initialization is now async, call init() before using
  }

  private favorites: Set<string> = new Set();

  async init() {
    if (this.isInitialized) return;
    
    // Safety timeout to prevent blocking the app if storage hangs
    const timeoutId = setTimeout(() => {
      if (!this.isInitialized) {
        console.warn('[GameCatalog] Initialization taking too long. Proceeding with partial state.');
        this.isInitialized = true;
      }
    }, 10000);

    try {
      // Load Favorites
      const savedFavorites = await storage.getSetting('favorites');
      if (savedFavorites && Array.isArray(savedFavorites)) {
        this.favorites = new Set(savedFavorites);
      }
      
      // Force refresh for OMEGA SET 50K update
      const CATALOG_VERSION = '20'; // Bumped version to force re-seed with improved filters
      const currentVersion = localStorage.getItem('catalog_version');
      
      if (currentVersion !== CATALOG_VERSION) {
        console.log('[GameCatalog] Detected old catalog version. Purging for archive_id extraction...');
        await storage.clearCatalog();
        // DO NOT clear all ROMs, let LRU eviction handle old files.
        // This preserves user downloads across catalog updates.
        localStorage.setItem('catalog_version', CATALOG_VERSION);
      }

      const storedGames = await storage.getCatalogGames();
      
      // Check if catalog has the new 'playable' flag
      const hasNewData = storedGames.some(g => g.playable !== undefined);
      
      // Always inject FULL_CATALOG (The Master Manifest)
      console.log('[GameCatalog] Injecting MASTER MANIFEST (Verified Legends)...');
      await this.addGames(FULL_CATALOG);

      if (storedGames && storedGames.length > 0 && hasNewData) {
        storedGames.forEach(g => {
          // Re-clean title with improved logic
          g.title = MetadataNormalizationEngine.cleanTitle(g.title);
          
          // Filter out suspicious entries that might have slipped in
          const lowerTitle = g.title.toLowerCase();
          const systemNames = ['nes', 'snes', 'gba', 'gbc', 'gb', 'n64', 'psx', 'ps1', 'ps2', 'genesis', 'md', 'atari', '3do', 'mame', 'neogeo'];
          const isSystemName = systemNames.includes(lowerTitle);
          const isTooShort = g.title.length < 2;
          const isEmulator = lowerTitle.includes('ares') || lowerTitle.includes('retroarch') || lowerTitle.includes('emulator');
          
          if (!isSystemName && !isTooShort && !isEmulator) {
            this.games.set(g.game_id, g);
          }
        });
      } else {
        if (storedGames && storedGames.length > 0) {
          await storage.clearCatalog();
        }
        await this.initializeCatalog();
      }
      
      // ACTIVATE AUTONOMOUS INGESTION ENGINE
      this.startAutonomousIngestion();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('[GameCatalog] Initialization error:', error);
      this.isInitialized = true; // Still mark as initialized to unblock
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public hasAccessToSystem(systemId: string): boolean {
    const systemKey = systemId.toLowerCase();
    if (!PREMIUM_SYSTEMS.includes(systemKey)) return true;
    
    if (customization.isRetroPassActive()) return true;
    
    const ownedItems = customization.getOwnedItems();
    return ownedItems.some(id => id === `console_${systemKey}`);
  }

  public isGameLocked(game: GameObject): boolean {
    // Elite Top 20 are ALWAYS unlocked (Teaser)
    const isElite = ELITE_TOP_20.some(title => 
      game.title.toLowerCase().includes(title.toLowerCase())
    );
    if (isElite) return false;

    if (customization.isRetroPassActive()) return false;

    // Check if game belongs to an owned pack
    const ownedItems = customization.getOwnedItems();
    for (const [packId, gameTitles] of Object.entries(GAME_PACKS)) {
      if (ownedItems.includes(packId)) {
        if (gameTitles.some(title => game.title.toLowerCase().includes(title.toLowerCase()))) {
          return false;
        }
      }
    }

    // Check system access
    const systemKey = game.system_id?.toLowerCase() || 'unknown';
    return !this.hasAccessToSystem(systemKey);
  }

  private async initializeCatalog() {
    console.log('[GameCatalog] Seeding catalog with initial tactical data...');
    // Load Initial Games (if any different from static)
    await this.addGames(INITIAL_GAMES);
    // Re-inject static core just in case
    await this.addGames(FULL_CATALOG);
    
    console.log('[GameCatalog] System Ready.');
  }

  // --- AUTONOMOUS INGESTION ENGINE (PHASE 3) ---
  private ingestionInterval: any = null;
  private ingestionSystems = [
    'nes', 'snes', 'sega_genesis', 'gba', 'gbc', 'gb', 'psx', 'n64', 
    'mastersystem', 'gamegear', 'pcengine', 'atari_2600', 'atari_7800', 
    'lynx', 'wonderswan', 'ngp', 'neogeo', 'mame'
  ];
  private currentSystemIndex = 0;
  private currentPages: Record<string, number> = {
    'nes': 1, 'snes': 1, 'sega_genesis': 1, 'gba': 1, 'n64': 1, 'psx': 1, 'ps2': 1, 'atari_2600': 1, 'gbc': 1, 'gb': 1, 'mastersystem': 1, 'gamegear': 1, 'pcengine': 1,
    'atari_7800': 1, 'lynx': 1, 'wonderswan': 1, 'ngp': 1, 'neogeo': 1, 'mame': 1
  };
  private consecutiveEmptyCycles: Record<string, number> = {};

  private async loadIngestionState() {
    const savedState = await storage.getSetting('ingestion_state');
    if (savedState) {
      this.currentSystemIndex = savedState.currentSystemIndex || 0;
      this.currentPages = savedState.currentPages || this.currentPages;
      this.ingestionSystems = savedState.ingestionSystems || this.ingestionSystems;
      this.consecutiveEmptyCycles = savedState.consecutiveEmptyCycles || {};
    }
  }

  private async saveIngestionState() {
    await storage.saveSetting('ingestion_state', {
      currentSystemIndex: this.currentSystemIndex,
      currentPages: this.currentPages,
      ingestionSystems: this.ingestionSystems,
      consecutiveEmptyCycles: this.consecutiveEmptyCycles
    });
  }

  public async startAutonomousIngestion() {
    if (this.ingestionInterval) return;
    console.log('[Autonomous Engine] ACTIVATED. Targeting 20,000+ titles.');
    
    await this.loadIngestionState();

    // Run immediately
    this.runIngestionCycle();

    // Then run every 10 seconds for MASS INGESTION
    this.ingestionInterval = setInterval(() => {
      this.runIngestionCycle();
    }, 10000);
  }

  public stopAutonomousIngestion() {
    if (this.ingestionInterval) {
      clearInterval(this.ingestionInterval);
      this.ingestionInterval = null;
      console.log('[Autonomous Engine] PAUSED.');
    }
  }

  private async runIngestionCycle() {
    if (!this.ingestionSystems || this.ingestionSystems.length === 0) {
      // Silenced repetitive log
      this.stopAutonomousIngestion();
      return;
    }

    // 1. Select Target System
    const system = this.ingestionSystems[this.currentSystemIndex];
    const page = this.currentPages[system];
    
    console.log(`[Autonomous Engine] Ingesting Sector: ${system.toUpperCase()} (Page ${page})...`);

    try {
      // 2. Fetch Data (500 games per cycle for MASSIVE CATALOG growth)
      // LIMIT: Archive.org has a 10,000 results limit for advancedsearch.php
      // With 500 rows, page 20 is the absolute limit.
      if (page > 20) {
        console.log(`[Autonomous Engine] Sector ${system.toUpperCase()} reached deep paging limit. Securing sector.`);
        this.ingestionSystems.splice(this.currentSystemIndex, 1);
        this.currentSystemIndex = this.currentSystemIndex % this.ingestionSystems.length;
        await this.saveIngestionState();
        return;
      }

      const results = await this.search('', system, 200, page);
      
      // 3. Add to Catalog
      const newGames = results.filter(game => !this.games.has(game.game_id));
      if (newGames.length > 0) {
        await this.addGames(newGames);
        this.consecutiveEmptyCycles[system] = 0; // Reset counter if we found something new
      } else {
        this.consecutiveEmptyCycles[system] = (this.consecutiveEmptyCycles[system] || 0) + 1;
      }
      
      console.log(`[Autonomous Engine] Sector ${system.toUpperCase()} Report: ${newGames.length} new artifacts secured. (Consecutive empty: ${this.consecutiveEmptyCycles[system]})`);
      
      // 4. Advance Pointers
      // Only remove system if we get 0 results from the search API itself (not just filtered results)
      // and we've tried multiple times or reached a high page.
      if (results.length === 0 && this.consecutiveEmptyCycles[system] > 3) {
        console.log(`[Autonomous Engine] Sector ${system.toUpperCase()} fully ingested or unreachable.`);
        this.ingestionSystems.splice(this.currentSystemIndex, 1);
        if (this.ingestionSystems.length === 0) {
          this.stopAutonomousIngestion();
          return;
        }
        this.currentSystemIndex = this.currentSystemIndex % this.ingestionSystems.length;
      } else {
        // If we got results, move to next page
        this.currentPages[system] = page + 1;
        this.currentSystemIndex = (this.currentSystemIndex + 1) % this.ingestionSystems.length;
      }
      
      await this.saveIngestionState();

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.warn(`[Autonomous Engine] Sector ${system.toUpperCase()} scan failed:`, errorMsg);
      
      // If it's a deep paging error, secure the sector and move on
      if (errorMsg.includes('DEEP_PAGING')) {
        console.log(`[Autonomous Engine] DEEP_PAGING detected for ${system.toUpperCase()}. Securing sector.`);
        this.ingestionSystems.splice(this.currentSystemIndex, 1);
        if (this.ingestionSystems.length > 0) {
          this.currentSystemIndex = this.currentSystemIndex % this.ingestionSystems.length;
        }
      } else {
        // Move to next system anyway to avoid getting stuck on a failing one
        this.currentSystemIndex = (this.currentSystemIndex + 1) % this.ingestionSystems.length;
      }
      
      await this.saveIngestionState();
    }
  }

  // DEPRECATED: Mass Ingestion Protocol
  // Kept for manual override if needed, but disabled by default
  private async fetchDynamicGames() {
     // Disabled per "RETROVERSE CINEMATIC OVERDRIVE" directive
  }

  private async runDeepScan(systems: string[]) {
    console.log('[GameCatalog] Phase 2: Deep Scan Initiated...');
    
    // Fetch up to 20 pages (2000 games) per system for mass ingestion
    // We will do this recursively to ensure we don't stop until we hit the limit or run out of games
    const MAX_PAGES = 50; 
    
    for (const system of systems) {
      // Trigger recursive fetch for this system
      this.scanSystemRecursive(system, 100, 2, MAX_PAGES); // Start from page 2
      // Small delay between system starts
      await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
    console.log('[GameCatalog] Deep Scan Cycles Started.');
  }

  private async scanSystem(system: string, limit: number, page: number) {
    try {
      console.log(`[GameCatalog] Scanning sector: ${system} (Page ${page})...`);
      const results = await this.search('', system, limit, page); 
      
      const newGames = results.filter(game => !this.games.has(game.game_id));
      if (newGames.length > 0) {
        await this.addGames(newGames);
      }
      console.log(`[GameCatalog] Sector ${system} (Page ${page}) report: ${newGames.length} new artifacts secured.`);
    } catch (e) {
      console.error(`[GameCatalog] Sector ${system} scan failed:`, e);
    }
  }

  private async scanSystemRecursive(system: string, limit: number, page: number, maxPages: number) {
    if (page > maxPages) return;

    try {
      console.log(`[GameCatalog] Scanning sector: ${system} (Page ${page})...`);
      const results = await this.search('', system, limit, page); 
      
      const newGames = results.filter(game => !this.games.has(game.game_id));
      if (newGames.length > 0) {
        await this.addGames(newGames);
      }
      console.log(`[GameCatalog] Sector ${system} (Page ${page}) report: ${newGames.length} new artifacts secured.`);
      
      // If we found games, continue to next page
      if (results.length > 0) {
         // Recursive call for next page
         setTimeout(() => {
             this.scanSystemRecursive(system, limit, page + 1, maxPages);
         }, 2000); // 2 second delay to be polite
      }

    } catch (e) {
      console.error(`[GameCatalog] Sector ${system} scan failed:`, e);
    }
  }

  private listeners: ((games: GameObject[]) => void)[] = [];
  private notifyTimeout: any = null;

  subscribe(listener: (games: GameObject[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    if (this.notifyTimeout) return;
    this.notifyTimeout = setTimeout(() => {
      const allGames = this.getAllGames();
      this.listeners.forEach(l => l(allGames));
      this.notifyTimeout = null;
    }, 1000); // Throttled to 1fps (1s) to prevent UI lock during mass ingestion
  }

  async toggleFavorite(gameId: string) {
    if (this.favorites.has(gameId)) {
      this.favorites.delete(gameId);
    } else {
      this.favorites.add(gameId);
    }
    await storage.saveSetting('favorites', Array.from(this.favorites));
    this.notifyListeners();
  }

  isFavorite(gameId: string): boolean {
    return this.favorites.has(gameId);
  }

  getFavorites(): GameObject[] {
    return this.getAllGames().filter(g => this.favorites.has(g.game_id));
  }

  async addGame(game: GameObject) {
    // Ensure archive_id is present if it's an Archive.org URL
    if (!game.archive_id && game.rom_url.includes('archive.org/download/')) {
      try {
        const parts = game.rom_url.split('archive.org/download/')[1].split('/');
        if (parts.length > 0) {
          game.archive_id = parts[0];
        }
      } catch (e) {}
    }
    
    // Clean title if it looks like a raw filename or has system prefixes
    game.title = MetadataNormalizationEngine.cleanTitle(game.title);
    
    // Set added_at if not present
    if (!game.added_at) {
      game.added_at = Date.now();
    }
    
    this.games.set(game.game_id, game);
    await storage.saveCatalogGame(game);
    this.notifyListeners();
  }

  async addGames(games: GameObject[]) {
    if (games.length === 0) return;
    
    const now = Date.now();
    for (const g of games) {
      // Ensure archive_id is present if it's an Archive.org URL
      if (!g.archive_id && g.rom_url.includes('archive.org/download/')) {
        try {
          const parts = g.rom_url.split('archive.org/download/')[1].split('/');
          if (parts.length > 0) {
            g.archive_id = parts[0];
          }
        } catch (e) {}
      }
      
      // Clean title if it looks like a raw filename or has system prefixes
      g.title = MetadataNormalizationEngine.cleanTitle(g.title);
      
      // Set added_at if not present
      if (!g.added_at) {
        g.added_at = now;
      }
      
      this.games.set(g.game_id, g);
    }
    
    await storage.saveCatalogGames(games);
    this.notifyListeners();
  }

  getGame(gameId: string): GameObject | undefined {
    return this.games.get(gameId);
  }

  getRecentlyAdded(limit: number = 20): GameObject[] {
    return this.getAllGames()
      .filter(g => g.added_at)
      .sort((a, b) => (b.added_at || 0) - (a.added_at || 0))
      .slice(0, limit);
  }

  getAllGames(): GameObject[] {
    return Array.from(this.games.values());
  }

  getEliteTop20(): GameObject[] {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const normalizedElite = ELITE_TOP_20.map(normalize);
    
    // Use FULL_CATALOG as source to ensure we have the legends even before ingestion
    const source = FULL_CATALOG;

    const elite = source.filter(g => {
      const titleNorm = normalize(g.title);
      const isMatch = normalizedElite.some(eliteTitle => 
        titleNorm === eliteTitle || 
        titleNorm.includes(eliteTitle) ||
        eliteTitle.includes(titleNorm)
      );
      return isMatch;
    });

    console.log(`[EliteTop20] Total matches found: ${elite.length}`);

    // Deduplicate by title to ensure exactly 20 if possible
    const uniqueElite = new Map<string, GameObject>();
    elite.forEach(g => {
      const norm = normalize(g.title);
      // Find the best match (exact match preferred)
      if (!uniqueElite.has(norm) || normalize(g.title) === norm) {
        uniqueElite.set(norm, g);
      }
    });

    const result = Array.from(uniqueElite.values());
    console.log(`[EliteTop20] Unique matches: ${result.length}`);

    if (result.length < 20) {
      console.log(`[EliteTop20] Only found ${result.length} matches, filling with others`);
      const others = source.filter(g => !result.some(r => r.game_id === g.game_id));
      result.push(...others.slice(0, 20 - result.length));
    }

    // Sort to match the ELITE_TOP_20 order as closely as possible
    return result.sort((a, b) => {
      const indexA = normalizedElite.findIndex(et => normalize(a.title).includes(et) || et.includes(normalize(a.title)));
      const indexB = normalizedElite.findIndex(et => normalize(b.title).includes(et) || et.includes(normalize(b.title)));
      return indexA - indexB;
    }).slice(0, 20);
  }

  /**
   * Search for games in Archive.org and add them to the catalog temporarily (or permanently if desired).
   * For now, we return them directly, but we could also cache them.
   */
  async search(query: string, system: string = 'All', rows: number = 100, page: number = 1): Promise<GameObject[]> {
    console.log(`[GameCatalog] Searching for "${query}" in system "${system}" (Page ${page})`);
    const results = await MetadataNormalizationEngine.searchArchiveOrg(query, system, rows, page);
    
    // Filter and clean results
    const filteredResults = results.filter(game => {
      // Reject unknown systems immediately
      if (game.system === 'Unknown' || game.emulator_core === 'auto') return false;
      
      if (game.rom_url.startsWith('archive:')) return true;
      
      const ext = game.rom_url.split('.').pop()?.toLowerCase();
      // Only accept common ROM/ISO extensions
      const validExtensions = ['nes', 'sfc', 'smc', 'bin', 'iso', 'gba', 'zip', '7z', 'chd', 'cue', 'n64', 'z64', 'a26', 'a78', 'lnx'];
      
      // Filter out small files (garbage/corrupt)
      // Atari 2600 ROMs are tiny (2KB+), NES are 16KB+, SNES 256KB+
      let minSize = 100 * 1024; // Default 100KB
      if (game.system === 'Atari 2600') minSize = 2 * 1024;
      if (game.system === 'Atari 7800') minSize = 16 * 1024;
      if (game.system === 'Atari Lynx') minSize = 32 * 1024;
      if (game.system === 'NES') minSize = 16 * 1024;
      if (game.system === 'GB' || game.system === 'GBC') minSize = 32 * 1024;

      const isBigEnough = game.rom_size >= minSize;

      return ext && validExtensions.includes(ext) && isBigEnough;
    }).map(game => {
      // Clean title from extensions if present
      game.title = MetadataNormalizationEngine.cleanTitle(game.title);
      
      // Strict mapping check
      if (game.system === 'Genesis') game.emulator_core = 'genesis_plus_gx';
      if (game.system === 'PS2') game.emulator_core = 'play';
      if (game.system === 'N64') game.emulator_core = 'mupen64plus_next';
      
      return game;
    });
    
    return filteredResults;
  }
}

export const gameCatalog = new GameCatalogService();
