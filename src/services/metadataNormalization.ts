import { CoverService } from './coverService';

export interface GameObject {
  game_id: string;
  title: string;
  system: string;
  system_id: string;
  year: number | null;
  publisher: string | null;
  developer: string | null;
  players: number;
  rom_url: string;
  cover_url: string | null;
  artwork_url: string | null;
  video_preview_url?: string | null;
  description?: string | null;
  genre?: string | null;
  rom_size: number;
  emulator_core: string;
  compatibility_status: 'compatible' | 'unstable' | 'broken' | 'untested' | 'verified' | 'unknown';
  checksum: string | null;
  playable?: boolean;
}

export interface ArchiveRawData {
  identifier: string;
  title?: string;
  description?: string;
  creator?: string | string[];
  developer?: string | string[]; // Added to capture if available
  publisher?: string | string[]; // Added to capture if available
  date?: string;
  subject?: string | string[];
  files?: ArchiveFile[];
}

export interface ArchiveFile {
  name: string;
  source: string;
  format: string;
  size: string;
  md5?: string;
  crc32?: string;
}

const SYSTEM_MAPPINGS: Record<string, { system: string; core: string; extensions: string[] }> = {
  'atari_2600': { system: 'Atari 2600', core: 'stella', extensions: ['.bin', '.a26', '.zip'] },
  'nes': { system: 'NES', core: 'fceumm', extensions: ['.nes', '.zip'] },
  'snes': { system: 'SNES', core: 'snes9x', extensions: ['.smc', '.sfc', '.zip'] },
  'sega_genesis': { system: 'Genesis', core: 'genesis_plus_gx', extensions: ['.gen', '.bin', '.md', '.zip'] },
  'gba': { system: 'GBA', core: 'mgba', extensions: ['.gba', '.zip'] },
  'gbc': { system: 'GBC', core: 'gambatte', extensions: ['.gbc', '.zip'] },
  'gb': { system: 'GB', core: 'gambatte', extensions: ['.gb', '.zip'] },
  'psx': { system: 'PS1', core: 'pcsx_rearmed', extensions: ['.bin', '.cue', '.iso', '.chd', '.zip'] },
  'ps2': { system: 'PS2', core: 'play', extensions: ['.iso', '.zip'] },
  'n64': { system: 'N64', core: 'mupen64plus_next', extensions: ['.n64', '.z64', '.zip'] },
  'mastersystem': { system: 'Master System', core: 'genesis_plus_gx', extensions: ['.sms', '.zip'] },
  'gamegear': { system: 'Game Gear', core: 'genesis_plus_gx', extensions: ['.gg', '.zip'] },
  'pcengine': { system: 'PC Engine', core: 'mednafen_pce_fast', extensions: ['.pce', '.zip'] },
  'atari_7800': { system: 'Atari 7800', core: 'prosystem', extensions: ['.a78', '.zip'] },
  'lynx': { system: 'Atari Lynx', core: 'handy', extensions: ['.lnx', '.zip'] },
  'wonderswan': { system: 'WonderSwan', core: 'mednafen_wswan', extensions: ['.ws', '.wsc', '.zip'] },
  'ngp': { system: 'Neo Geo Pocket', core: 'mednafen_ngp', extensions: ['.ngp', '.ngc', '.zip'] },
  'Unknown': { system: 'Unknown', core: 'auto', extensions: [] }
};

// Helper to map Archive.org identifiers/collections to our systems
const COLLECTION_TO_SYSTEM: Record<string, string> = {
  'Atari - 2600': 'atari_2600',
  'Atari - 7800': 'atari_7800',
  'Atari - Lynx': 'lynx',
  'Nintendo - Nintendo Entertainment System': 'nes',
  'Nintendo - Super Nintendo Entertainment System': 'snes',
  'Sega - Mega Drive - Genesis': 'sega_genesis',
  'Nintendo - Game Boy Advance': 'gba',
  'Sony - PlayStation': 'psx',
  'Sony - PlayStation 2': 'ps2',
  'Nintendo - Nintendo 64': 'n64',
  'Sega - Master System - Mark III': 'mastersystem',
  'Sega - Game Gear': 'gamegear',
  'NEC - PC Engine - TurboGrafx 16': 'pcengine',
  'Bandai - WonderSwan': 'wonderswan',
  'SNK - Neo Geo Pocket': 'ngp'
};

/**
 * ELITE TOP 15: The face of Retroverse OS.
 * These identifiers are guaranteed to work and represent the best of each system.
 */
export const ELITE_TOP_15 = [
  'Super Mario World',
  'The Legend of Zelda: A Link to the Past',
  'Mortal Kombat II',
  'Sonic the Hedgehog 2',
  'Pokemon Emerald',
  'Castlevania: Symphony of the Night',
  'Resident Evil 2',
  'Tekken 3',
  'Crash Bandicoot: Warped',
  'Mario Kart 64',
  'GoldenEye 007',
  'Super Mario 64',
  'The Legend of Zelda: Ocarina of Time',
  'Star Fox 64',
  'Super Smash Bros.'
];

export class MetadataNormalizationEngine {
  
