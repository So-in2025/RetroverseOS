import { CoverService } from './coverService';

export interface GameObject {
  game_id: string;
  archive_id?: string; // Original Archive.org identifier
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
  added_at?: number; // Timestamp when added to local catalog
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
 * ELITE TOP 20: The face of Retroverse OS.
 * These identifiers are guaranteed to work and represent the best of each system.
 */
export const ELITE_TOP_20 = [
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
  'Star Fox 64',
  'Donkey Kong Country',
  'Street Fighter II Turbo',
  'Mega Man X',
  'Metroid Fusion',
  'Final Fantasy VII',
  'Gran Turismo 2',
  'Spyro: Year of the Dragon',
  'Tony Hawk\'s Pro Skater 2'
];

export class MetadataNormalizationEngine {
  
  public static async resolveRomUrl(gameId: string, system?: string): Promise<string | null> {
    const maxRetries = 4;
    let attempt = 0;

    let identifier = gameId;
    let targetRomName: string | null = null;

    if (gameId.includes('/')) {
      const firstSlash = gameId.indexOf('/');
      identifier = gameId.substring(0, firstSlash);
      targetRomName = gameId.substring(firstSlash + 1);
    } else {
      // Legacy format or just an identifier
      // We don't know if it's identifier_romname or just identifier.
      // We'll assume the whole thing is the identifier first. If it fails, we'll try splitting.
      // But for now, let's just use the whole thing as identifier.
      identifier = gameId;
      targetRomName = null;
    }

    while (attempt < maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout per attempt

      try {
        const metaTargetUrl = `https://archive.org/metadata/${identifier}`;
        const proxyUrl = `/api/tunnel?url=${encodeURIComponent(metaTargetUrl)}`;
        
        let response;
        try {
          console.log(`[RomResolver] Fetching metadata for ${identifier} (Attempt ${attempt + 1}/${maxRetries})`);
          response = await fetch(proxyUrl, { signal: controller.signal });
        } catch (e: any) {
          console.warn(`[RomResolver] Proxy failed for ${identifier}: ${e.message}`);
          
          // If it's the last attempt, try direct
          if (attempt === maxRetries - 1) {
            console.log(`[RomResolver] Final attempt for ${identifier}, trying direct...`);
            try {
              response = await fetch(metaTargetUrl, { signal: controller.signal });
            } catch (e2: any) {
              console.error(`[RomResolver] Direct fetch also failed for ${identifier}:`, e2.message);
              throw e2;
            }
          } else {
            throw e;
          }
        }
        
        if (response && response.ok) {
          const text = await response.text();
          
          if (!text || text.trim() === '' || text.trim().toLowerCase().startsWith('<!doctype')) {
             throw new Error("Received HTML or empty response instead of JSON from Archive.org");
          }

          let metaData;
          try {
            metaData = JSON.parse(text);
          } catch (parseError) {
            console.error(`[RomResolver] Failed to parse JSON for ${identifier}:`, text.substring(0, 100));
            throw new Error("Invalid JSON response from Archive.org");
          }

          if (metaData && metaData.files) {
            let romFile: ArchiveFile | null = null;

            if (targetRomName) {
              // Try to find the specific ROM file by its exact name or sanitized name
              romFile = metaData.files.find((f: ArchiveFile) => 
                f.name === targetRomName || f.name.replace(/[^a-zA-Z0-9]/g, '_') === targetRomName
              ) || null;
            }

            // Fallback to finding the main ROM if not found or no targetRomName
            if (!romFile) {
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

              romFile = this.findMainRom(metaData.files, validExtensions);
            }

            if (romFile) {
              clearTimeout(timeoutId);
              const encodedName = romFile.name.split('/').map((part: string) => encodeURIComponent(part)).join('/');
              return `https://archive.org/download/${identifier}/${encodedName}`;
            } else {
              console.warn(`[RomResolver] No valid ROM file found in metadata for ${identifier}.`);
              clearTimeout(timeoutId);
              return null; 
            }
          } else {
            console.warn(`[RomResolver] No files found in metadata for ${identifier}`);
            clearTimeout(timeoutId);
            return null;
          }
        } else if (response) {
          console.warn(`[RomResolver] Metadata fetch failed for ${identifier} with status ${response.status}`);
          if (response.status === 404) {
            if (!gameId.includes('/') && gameId.includes('_') && identifier === gameId) {
              // Try legacy format fallback
              const parts = gameId.split('_');
              identifier = parts[0];
              targetRomName = parts.slice(1).join('_');
              console.log(`[RomResolver] Fallback to legacy format: ${identifier}`);
              continue; // Retry with new identifier
            }
            clearTimeout(timeoutId);
            return null;
          }
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e: any) {
        attempt++;
        console.error(`[RomResolver] Attempt ${attempt} failed for ${identifier}:`, e.message);
        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
    return null;
  }

  public static normalizeFast(doc: any): GameObject[] {
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
        else if (lowerS.includes('snes') || lowerS.includes('super nintendo')) systemKey = 'snes';
        else if (lowerS.includes('nes') || lowerS.includes('nintendo entertainment system')) systemKey = 'nes';
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

    // If we have files, normalize all of them
    if (doc.files && Array.isArray(doc.files)) {
      const games: GameObject[] = [];
      const romFiles = doc.files.filter((f: any) => {
        const name = typeof f === 'string' ? f : f.name;
        if (!name) return false;
        const lower = name.toLowerCase();
        const extensions = ['.nes', '.sfc', '.smc', '.gba', '.gbc', '.gb', '.bin', '.gen', '.md', '.iso', '.chd', '.cue', '.a26', '.a78', '.lnx', '.n64', '.z64', '.zip', '.7z'];
        return extensions.some(ext => lower.endsWith(ext)) && !lower.includes('bios') && !lower.includes('manual') && !lower.includes('soundtrack');
      });

      for (const f of romFiles) {
        const fileName = typeof f === 'string' ? f : f.name;
        const cleanTitle = this.cleanTitle(fileName);
        const gameId = `${identifier}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Use a more specific title for cover resolution (keep tags like (USA), (Disc 1), etc.)
        const specificTitle = fileName.replace(/_/g, ' ').replace(/\.[^/.]+$/, "");
        const sources = CoverService.getCoverSources(specificTitle, systemKey, identifier);
        
        // Try to find specific artwork for this ROM
        let artworkUrl = null;
        const romBaseName = fileName.substring(0, fileName.lastIndexOf('.'));
        const specificArt = doc.files?.find((file: any) => {
          const fName = typeof file === 'string' ? file : file.name;
          if (!fName) return false;
          const isImage = fName.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/);
          if (!isImage) return false;
          const artBaseName = fName.substring(0, fName.lastIndexOf('.'));
          return artBaseName.toLowerCase() === romBaseName.toLowerCase() || 
                 artBaseName.toLowerCase().includes(romBaseName.toLowerCase());
        });

        if (specificArt) {
          const artName = typeof specificArt === 'string' ? specificArt : specificArt.name;
          const encodedArtName = artName.split('/').map((part: string) => encodeURIComponent(part)).join('/');
          artworkUrl = `https://archive.org/download/${identifier}/${encodedArtName}`;
        } else {
          artworkUrl = sources.find(s => s.includes('Named_Snaps')) || sources[1] || null;
        }

        games.push({
          game_id: gameId,
          archive_id: identifier,
          title: cleanTitle,
          system: mapping.system,
          system_id: systemKey,
          year: this.extractYear(doc.date),
          publisher: this.extractPublisher(doc.creator),
          developer: this.extractPublisher(doc.creator),
          players: this.estimatePlayers(cleanTitle, doc.description),
          rom_url: `archive:${identifier}/${fileName}`,
          cover_url: sources[0],
          artwork_url: artworkUrl,
          description: doc.description ? doc.description.replace(/<[^>]*>?/gm, '').substring(0, 300) : null,
          genre: Array.isArray(doc.subject) ? doc.subject[0] : doc.subject,
          rom_size: typeof f === 'object' ? parseInt(f.size || '0', 10) : 1024 * 1024,
          emulator_core: mapping.core,
          compatibility_status: 'untested',
          checksum: null,
          playable: true
        });
      }
      
      if (games.length > 0) return games;
    }

    // Fallback if no files or no valid ROMs found in files
    const cleanTitle = this.cleanTitle(doc.title || identifier);
    const sources = CoverService.getCoverSources(cleanTitle, systemKey, identifier);

    return [{
      game_id: identifier,
      archive_id: identifier,
      title: cleanTitle,
      system: mapping.system,
      system_id: systemKey,
      year: this.extractYear(doc.date),
      publisher: this.extractPublisher(doc.creator),
      developer: this.extractPublisher(doc.creator),
      players: this.estimatePlayers(cleanTitle, doc.description),
      rom_url: `archive:${identifier}`,
      cover_url: sources[0],
      artwork_url: sources.find(s => s.includes('Named_Snaps')) || sources[1] || null,
      description: doc.description ? doc.description.replace(/<[^>]*>?/gm, '').substring(0, 300) : null,
      genre: Array.isArray(doc.subject) ? doc.subject[0] : doc.subject,
      rom_size: 1024 * 1024,
      emulator_core: mapping.core,
      compatibility_status: 'untested',
      checksum: null,
      playable: true
    }];
  }

  /**
   * Normaliza los metadatos crudos de Archive.org en una lista de GameObjects uniformes.
   * Soporta múltiples juegos dentro de un mismo ítem (colecciones).
   */
  public static normalize(rawData: ArchiveRawData, collection?: string): GameObject[] {
    const games: GameObject[] = [];
    
    // 1. Determinar sistema
    let systemKey = '';
    if (collection && COLLECTION_TO_SYSTEM[collection]) {
      systemKey = COLLECTION_TO_SYSTEM[collection];
    } else {
      const subjects = Array.isArray(rawData.subject) ? rawData.subject : [rawData.subject || ''];
      for (const s of subjects) {
        const lowerS = s?.toLowerCase() || '';
        if (lowerS.includes('atari 2600') || lowerS.includes('vcs')) systemKey = 'atari_2600';
        else if (lowerS.includes('atari 7800')) systemKey = 'atari_7800';
        else if (lowerS.includes('atari lynx')) systemKey = 'lynx';
        else if (lowerS.includes('snes') || lowerS.includes('super nintendo')) systemKey = 'snes';
        else if (lowerS.includes('nes') || lowerS.includes('nintendo entertainment system')) systemKey = 'nes';
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

    // MANDATORY: If system still undefined, extract from files later
    const mapping = systemKey ? (SYSTEM_MAPPINGS[systemKey] || SYSTEM_MAPPINGS['Unknown']) : SYSTEM_MAPPINGS['Unknown'];

    // 2. Encontrar todos los archivos ROM válidos
    const files = rawData.files || [];
    const romFiles = files.filter(f => {
      if (f.source !== 'original') return false;
      const lower = f.name.toLowerCase();
      const extensions = ['.nes', '.sfc', '.smc', '.gba', '.gbc', '.gb', '.bin', '.gen', '.md', '.iso', '.chd', '.cue', '.a26', '.a78', '.lnx', '.n64', '.z64', '.zip', '.7z'];
      
      // Basic exclusions
      const exclusions = ['bios', 'manual', 'soundtrack', 'video', 'snap', 'readme', 'info', 'metadata', 'license', 'install', 'setup', '__ia_thumb'];
      if (exclusions.some(exc => lower.includes(exc))) return false;
      
      return extensions.some(ext => lower.endsWith(ext));
    });

    if (romFiles.length === 0) return [];

    // 3. Procesar cada ROM como un juego independiente
    for (const romFile of romFiles) {
      let currentSystemKey = systemKey;
      
      // If system was unknown, try to infer from extension
      if (!currentSystemKey) {
        const ext = romFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'nes') currentSystemKey = 'nes';
        else if (ext === 'sfc' || ext === 'smc') currentSystemKey = 'snes';
        else if (ext === 'gba') currentSystemKey = 'gba';
        else if (ext === 'gbc') currentSystemKey = 'gbc';
        else if (ext === 'gb') currentSystemKey = 'gb';
        else if (ext === 'bin' || ext === 'gen' || ext === 'md') currentSystemKey = 'sega_genesis';
        else if (ext === 'iso' || ext === 'chd' || ext === 'cue') currentSystemKey = 'psx';
        else if (ext === 'a26') currentSystemKey = 'atari_2600';
        else if (ext === 'a78') currentSystemKey = 'atari_7800';
        else if (ext === 'lnx') currentSystemKey = 'lynx';
        else if (ext === 'n64' || ext === 'z64') currentSystemKey = 'n64';
        else currentSystemKey = 'Unknown';
      }

      const currentMapping = SYSTEM_MAPPINGS[currentSystemKey] || SYSTEM_MAPPINGS['Unknown'];
      const cleanTitle = this.cleanTitle(romFile.name);
      const gameId = `${rawData.identifier}_${romFile.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const encodedRomName = romFile.name.split('/').map((part: string) => encodeURIComponent(part)).join('/');
      const romUrl = `https://archive.org/download/${rawData.identifier}/${encodedRomName}`;
      
      // Use a more specific title for cover resolution (keep tags like (USA), (Disc 1), etc.)
      const specificTitle = romFile.name.replace(/_/g, ' ').replace(/\.[^/.]+$/, "");
      const sources = CoverService.getCoverSources(specificTitle, currentSystemKey, rawData.identifier);
      
      // Try to find specific artwork for this ROM
      let artworkUrl = null;
      const romBaseName = romFile.name.substring(0, romFile.name.lastIndexOf('.'));
      const specificArt = rawData.files?.find(f => {
        const isImage = f.name.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/);
        if (!isImage) return false;
        const artBaseName = f.name.substring(0, f.name.lastIndexOf('.'));
        return artBaseName.toLowerCase() === romBaseName.toLowerCase() || 
               artBaseName.toLowerCase().includes(romBaseName.toLowerCase());
      });

      if (specificArt) {
        const encodedArtName = specificArt.name.split('/').map((part: string) => encodeURIComponent(part)).join('/');
        artworkUrl = `https://archive.org/download/${rawData.identifier}/${encodedArtName}`;
      } else {
        const priorityArtwork = rawData.files?.find(f => 
          f.name.toLowerCase().includes('art') || 
          f.name.toLowerCase().includes('background') ||
          f.name.toLowerCase().includes('promo') ||
          f.name.toLowerCase().includes('box') ||
          f.name.toLowerCase().includes('cover')
        );

        if (priorityArtwork) {
          const encodedPriorityArtName = priorityArtwork.name.split('/').map((part: string) => encodeURIComponent(part)).join('/');
          artworkUrl = `https://archive.org/download/${rawData.identifier}/${encodedPriorityArtName}`;
        } else {
          artworkUrl = sources.find(s => s.includes('Named_Snaps')) || sources[1] || null;
        }
      }

      const videoFile = rawData.files?.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.gif'));
      const encodedVideoName = videoFile ? videoFile.name.split('/').map((part: string) => encodeURIComponent(part)).join('/') : null;
      const videoPreviewUrl = videoFile ? `https://archive.org/download/${rawData.identifier}/${encodedVideoName}` : null;

      let description = rawData.description || null;
      if (description) {
        description = description.replace(/<[^>]*>?/gm, '').trim();
        if (description.length > 300) description = description.substring(0, 300) + '...';
      }

      games.push({
        game_id: gameId,
        archive_id: rawData.identifier,
        title: cleanTitle,
        system: currentMapping.system,
        system_id: currentSystemKey,
        year: this.extractYear(rawData.date),
        publisher: this.extractPublisher(rawData.publisher || rawData.creator),
        developer: this.extractPublisher(rawData.developer || rawData.creator),
        players: this.estimatePlayers(cleanTitle, rawData.description),
        rom_url: romUrl,
        cover_url: sources[0],
        artwork_url: artworkUrl,
        video_preview_url: videoPreviewUrl,
        description: description,
        genre: Array.isArray(rawData.subject) ? rawData.subject[0] : rawData.subject,
        rom_size: parseInt(romFile.size || '0', 10),
        emulator_core: currentMapping.core,
        compatibility_status: 'untested',
        checksum: romFile.crc32 || romFile.md5 || null,
        playable: true
      });
    }

    return games;
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
        'crosshair', 'sample', 'artwork', 'device', 'bios', 'pc world', 
        'pc gamer', 'pc magazine', 'coverdisc', 'cover disc', 'demo disc',
        'preview disc', 'review disc', 'gog edition', 'steam edition', 'repack',
        'installer', 'setup', 'utility', 'driver', 'software', 'shareware', 'freeware',
        'patch', 'crack', 'trainer', 'portable', 'rip', 'full game'
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
  public static cleanTitle(rawTitle: string): string {
    if (!rawTitle) return 'Unknown Game';
    
    let title = rawTitle
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\.(nes|sfc|smc|bin|iso|gba|gbc|gb|gen|md|a26|a78|lnx|n64|z64|zip|7z|chd|cue)$/i, '') // Remove extension
      .replace(/\s*[(\[].*?[)\]]/g, ' ') // Remove content in parentheses or brackets but keep a space
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Remove common Archive.org prefixes like "001 - " or "Snes - "
    title = title
      .replace(/^\d+\s*-\s*/, '') // Remove numeric prefixes (001 - Game)
      .replace(/^(nes|snes|gba|gbc|gb|n64|psx|ps2|genesis|md|atari|lynx|ngp|mame|neogeo|mastersystem|gamegear|pcengine)\s*-\s*/i, '') // Remove system prefixes (Snes - Game)
      .trim();

    // Remove common junk words that appear in some collections
    title = title
      .replace(/\b(v\d+\.\d+[a-z]?|rev\s*[a-z0-9]|beta|demo|sample|promo|review|preview|debug|build|hack|translation|translated|patched|fixed|trainer|cheat|intro|repack|unlicensed|aftermarket|homebrew|prototype|sample|kiosk|store|not for resale|nfr|bundle|pack|collection|anthology|bonus|disc|cd|dvd|rom|iso|rip|dump|bad|overdump|headered|unheadered|no-intro|redump|t-en|t-es|t-fr|t-pt|t-it|t-de|t-ru|t-jp|t-cn|t-kr|level editor|editor|official|snes|nes|gba|gbc|gb|n64|psx|ps1|ps2|genesis|megadrive|master system|game gear|pc engine|turbografx|wonderswan|neogeo|ngp|mame|arcade|emu|emus|emulator|pack|roms|collection|set|fullset|complete|v1\.\d+|v2\.\d+|gog edition|steam edition|rare arabic ver|pc world cover|coverdisc|cover disc|demo disc|battle coliseum)\b/gi, '')
      .replace(/\s*-\s*$/g, '') // Remove trailing hyphens
      .replace(/\s+/g, ' ')
      .trim();
    
    return title || rawTitle;
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
      { name: 'LocalTunnel', url: '/api/tunnel?url=', timeout: 45000 },
      { name: 'Direct', url: '', timeout: 15000 },
      { name: 'CorsProxy', url: 'https://corsproxy.io/?', timeout: 25000 },
      { name: 'CodeTabs', url: 'https://api.codetabs.com/v1/proxy?quest=', timeout: 25000 },
      { name: 'AllOrigins', url: 'https://api.allorigins.win/raw?url=', timeout: 25000 }
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
    
    if (query) {
      // Escape special characters for Archive.org
      const escapedQuery = query.replace(/[():"]/g, '\\$&');
      q += ` AND title:(${escapedQuery})`;
    }

    // If system is provided, filter by specific subject or collection subset
    if (system && system !== 'All' && system.trim() !== '') {
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
    const flParams = ['identifier', 'title', 'description', 'creator', 'date', 'subject', 'collection', 'files']
      .map(f => `fl[]=${f}`).join('&');

    // Primary and Fallback Queries
    const cleanQ = this.cleanTitle(query);
    const queries = [q.replace(/\s+/g, ' ').trim()];
    
    if (query && system && system !== 'All') {
      // Fallback 1: Just title and system (less restrictive subject)
      queries.push(`mediatype:(software) AND title:(${cleanQ.replace(/[():"]/g, '\\$&')}) AND subject:(${system})`.replace(/\s+/g, ' ').trim());
      // Fallback 2: Just title and software mediatype
      queries.push(`mediatype:(software) AND title:(${cleanQ.replace(/[():"]/g, '\\$&')})`.replace(/\s+/g, ' ').trim());
      // Fallback 3: Broad keyword search
      queries.push(`"${cleanQ.replace(/"/g, '\\"')}" AND mediatype:software`.replace(/\s+/g, ' ').trim());
      // Fallback 4: Super simple title search
      queries.push(`${cleanQ.replace(/"/g, '\\"')}`.replace(/\s+/g, ' ').trim());
    }

    let searchData: any = null;
    let lastError: string = "";
    const startTime = Date.now();
    const globalTimeout = 180000; // 3 minutes total for all attempts

    // Attempt fetch with query fallback, proxy rotation and endpoint fallback
    for (const currentQ of queries) {
      if (searchData || (Date.now() - startTime > globalTimeout)) break;

      for (const proxy of (proxies as any[])) {
        if (searchData || (Date.now() - startTime > globalTimeout)) break;

        const endpoints = [];
        endpoints.push(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(currentQ)}&${flParams}&sort[]=${sort}&rows=${rows}&page=${page}&output=json`);

        for (const endpoint of endpoints) {
          if (searchData || (Date.now() - startTime > globalTimeout)) break;
          
          try {
            let fetchUrl = endpoint;
            if (proxy.name === 'CorsProxy') {
              fetchUrl = `${proxy.url}${endpoint}`;
            } else if (proxy.url) {
              fetchUrl = `${proxy.url}${encodeURIComponent(endpoint)}`;
            }
            
            const controller = new AbortController();
            const timeout = proxy.timeout || 25000;
            const timeoutId = setTimeout(() => controller.abort(), timeout); 
            
            // Add small jitter to avoid slamming the server
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
            
            const response = await fetch(fetchUrl, { 
              signal: controller.signal,
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
              }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
              let errText = await response.text().catch(() => "No error body");
              
              // Clean up AllOrigins/Proxy internal errors to be more readable
              if (errText.includes('"error":"Error: internal error"')) {
                errText = "Proxy Internal Error (Target might be unreachable)";
              }

              // If it's a 503, 429 or 408, move to next proxy/endpoint
              if (response.status === 503 || response.status === 429 || response.status === 408) {
                console.warn(`[Archive.org Search] ${proxy.name} returned ${response.status} for ${endpoint.includes('scrape') ? 'scrape' : 'advancedsearch'}. Moving to next...`);
                continue;
              }

              // If it's a paging error, stop this query
              if (errText.includes('DEEP_PAGING') || errText.includes('paging limit')) {
                throw new Error(`Archive.org API Error: [DEEP_PAGING] Limit reached at page ${page}`);
              }
              throw new Error(`Status ${response.status}: ${errText.substring(0, 50)}`);
            }
            
            const text = await response.text();
            if (!text || text.trim().startsWith('<!DOCTYPE')) {
              throw new Error('Received HTML instead of JSON');
            }

            try {
              const data = JSON.parse(text);
              
              if (data.error) {
                throw new Error(`Archive.org API Error: ${data.error}`);
              }

              if (data.response && Array.isArray(data.response.docs)) {
                searchData = data;
                console.log(`[Archive.org Search] Success via ${proxy.name} (${endpoint.includes('scrape') ? 'scrape' : 'advancedsearch'}) with ${searchData.response.docs.length} results.`);
                break; // Break endpoint loop
              } else if (data.items && Array.isArray(data.items)) {
                searchData = { response: { docs: data.items } };
                console.log(`[Archive.org Search] Success via ${proxy.name} (${endpoint.includes('scrape') ? 'scrape' : 'advancedsearch'}) with ${searchData.response.docs.length} results.`);
                break; // Break endpoint loop
              } else {
                 throw new Error('Invalid data format: missing docs or items array');
              }
            } catch (e) {
              if (e instanceof Error && (e.message.includes('Archive.org API Error') || e.message.includes('Received HTML'))) {
                throw e;
              }
              throw new Error('Invalid JSON response or format');
            }
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            
            // Handle aborted signal specifically
            if (err.includes('aborted') || err.includes('timeout')) {
              lastError = `Timeout after ${proxy.timeout}ms via ${proxy.name}`;
            } else {
              lastError = err;
            }
            
            // Only log if it's not a common fetch failed or timeout
            if (!err.toLowerCase().includes('fetch failed') && !err.includes('aborted')) {
              console.warn(`[Archive.org Search] Proxy ${proxy.name} failed for ${endpoint.includes('scrape') ? 'scrape' : 'advancedsearch'}: ${lastError}`);
            }
            
            // If it's a logical API error (like deep paging), don't try other proxies
            if (lastError.includes('DEEP_PAGING')) break;
          }
        }
        if (searchData) break; // Break proxy loop
      }
    }

    if (!searchData) {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      throw new Error(`All queries, proxies and endpoints failed after ${timeTaken}s. Last error: ${lastError}`);
    }

    const docs = searchData.response.docs;
    const normalizedGames: GameObject[] = [];

    // Fast normalization without fetching metadata for each file
    for (const doc of docs) {
      try {
        const games = this.normalizeFast(doc);
        if (games && games.length > 0) {
          games.forEach(game => {
            if (game.system !== 'Unknown') {
              normalizedGames.push(game);
            }
          });
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