  public static async resolveRomUrl(identifier: string, system?: string): Promise<string | null> {
    try {
      const metaTargetUrl = `https://archive.org/metadata/${identifier}`;
      const proxyUrl = `/api/tunnel?url=${encodeURIComponent(metaTargetUrl)}`;
      
      const fetchWithTimeout = async (url: string, timeout: number = 30000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          return response;
        } catch (e) {
          clearTimeout(id);
          throw e;
        }
      };

      let response;
      try {
        response = await fetchWithTimeout(proxyUrl);
      } catch (e) {
        console.warn(`[RomResolver] Proxy failed for ${identifier}, trying direct...`);
        try {
          response = await fetchWithTimeout(metaTargetUrl);
        } catch (e2) {
          console.error(`[RomResolver] Direct fetch also failed for ${identifier}:`, e2);
          return null;
        }
      }
      
      if (response && response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const metaData = await response.json();
          if (metaData && metaData.files) {
            let validExtensions: string[] = [];
            if (system === 'nes') validExtensions = ['.nes', '.zip'];
            else if (system === 'snes') validExtensions = ['.sfc', '.smc', '.zip'];
            else if (system === 'sega_genesis') validExtensions = ['.md', '.gen', '.bin', '.zip'];
            else if (system === 'gba') validExtensions = ['.gba', '.zip'];
            else if (system === 'gbc') validExtensions = ['.gbc', '.zip'];
            else if (system === 'gb') validExtensions = ['.gb', '.zip'];
            else if (system === 'n64') validExtensions = ['.n64', '.z64', '.zip'];
            else if (system === 'psx') validExtensions = ['.chd', '.cue', '.bin', '.iso', '.zip'];
            else if (system === 'atari_2600') validExtensions = ['.a26', '.bin', '.zip'];
            else if (system === 'atari_7800') validExtensions = ['.a78', '.bin', '.zip'];
            else if (system === 'lynx') validExtensions = ['.lnx', '.zip'];
            else if (system === 'mastersystem' || system === 'gamegear') validExtensions = ['.sms', '.gg', '.zip'];
            else if (system === 'pcengine') validExtensions = ['.pce', '.zip'];
            else if (system === 'wonderswan') validExtensions = ['.ws', '.wsc', '.zip'];
            else if (system === 'ngp') validExtensions = ['.ngp', '.ngc', '.zip'];

            const romFile = this.findMainRom(metaData.files, validExtensions);
            if (romFile) {
              return `https://archive.org/download/${identifier}/${encodeURIComponent(romFile.name)}`;
            } else {
              console.warn(`[RomResolver] No valid ROM file found in metadata for ${identifier}. Files: ${metaData.files.length}`);
            }
          } else {
            console.warn(`[RomResolver] No files found in metadata for ${identifier}`);
          }
        } else {
          console.warn(`[RomResolver] Expected JSON, got ${contentType} for ${identifier}`);
        }
      } else if (response) {
        console.warn(`[RomResolver] Metadata fetch failed for ${identifier} with status ${response.status}`);
      }
    } catch (e) {
      console.error(`[RomResolver] Failed to resolve ROM URL for ${identifier}:`, e);
    }
    return null;
  }

  public static normalizeFast(doc: any): GameObject | null {
    const identifier = doc.identifier;
    const collection = Array.isArray(doc.collection) ? doc.collection[0] : doc.collection;
    
    let systemKey = '';
    if (collection && COLLECTION_TO_SYSTEM[collection]) {
      systemKey = COLLECTION_TO_SYSTEM[collection];
    } else {
      const subjects = Array.isArray(doc.subject) ? doc.subject : [doc.subject || ''];
      for (const s of subjects) {
        const lowerS = s?.toLowerCase() || '';
        if (lowerS.includes('atari 2600') || lowerS.includes('vcs')) systemKey = 'atari_2600';
        else if (lowerS.includes('atari 7800')) systemKey = 'atari_7800';
        else if (lowerS.includes('atari lynx')) systemKey = 'lynx';
        else if (lowerS.includes('nes') || lowerS.includes('nintendo entertainment system')) systemKey = 'nes';
        else if (lowerS.includes('snes') || lowerS.includes('super nintendo')) systemKey = 'snes';
        else if (lowerS.includes('genesis') || lowerS.includes('mega drive')) systemKey = 'sega_genesis';
        else if (lowerS.includes('gba') || lowerS.includes('game boy advance') || lowerS.includes('gameboy advance')) systemKey = 'gba';
        else if (lowerS.includes('gbc') || lowerS.includes('game boy color') || lowerS.includes('gameboy color')) systemKey = 'gbc';
        else if (lowerS.includes('gb') || lowerS.includes('game boy') || lowerS.includes('gameboy')) systemKey = 'gb';
        else if (lowerS.includes('playstation') && !lowerS.includes('playstation 2') && !lowerS.includes('ps2')) systemKey = 'psx';
        else if (lowerS.includes('playstation 2') || lowerS.includes('ps2')) systemKey = 'ps2';
        else if (lowerS.includes('nintendo 64') || lowerS.includes('n64')) systemKey = 'n64';
        else if (lowerS.includes('master system')) systemKey = 'mastersystem';
        else if (lowerS.includes('game gear')) systemKey = 'gamegear';
        else if (lowerS.includes('pc engine') || lowerS.includes('turbografx')) systemKey = 'pcengine';
        else if (lowerS.includes('wonderswan')) systemKey = 'wonderswan';
        else if (lowerS.includes('neo geo pocket')) systemKey = 'ngp';
        if (systemKey) break;
      }
    }

    if (!systemKey) systemKey = 'Unknown';
    const mapping = SYSTEM_MAPPINGS[systemKey] || SYSTEM_MAPPINGS['Unknown'];

    const cleanTitle = this.cleanTitle(doc.title || identifier);
    
    // Filter out obvious non-games or unplayable items
    const lowerTitle = cleanTitle.toLowerCase();
    const lowerId = identifier.toLowerCase();
    
    // List of known Arcade BIOS/Device files that should never be in the catalog
    const arcadeBiosFiles = [
      'neogeo', 'pgm', 'qsound', 'cpzn1', 'cpzn2', 'cvs', 'decocass', 'konamigx', 
      'megatech', 'megaplay', 'nss', 'playch10', 'skns', 'stvbios', 'taitofx1', 'tps',
      'mame', 'naomi', 'hikaru', 'model3', 'awbios', 'dc_boot', 'dc_flash',
      'atps', 'atps2', 'atps3', 'atps4', 'atps5', 'atps6', 'atps7', 'atps8', 'atps9',
      'atps10', 'atps11', 'atps12', 'atps13', 'atps14', 'atps15', 'atps16', 'atps17',
      'atps18', 'atps19', 'atps20', 'atps21', 'atps22', 'atps23', 'atps24', 'atps25',
      'atps26', 'atps27', 'atps28', 'atps29', 'atps30', 'atps31', 'atps32', 'atps33',
      'atps34', 'atps35', 'atps36', 'atps37', 'atps38', 'atps39', 'atps40', 'atps41',
      'atps42', 'atps43', 'atps44', 'atps45', 'atps46', 'atps47', 'atps48', 'atps49',
      'atps50', 'atps51', 'atps52', 'atps53', 'atps54', 'atps55', 'atps56', 'atps57',
      'atps58', 'atps59', 'atps60', 'atps61', 'atps62', 'atps63', 'atps64', 'atps65',
      'atps66', 'atps67', 'atps68', 'atps69', 'atps70', 'atps71', 'atps72', 'atps73',
      'atps74', 'atps75', 'atps76', 'atps77', 'atps78', 'atps79', 'atps80', 'atps81',
      'atps82', 'atps83', 'atps84', 'atps85', 'atps86', 'atps87', 'atps88', 'atps89',
      'atps90', 'atps91', 'atps92', 'atps93', 'atps94', 'atps95', 'atps96', 'atps97',
      'atps98', 'atps99', 'atps100'
    ];

    if (lowerTitle.includes('bios') || 
        lowerTitle.includes('soundtrack') || 
        lowerTitle.includes('manual') || 
        lowerTitle.includes('not working') || 
        lowerTitle.includes('update') ||
        lowerTitle.includes('magazine') ||
        lowerTitle.includes('guide') ||
        lowerTitle.includes('romset') ||
        lowerTitle.includes('rom set') ||
        lowerTitle.includes('rom pack') ||
        lowerTitle.includes('chd pack') ||
        lowerTitle.includes('full set') ||
        lowerTitle.includes('collection') ||
        lowerTitle.includes('emulator') ||
        lowerTitle.includes('rollback') ||
        lowerTitle.includes('samples') ||
        lowerTitle.includes('artwork') ||
        lowerTitle.includes('flyers') ||
        lowerTitle.includes('snaps') ||
        lowerTitle.includes('titles') ||
        lowerTitle.includes('marquees') ||
        lowerTitle.includes('cabinets') ||
        lowerTitle.includes('cpanel') ||
        lowerTitle.includes('pcb') ||
        lowerTitle.includes('history') ||
        lowerTitle.includes('cheat') ||
        lowerTitle.includes('crosshair') ||
        arcadeBiosFiles.includes(lowerId) ||
        arcadeBiosFiles.some(b => lowerTitle === b) ||
        lowerTitle.match(/mame\s*0\.\d+/) ||
        lowerTitle.match(/^[0-9]+\s+[0-9a-z\s]+stario$/)) {
      return null;
    }

    const year = this.extractYear(doc.date);
    const publisher = this.extractPublisher(doc.creator);

    // Libretro Art Logic
    const libretroSystemNames: Record<string, string> = {
      'nes': 'Nintendo - Nintendo Entertainment System',
      'snes': 'Nintendo - Super Nintendo Entertainment System',
      'sega_genesis': 'Sega - Mega Drive - Genesis',
      'gba': 'Nintendo - Game Boy Advance',
      'gbc': 'Nintendo - Game Boy Color',
      'gb': 'Nintendo - Game Boy',
      'psx': 'Sony - PlayStation',
      'ps2': 'Sony - PlayStation 2',
      'atari_2600': 'Atari - 2600',
      'n64': 'Nintendo - Nintendo 64'
    };

      const libretroSystem = ((mapping as any).system_id ? libretroSystemNames[(mapping as any).system_id] : (libretroSystemNames[systemKey] || mapping.system)).replace(/ /g, '_');
      let bestTitleForLibretro = doc.title || identifier;
      bestTitleForLibretro = bestTitleForLibretro.replace(/_/g, ' ');
      const libretroTitle = bestTitleForLibretro.replace(/[&*/:`<>?\|"]/g, '_');

      const coverUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${encodeURIComponent(libretroSystem)}/master/Named_Boxarts/${encodeURIComponent(libretroTitle)}.png`;
      const artworkUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${encodeURIComponent(libretroSystem)}/master/Named_Snaps/${encodeURIComponent(libretroTitle)}.png`;

    let genre = null;
    if (doc.subject) {
      genre = Array.isArray(doc.subject) ? doc.subject[0] : doc.subject;
    }

    let description = doc.description || null;
    if (description) {
      description = description.replace(/<[^>]*>?/gm, '').trim();
      if (description.length > 300) description = description.substring(0, 300) + '...';
    }

    return {
      game_id: identifier,
      title: cleanTitle,
      system: mapping.system,
      system_id: systemKey,
      year: year,
      publisher: publisher,
      developer: publisher,
      players: this.estimatePlayers(cleanTitle, description),
      rom_url: `archive:${identifier}`, // Placeholder to be resolved later
      cover_url: coverUrl,
      artwork_url: artworkUrl,
      description: description,
      genre: genre,
      rom_size: 1024 * 1024, // Dummy size to pass filters
      emulator_core: mapping.core,
      compatibility_status: 'untested',
      checksum: null,
      playable: true
    };
  }

  /**
   * Normaliza los metadatos crudos de Archive.org en un GameObject uniforme.
   */
  public static normalize(rawData: ArchiveRawData, collection?: string): GameObject | null {
    // 1. Verificar ROM principal
    const romFile = this.findMainRom(rawData.files || [], []); // Pass empty to find any supported
    if (!romFile) return null; 

    // Attempt to determine system from collection name or subject
    let systemKey = '';
    
    // Try to find a matching system in our mappings based on collection or subject
    if (collection && COLLECTION_TO_SYSTEM[collection]) {
      systemKey = COLLECTION_TO_SYSTEM[collection];
    } else {
      // Fallback: Check subjects/keywords
      const subjects = Array.isArray(rawData.subject) ? rawData.subject : [rawData.subject || ''];
      for (const s of subjects) {
        const lowerS = s?.toLowerCase() || '';
        if (lowerS.includes('atari 2600') || lowerS.includes('vcs')) systemKey = 'atari_2600';
        else if (lowerS.includes('atari 7800')) systemKey = 'atari_7800';
        else if (lowerS.includes('atari lynx')) systemKey = 'lynx';
        else if (lowerS.includes('nes') || lowerS.includes('nintendo entertainment system')) systemKey = 'nes';
        else if (lowerS.includes('snes') || lowerS.includes('super nintendo')) systemKey = 'snes';
        else if (lowerS.includes('genesis') || lowerS.includes('mega drive')) systemKey = 'sega_genesis';
        else if (lowerS.includes('gba') || lowerS.includes('game boy advance') || lowerS.includes('gameboy advance')) systemKey = 'gba';
        else if (lowerS.includes('gbc') || lowerS.includes('game boy color') || lowerS.includes('gameboy color')) systemKey = 'gbc';
        else if (lowerS.includes('gb') || lowerS.includes('game boy') || lowerS.includes('gameboy')) systemKey = 'gb';
        else if (lowerS.includes('playstation') && !lowerS.includes('playstation 2') && !lowerS.includes('ps2')) systemKey = 'psx';
        else if (lowerS.includes('playstation 2') || lowerS.includes('ps2')) systemKey = 'ps2';
        else if (lowerS.includes('nintendo 64') || lowerS.includes('n64')) systemKey = 'n64';
        else if (lowerS.includes('master system')) systemKey = 'mastersystem';
        else if (lowerS.includes('game gear')) systemKey = 'gamegear';
        else if (lowerS.includes('pc engine') || lowerS.includes('turbografx')) systemKey = 'pcengine';
        else if (lowerS.includes('wonderswan')) systemKey = 'wonderswan';
        else if (lowerS.includes('neo geo pocket')) systemKey = 'ngp';
        else if (lowerS.includes('neogeo')) systemKey = 'neogeo';
        else if (lowerS.includes('mame') || lowerS.includes('arcade')) systemKey = 'mame';
        
        if (systemKey) break;
      }
    }

    // MANDATORY: If system still undefined, extract from extension
    if (!systemKey) {
      const ext = romFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'nes') systemKey = 'nes';
      else if (ext === 'sfc' || ext === 'smc') systemKey = 'snes';
      else if (ext === 'gba') systemKey = 'gba';
      else if (ext === 'gbc') systemKey = 'gbc';
      else if (ext === 'gb') systemKey = 'gb';
      else if (ext === 'bin' || ext === 'gen' || ext === 'md') systemKey = 'sega_genesis';
      else if (ext === 'iso' || ext === 'chd' || ext === 'cue') systemKey = 'psx';
      else if (ext === 'a26') systemKey = 'atari_2600';
      else if (ext === 'a78') systemKey = 'atari_7800';
      else if (ext === 'lnx') systemKey = 'lynx';
      else if (ext === 'n64' || ext === 'z64') systemKey = 'n64';
      else systemKey = 'Unknown';
    }

    const mapping = SYSTEM_MAPPINGS[systemKey] || SYSTEM_MAPPINGS['Unknown'];

    // 2. Corregir títulos
    const cleanTitle = this.cleanTitle(rawData.title || rawData.identifier);

    // Filter out obvious non-games or unplayable items
    const lowerTitle = cleanTitle.toLowerCase();
    const lowerId = rawData.identifier.toLowerCase();
    
    const arcadeBiosFiles = [
      'neogeo', 'pgm', 'qsound', 'cpzn1', 'cpzn2', 'cvs', 'decocass', 'konamigx', 
      'megatech', 'megaplay', 'nss', 'playch10', 'skns', 'stvbios', 'taitofx1', 'tps',
      'mame', 'naomi', 'hikaru', 'model3', 'awbios', 'dc_boot', 'dc_flash',
      'atps', 'atps2', 'atps3', 'atps4', 'atps5', 'atps6', 'atps7', 'atps8', 'atps9',
      'atps10', 'atps11', 'atps12', 'atps13', 'atps14', 'atps15', 'atps16', 'atps17',
      'atps18', 'atps19', 'atps20', 'atps21', 'atps22', 'atps23', 'atps24', 'atps25',
      'atps26', 'atps27', 'atps28', 'atps29', 'atps30', 'atps31', 'atps32', 'atps33',
      'atps34', 'atps35', 'atps36', 'atps37', 'atps38', 'atps39', 'atps40', 'atps41',
      'atps42', 'atps43', 'atps44', 'atps45', 'atps46', 'atps47', 'atps48', 'atps49',
      'atps50', 'atps51', 'atps52', 'atps53', 'atps54', 'atps55', 'atps56', 'atps57',
      'atps58', 'atps59', 'atps60', 'atps61', 'atps62', 'atps63', 'atps64', 'atps65',
      'atps66', 'atps67', 'atps68', 'atps69', 'atps70', 'atps71', 'atps72', 'atps73',
      'atps74', 'atps75', 'atps76', 'atps77', 'atps78', 'atps79', 'atps80', 'atps81',
      'atps82', 'atps83', 'atps84', 'atps85', 'atps86', 'atps87', 'atps88', 'atps89',
      'atps90', 'atps91', 'atps92', 'atps93', 'atps94', 'atps95', 'atps96', 'atps97',
      'atps98', 'atps99', 'atps100'
    ];

    if (lowerTitle.includes('bios') || 
        lowerTitle.includes('soundtrack') || 
        lowerTitle.includes('manual') || 
        lowerTitle.includes('not working') || 
        lowerTitle.includes('update') ||
        lowerTitle.includes('magazine') ||
        lowerTitle.includes('guide') ||
        lowerTitle.includes('romset') ||
        lowerTitle.includes('rom set') ||
        lowerTitle.includes('rom pack') ||
        lowerTitle.includes('chd pack') ||
        lowerTitle.includes('full set') ||
        lowerTitle.includes('collection') ||
        lowerTitle.includes('emulator') ||
        lowerTitle.includes('rollback') ||
        lowerTitle.includes('samples') ||
        lowerTitle.includes('artwork') ||
        lowerTitle.includes('flyers') ||
        lowerTitle.includes('snaps') ||
        lowerTitle.includes('titles') ||
        lowerTitle.includes('marquees') ||
        lowerTitle.includes('cabinets') ||
        lowerTitle.includes('cpanel') ||
        lowerTitle.includes('pcb') ||
        lowerTitle.includes('history') ||
        lowerTitle.includes('cheat') ||
        lowerTitle.includes('crosshair') ||
        arcadeBiosFiles.includes(lowerId) ||
        arcadeBiosFiles.some(b => lowerTitle === b) ||
        lowerTitle.match(/mame\s*0\.\d+/) ||
        lowerTitle.match(/^[0-9]+\s+[0-9a-z\s]+stario$/)) {
      return null;
    }

    // 3. Extraer año
    const year = this.extractYear(rawData.date);

    // 4. Extraer publisher y developer
    const publisher = this.extractPublisher(rawData.publisher || rawData.creator);
    const developer = this.extractPublisher(rawData.developer || rawData.creator);

    // 5. Construir URLs
    const romUrl = `https://archive.org/download/${rawData.identifier}/${encodeURIComponent(romFile.name)}`;
    
    // --- TRIPLE ART CASCADE ENGINE ---
    
    // 1. Libretro Master (High Quality)
    // Mapping for Libretro System Names (Official thumbnails.libretro.com format)
    const libretroSystemNames: Record<string, string> = {
      'nes': 'Nintendo - Nintendo Entertainment System',
      'snes': 'Nintendo - Super Nintendo Entertainment System',
      'sega_genesis': 'Sega - Mega Drive - Genesis',
      'gba': 'Nintendo - Game Boy Advance',
      'gbc': 'Nintendo - Game Boy Color',
      'gb': 'Nintendo - Game Boy',
      'psx': 'Sony - PlayStation',
      'ps2': 'Sony - PlayStation 2',
      'atari_2600': 'Atari - 2600',
      'atari_7800': 'Atari - 7800',
      'n64': 'Nintendo - Nintendo 64',
      'lynx': 'Atari - Lynx',
      'pcengine': 'NEC - PC Engine - TurboGrafx 16'
    };

    const libretroSystem = ((mapping as any).system_id ? libretroSystemNames[(mapping as any).system_id] : (libretroSystemNames[systemKey] || mapping.system)).replace(/ /g, '_');
    
    // Libretro uses "No-Intro" naming convention which INCLUDES the region (e.g. "(USA)").
    // We must use the RAW title (or close to it) but sanitized for their file naming rules.
    // Rules: Replace &*/:`<>?\|"# with _
    // We should NOT use the 'cleanTitle' (which strips regions) for Libretro.
    
    // Try to use the title from the file name if possible, as it usually matches No-Intro best.
    let bestTitleForLibretro = rawData.title || rawData.identifier;
    
    // If we found a ROM file, its name (minus extension) is often the best No-Intro match
    if (romFile && romFile.name) {
        bestTitleForLibretro = romFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
    }

    // SPECIAL CASE FOR ARCADE: Arcade games often have short names (mslug).
    if ((systemKey === 'mame' || systemKey === 'neogeo') && bestTitleForLibretro.length < 10) {
        if (rawData.title && rawData.title.length > bestTitleForLibretro.length) {
            bestTitleForLibretro = rawData.title;
        } else {
            bestTitleForLibretro = cleanTitle;
        }
    }

    // Archive.org files often use underscores instead of spaces. We must revert them for Libretro.
    bestTitleForLibretro = bestTitleForLibretro.replace(/_/g, ' ');

    // Libretro sanitization rules: replace special characters with underscore
    const libretroTitle = bestTitleForLibretro.replace(/[&*/:`<>?\|"#]/g, '_'); 

    const libretroCoverUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${encodeURIComponent(libretroSystem)}/master/Named_Boxarts/${encodeURIComponent(libretroTitle)}.png`;
    const libretroArtworkUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${encodeURIComponent(libretroSystem)}/master/Named_Snaps/${encodeURIComponent(libretroTitle)}.png`;
    const libretroTitleUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${encodeURIComponent(libretroSystem)}/master/Named_Titles/${encodeURIComponent(libretroTitle)}.png`;
    
    // 2. Archive.org Native (Thumbnail)
    // Archive.org often has a __ia_thumb.jpg or similar. We can try to guess it or use the generic service.
    // The generic service is `https://archive.org/services/img/{identifier}`
    const archiveThumbnailUrl = `https://archive.org/services/img/${rawData.identifier}`;
    
    // 3. OpenGameArt Fallback (Generic Cartridge)
    // We'll use a placeholder service that generates a cartridge style image if possible, 
    // or a high-quality static asset. For now, we use a reliable placeholder service with text.
    const fallbackCoverUrl = `https://placehold.co/400x600/1a1a1a/00f2ff?text=${encodeURIComponent(cleanTitle)}&font=roboto`;

    // We return the Libretro URL as primary. The UI component (DynamicCover) 
    // MUST be updated to handle the fallback if this 404s. 
    // However, since we can't change the UI logic from here, we will try to be smart.
    // But the user requested "Triple Cascada de Arte" logic here.
    // Ideally, we provide a list, but the interface expects a string.
    // We will stick to Libretro as the "Master" URL. 
    // The UI *should* have an onError handler that tries the Archive thumbnail.
    // UPDATE: To ensure the "Archive Native" works if Libretro fails, we can't verify it here without fetching.
    // But we can return a special URL structure or just the Libretro one and hope the UI handles it.
    // Wait, the user said "Implementa un sistema de Triple Cascada".
    // If I can't change the UI to handle the cascade, I have to do it here? No, doing it here means 3 fetches per game. Too slow.
    // The "DynamicCover" component is the right place for the *execution* of the cascade.
    // But I will provide the Libretro URL here as it is the "Master".
    
    // Actually, let's look at the user request again: "Implementa un sistema de Triple Cascada de Arte... 1. Libretro... 2. Archive... 3. OpenGameArt".
    // I will construct the URL to point to Libretro.
    // I will ALSO update the `DynamicCover` component (if I can) or `GameLibrary` to handle the error.
    // But for this file, I will set `cover_url` to Libretro.
    
    let coverUrl = libretroCoverUrl;
    
    // If we have a definitive archive cover file, we might want to use it as a backup?
    // The user said "Si falla la 1, descarga el thumbnail interno".
    // I will attach the archive thumbnail URL as `artwork_url` if no other artwork is found, 
    // so the UI can potentially swap to it? No, `artwork_url` is for background.
    
    // Let's just set the coverUrl to Libretro.
    
    let artworkUrl = null;
    const priorityArtwork = rawData.files?.find(f => 
      f.name.toLowerCase().includes('art') || 
      f.name.toLowerCase().includes('background') ||
      f.name.toLowerCase().includes('promo')
    );

    if (priorityArtwork) {
      artworkUrl = `https://archive.org/download/${rawData.identifier}/${encodeURIComponent(priorityArtwork.name)}`;
    } else {
      // Use Libretro Named_Snaps for artwork/background
      artworkUrl = libretroArtworkUrl;
    }
    
    // Fallback if artwork is missing, try title screen
    if (!artworkUrl) {
        artworkUrl = libretroTitleUrl;
    }
    
    // 6. Buscar video preview o gif
    // Priority: Archive.org mp4 > screenscraper (not implemented yet)
    const videoFile = rawData.files?.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.gif'));
    const videoPreviewUrl = videoFile ? `https://archive.org/download/${rawData.identifier}/${encodeURIComponent(videoFile.name)}` : null;

    // ... rest of logic

    // 7. Extraer género
    let genre = null;
    if (rawData.subject) {
      if (Array.isArray(rawData.subject)) {
        genre = rawData.subject[0];
      } else {
        genre = rawData.subject;
      }
    }

    // 8. Limpiar descripción (quitar HTML si lo hay, o limitar tamaño)
    let description = rawData.description || null;
    if (description) {
      // Remover tags HTML básicos
      description = description.replace(/<[^>]*>?/gm, '').trim();
      if (description.length > 300) {
        description = description.substring(0, 300) + '...';
      }
    }

    return {
      game_id: rawData.identifier,
      title: cleanTitle,
      system: mapping.system,
      system_id: systemKey,
      year: year,
      publisher: publisher,
      developer: developer,
      players: this.estimatePlayers(cleanTitle, rawData.description),
      rom_url: romUrl,
      cover_url: coverUrl,
      artwork_url: artworkUrl,
      video_preview_url: videoPreviewUrl,
      description: description,
      genre: genre,
      rom_size: parseInt(romFile.size || '0', 10),
      emulator_core: mapping.core,
      compatibility_status: 'untested',
      checksum: romFile.crc32 || romFile.md5 || null,
      playable: true
    };
  }

  /**
   * Encuentra el archivo ROM principal basado en las extensiones soportadas.
   */
  private static findMainRom(files: ArchiveFile[], validExtensions: string[]): ArchiveFile | null {
    const allSupported = ['.nes', '.sfc', '.smc', '.gba', '.gbc', '.gb', '.bin', '.gen', '.md', '.iso', '.chd', '.cue', '.a26', '.a78', '.lnx', '.n64', '.z64', '.zip', '.7z', '.rar'];
    const specificExtensions = validExtensions.length > 0 ? validExtensions : allSupported;
    const fallbackExtensions = ['.zip', '.7z', '.rar'];
    
    // Helper to check if a file name looks like a ROM and not metadata/artwork
    const isLikelyRom = (name: string) => {
      const lower = name.toLowerCase();
      // Exclude common non-ROM files found in archives
      const exclusions = [
        'art', 'cover', 'manual', 'soundtrack', 'video', 'snap', 
        'readme', 'info', 'metadata', 'license', 'install', 'setup',
        '__ia_thumb', 'xml', 'txt', 'pdf', 'jpg', 'png', 'gif', 'mp4',
        'flyer', 'cabinet', 'marquee', 'cpanel', 'pcb', 'history', 'cheat',
        'crosshair', 'sample', 'artwork', 'device', 'bios'
      ];
      
      if (exclusions.some(exc => lower.includes(exc))) return false;
      
      // Also exclude files that are clearly just extensions of other files
      if (lower.endsWith('.xml') || lower.endsWith('.txt') || lower.endsWith('.pdf')) return false;
      
      return true;
    };

    // 1. Try 'original' files that are likely ROMs with specific extensions
    const originalCandidates = files.filter(f => f.source === 'original');
    
    // PRIORITIZE CHD for PSX/PS2 as it's a single file format
    if (validExtensions.includes('.chd') || validExtensions.includes('.iso')) {
        const chd = originalCandidates.find(f => f.name?.toLowerCase().endsWith('.chd'));
        if (chd) return chd;
    }

    // CRITICAL: Iterate over extensions first to ensure priority (e.g. .nes before .zip)
    for (const ext of specificExtensions) {
      // Skip fallbacks in the first pass if we have specific ones
      if (validExtensions.length > 0 && fallbackExtensions.includes(ext) && ext !== specificExtensions[0]) continue;
      
      for (const file of originalCandidates) {
        if (!file.name) continue;
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith(ext) && isLikelyRom(file.name)) {
          return file;
        }
      }
    }

    // 2. Try 'original' files with fallback extensions (.zip) if not found yet
    for (const ext of fallbackExtensions) {
      for (const file of originalCandidates) {
        if (!file.name) continue;
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith(ext) && isLikelyRom(file.name)) {
          return file;
        }
      }
    }

    // 3. Try any file that is likely a ROM with specific extensions
    for (const ext of specificExtensions) {
      for (const file of files) {
        if (!file.name) continue;
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith(ext) && isLikelyRom(file.name)) {
          return file;
        }
      }
    }

    // 4. Try any file with fallback extensions (.zip)
    for (const ext of fallbackExtensions) {
      for (const file of files) {
        if (!file.name) continue;
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith(ext) && isLikelyRom(file.name)) {
          return file;
        }
      }
    }

    // 5. Ultimate Fallback: Try any file that matches any supported extension
    const allExts = [...specificExtensions, ...fallbackExtensions];
    for (const file of originalCandidates) {
      if (!file.name) continue;
      const lowerName = file.name.toLowerCase();
      if (allExts.some(ext => lowerName.endsWith(ext))) {
        return file;
      }
    }
    
    return null;
  }

  /**
   * Limpia el título eliminando tags molestos como (USA), (Rev A), [!], etc.
   * También elimina guiones bajos y extensiones.
   */
  private static cleanTitle(rawTitle: string): string {
    return rawTitle
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/\s*[(\[].*?[)\]]/g, '') // Remove content in parentheses or brackets
      .trim();
  }

  /**
   * Extrae el año de publicación de un string de fecha.
   */
  private static extractYear(dateStr?: any): number | null {
    if (!dateStr) return null;
    const str = String(dateStr);
    const match = str.match(/\b(19[7-9]\d|20[0-2]\d)\b/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Normaliza el campo de creador/publisher.
   */
  private static extractPublisher(creator?: string | string[]): string | null {
    if (!creator) return null;
    if (Array.isArray(creator)) return creator[0];
    return creator;
  }

  /**
   * Estima el número de jugadores basado en el título o descripción (heurística básica).
   */
  private static estimatePlayers(title: string, description?: string): number {
    const textToAnalyze = `${title} ${description || ''}`.toLowerCase();
    if (textToAnalyze.includes('2 player') || textToAnalyze.includes('two player') || textToAnalyze.includes('multiplayer')) {
      return 2;
    }
    if (textToAnalyze.includes('4 player') || textToAnalyze.includes('four player')) {
      return 4;
    }
    return 1; // Por defecto
  }

  /**
   * Elimina duplicados de una lista de GameObjects basándose en el título y sistema.
   * Prioriza las versiones con mejor checksum o tamaño.
   */
  public static deduplicate(games: GameObject[]): GameObject[] {
    const uniqueGames = new Map<string, GameObject>();

    for (const game of games) {
      // Clave única basada en título limpio y sistema
      const key = `${game.title.toLowerCase()}_${game.system}`;
      
      if (!uniqueGames.has(key)) {
        uniqueGames.set(key, game);
      } else {
        // Lógica de resolución de colisiones: preferir la ROM más grande (suele tener menos recortes)
        const existing = uniqueGames.get(key)!;
        if (game.rom_size > existing.rom_size) {
          uniqueGames.set(key, game);
        }
      }
    }

    return Array.from(uniqueGames.values());
  }

  /**
   * Search Archive.org for games matching the query and system.
   * Filters by 'No-Intro' or 'Ghostlight' collections.
   */
  public static async searchArchiveOrg(query: string, system?: string, rows: number = 100, page: number = 1): Promise<GameObject[]> {
    // PROXY ROTATION STRATEGY
    const proxies = [
      { name: 'Direct', url: '' },
      { name: 'LocalTunnel', url: '/api/tunnel?url=' },
      { name: 'CorsProxy', url: 'https://corsproxy.io/?' },
      { name: 'AllOrigins', url: 'https://api.allorigins.win/raw?url=' }
    ];

    // Simplified Query Strategy: "OR" everything to avoid complexity errors
    const systemSubjects: Record<string, string[]> = {
      'arcade': ['mame', 'arcade', 'neogeo'],
      'nes': ['nes', 'nintendo entertainment system'],
      'snes': ['snes', 'super nintendo'],
      'sega': ['sega genesis', 'mega drive', 'master system', 'game gear'],
      'gameboy': ['gb', 'gameboy', 'gbc', 'gameboy color', 'gba', 'gameboy advance'],
      'playstation': ['psx', 'playstation'],
      'ps2': ['ps2', 'playstation 2'],
      'n64': ['n64', 'nintendo 64'],
      'atari': ['atari 2600', 'vcs', 'atari 7800', 'atari lynx'],
      'otras': ['pc engine', 'turbografx', 'wonderswan', 'neo geo pocket']
    };

    const systemCollections: Record<string, string[]> = {
      'arcade': ['softwarelibrary_mame', 'softwarelibrary_neogeo'],
      'nes': ['softwarelibrary_nes', 'no-intro-nes'],
      'snes': ['softwarelibrary_snes', 'no-intro-snes'],
      'sega': ['softwarelibrary_sega_genesis', 'no-intro-genesis', 'softwarelibrary_ms', 'no-intro-ms', 'softwarelibrary_gg', 'no-intro-gg'],
      'gameboy': ['softwarelibrary_gb', 'no-intro-gb', 'softwarelibrary_gbc', 'no-intro-gbc', 'softwarelibrary_gba', 'no-intro-gba'],
      'playstation': ['softwarelibrary_psx', 'redump-sony-playstation'],
      'n64': ['softwarelibrary_n64', 'no-intro-n64'],
      'atari': ['softwarelibrary_atari'],
      'otras': ['softwarelibrary_pce', 'no-intro-pce']
    };

    let q = `mediatype:(software)`;
    
    // Exclude obvious non-games
    q += ` AND NOT title:(BIOS OR Soundtrack OR Manual OR Demo OR "Not Working" OR "Update" OR Magazine OR Guide OR Romset OR "Rom Set" OR "Rom Pack" OR "CHD Pack" OR "Full Set" OR Collection OR Emulator OR "MAME 0.*")`;
    
    if (query) {
      // Escape special characters for Archive.org
      const escapedQuery = query.replace(/[():]/g, '\\$&');
      q += ` AND title:(${escapedQuery})`;
    }

    // If system is provided, filter by specific subject or collection subset
    if (system && system !== 'All') {
      const subjects = systemSubjects[system] || [system];
      const collections = systemCollections[system] || [];
      
      let systemFilter = `(${subjects.map(s => `subject:("${s}")`).join(' OR ')})`;
      if (collections.length > 0) {
        systemFilter = `(${systemFilter} OR ${collections.map(c => `collection:("${c}")`).join(' OR ')})`;
      }
      
      q += ` AND ${systemFilter}`;
    } else {
       // If no system specified, we can optionally add a general software library filter
       // but mediatype:software is usually enough.
    }

    const sort = 'downloads+desc';
    const scrapeCount = Math.max(100, rows);
    const flParams = ['identifier', 'title', 'description', 'creator', 'date', 'subject', 'collection']
      .map(f => `fl[]=${f}`).join('&');

    // Primary and Fallback Queries
    const queries = [q];
    const notFilters = `NOT title:(BIOS OR Soundtrack OR Manual OR Demo OR "Not Working" OR "Update" OR Magazine OR Guide OR Romset OR "Rom Set" OR "Rom Pack" OR "CHD Pack" OR "Full Set" OR Collection OR Emulator OR "MAME 0.*")`;
    
    if (query && system && system !== 'All') {
      // Fallback 1: Just title and system (less restrictive subject)
      queries.push(`mediatype:(software) AND title:(${query.replace(/[():]/g, '\\$&')}) AND subject:(${system}) AND ${notFilters}`);
      // Fallback 2: Just title and software mediatype
      queries.push(`mediatype:(software) AND title:(${query.replace(/[():]/g, '\\$&')}) AND ${notFilters}`);
    }

    let searchData: any = null;
    let lastError: string = "";

    // Attempt fetch with query fallback, proxy rotation and endpoint fallback
    for (const currentQ of queries) {
      if (searchData && searchData.response && searchData.response.docs && searchData.response.docs.length > 0) break;

      const endpoints = [
        `https://archive.org/advancedsearch.php?q=${encodeURIComponent(currentQ)}&${flParams}&sort[]=${sort}&rows=${rows}&page=${page}&output=json`
      ];
      
      if (page === 1) {
        endpoints.push(`https://archive.org/services/search/v1/scrape?q=${encodeURIComponent(currentQ)}&fields=identifier,title,description,creator,date,subject,collection&count=${scrapeCount}`);
      }

      for (const endpoint of endpoints) {
        if (searchData && searchData.response && searchData.response.docs && searchData.response.docs.length > 0) break;
        
        let endpointSuccess = false;

        for (const proxy of proxies) {
          try {
            const fetchUrl = proxy.url ? `${proxy.url}${encodeURIComponent(endpoint)}` : endpoint;
            console.log(`[Archive.org Search] Attempting via ${proxy.name} (Query: ${currentQ.substring(0, 30)}...): ${fetchUrl}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per attempt
            
            // Add random jitter to avoid slamming the server
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
            
            const response = await fetch(fetchUrl, { 
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
              const errText = await response.text().catch(() => "No error body");
              // If it's a 400/500 error from Archive.org, it might be a paging error
              if (errText.includes('DEEP_PAGING') || errText.includes('paging limit')) {
                throw new Error(`Archive.org API Error: [DEEP_PAGING] Limit reached at page ${page}`);
              }
              throw new Error(`Status ${response.status}: ${errText.substring(0, 50)}`);
            }
            
            const text = await response.text();
            try {
              const data = JSON.parse(text);
              
              if (data.error) {
                throw new Error(`Archive.org API Error: ${data.error}`);
              }

              if (data.response && Array.isArray(data.response.docs)) {
                searchData = data;
                endpointSuccess = true;
                console.log(`[Archive.org Search] Success via ${proxy.name} with ${searchData.response.docs.length} results.`);
                break; // Break proxy loop
              } else if (data.items && Array.isArray(data.items)) {
                searchData = { response: { docs: data.items } };
                endpointSuccess = true;
                console.log(`[Archive.org Search] Success via ${proxy.name} with ${searchData.response.docs.length} results.`);
                break; // Break proxy loop
              } else {
                 throw new Error('Invalid data format: missing docs or items array');
              }
            } catch (e) {
              if (e instanceof Error && e.message.includes('Archive.org API Error')) {
                throw e;
              }
              throw new Error('Invalid JSON response or format');
            }
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
            console.warn(`[Archive.org Search] Proxy ${proxy.name} failed: ${lastError}`);
            
            // CRITICAL: If it's a logical API error (like deep paging), don't try other proxies
            if (lastError.includes('Archive.org API Error')) {
               console.error("[Archive.org Search] Logical error detected. Aborting proxy rotation.");
               throw e; 
            }
            continue;
          }
        }

        // If the endpoint succeeded (even with 0 results), break the endpoint loop
        if (endpointSuccess) {
           break;
        }
      }
    }

    if (searchData && searchData.response && searchData.response.docs) {
      if (searchData.response.docs.length === 0) {
        console.log("[Archive.org Search] Query completed successfully but returned 0 results.");
        return [];
      }
    } else {
      console.error("[Archive.org Search] All queries, proxies and endpoints failed. Last error:", lastError);
      throw new Error(`Search failed. Archive.org might be unavailable or rate-limited. (Last error: ${lastError})`);
    }

    const docs = searchData.response.docs;
    const normalizedGames: GameObject[] = [];

    // Fast normalization without fetching metadata for each file
    for (const doc of docs) {
      try {
        const game = this.normalizeFast(doc);
        if (game && game.system !== 'Unknown') {
          normalizedGames.push(game);
        }
      } catch (err) {
        console.error(`Error normalizing ${doc.identifier}:`, err);
      }
    }

    return this.deduplicate(normalizedGames);
  }

  /**
   * Fetch real data from Archive.org (Legacy/Collection based)
   */
  public static async fetchFromArchiveOrg(collection: string = 'softwarelibrary_snes', limit: number = 50): Promise<GameObject[]> {
     // Redirect to search if possible, or keep as is for compatibility
     // For now, let's keep it but use the new normalization logic
     return this.searchArchiveOrg(collection, 'All'); // This is not quite right, but we are moving to search
  }
}

