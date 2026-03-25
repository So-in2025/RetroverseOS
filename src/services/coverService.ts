/**
 * Service to resolve high-quality game cover art from reliable sources.
 * Prioritizes Libretro Thumbnails for consistency with the emulator ecosystem.
 */

const LIBRETRO_SYSTEM_MAP: Record<string, string> = {
  'NES': 'Nintendo_-_Nintendo_Entertainment_System',
  'nes': 'Nintendo_-_Nintendo_Entertainment_System',
  'SNES': 'Nintendo_-_Super_Nintendo_Entertainment_System',
  'snes': 'Nintendo_-_Super_Nintendo_Entertainment_System',
  'GBA': 'Nintendo_-_Game_Boy_Advance',
  'gba': 'Nintendo_-_Game_Boy_Advance',
  'GB': 'Nintendo_-_Game_Boy',
  'gb': 'Nintendo_-_Game_Boy',
  'GBC': 'Nintendo_-_Game_Boy_Color',
  'gbc': 'Nintendo_-_Game_Boy_Color',
  'Genesis': 'Sega_-_Mega_Drive_-_Genesis',
  'sega_genesis': 'Sega_-_Mega_Drive_-_Genesis',
  'PS1': 'Sony_-_PlayStation',
  'psx': 'Sony_-_PlayStation',
  'PS2': 'Sony_-_PlayStation_2',
  'ps2': 'Sony_-_PlayStation_2',
  'Atari 2600': 'Atari_-_2600',
  'atari_2600': 'Atari_-_2600',
  'Atari 7800': 'Atari_-_7800',
  'atari_7800': 'Atari_-_7800',
  'N64': 'Nintendo_-_Nintendo_64',
  'n64': 'Nintendo_-_Nintendo_64',
  'Master System': 'Sega_-_Master_System_-_Mark_III',
  'mastersystem': 'Sega_-_Master_System_-_Mark_III',
  'Game Gear': 'Sega_-_Game_Gear',
  'gamegear': 'Sega_-_Game_Gear',
  'WonderSwan': 'Bandai_-_WonderSwan',
  'wonderswan': 'Bandai_-_WonderSwan',
  'WonderSwan Color': 'Bandai_-_WonderSwan_Color',
  'wonderswancolor': 'Bandai_-_WonderSwan_Color',
  'Neo Geo Pocket': 'SNK_-_Neo_Geo_Pocket',
  'ngp': 'SNK_-_Neo_Geo_Pocket',
  'Neo Geo Pocket Color': 'SNK_-_Neo_Geo_Pocket_Color',
  'ngpc': 'SNK_-_Neo_Geo_Pocket_Color',
  'PC Engine': 'NEC_-_PC_Engine_-_TurboGrafx_16',
  'pcengine': 'NEC_-_PC_Engine_-_TurboGrafx_16',
  'PC Engine SuperGrafx': 'NEC_-_PC_Engine_SuperGrafx',
  'supergrafx': 'NEC_-_PC_Engine_SuperGrafx',
  'Atari Lynx': 'Atari_-_Lynx',
  'lynx': 'Atari_-_Lynx',
  'NeoGeo': 'SNK_-_Neo_Geo',
  'neogeo': 'SNK_-_Neo_Geo',
  'MAME': 'MAME',
  'mame': 'MAME',
  'arcade': 'MAME'
};

export class CoverService {
  /**
   * Normalizes the title to match common file naming conventions.
   * Keeps spaces for Libretro compatibility.
   */
  public static normalizeTitle(title: string): string {
    if (!title) return '';
    
    // Si el título tiene muchos paréntesis o corchetes, probablemente es un nombre de archivo de Archive.org
    // Intentamos quedarnos solo con la primera parte.
    let baseTitle = title;
    
    // Si detectamos patrones típicos de Archive.org (muchos tags), limpiamos agresivamente
    if ((title.match(/\(/g) || []).length + (title.match(/\[/g) || []).length > 1) {
      // Intentamos extraer la parte antes del primer tag que parezca "ruido"
      const parts = title.split(/[(\[]/);
      baseTitle = parts[0].trim();
    }

    return baseTitle
      .replace(/\.(nes|sfc|smc|bin|iso|gba|gbc|gb|gen|md|a26|a78|lnx|n64|z64|zip|7z|chd|cue)$/i, '') // Remove extensions
      .replace(/\([^)]*\)/g, '') // Remove (USA), (Europe), etc.
      .replace(/\[[^\]]*\]/g, '') // Remove [!], [b1], etc.
      .replace(/Screenshot|Official|Beta|Demo|Sample|Promo|Review|Preview|Debug|Build|v\d+\.\d+|V\d+/gi, '') // Remove non-game keywords
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, ' '); // Keep spaces (Libretro uses spaces)
  }

  /**
   * Safe encoding for GitHub/Libretro URLs.
   * Libretro thumbnails use very specific encoding rules.
   */
  private static safeEncode(str: string): string {
    if (!str) return '';
    
    // Libretro naming rules for special characters:
    // & -> _
    // * -> _
    // / -> _
    // : -> _
    // < -> _
    // > -> _
    // ? -> _
    // | -> _
    // " -> _
    const libretroClean = str.replace(/[&*/:`<>?\|"#]/g, '_');

    return encodeURIComponent(libretroClean)
      .replace(/%20/g, '%20') // Ensure spaces are encoded
      .replace(/%28/g, '(')
      .replace(/%29/g, ')')
      .replace(/%2C/g, ',')
      .replace(/%27/g, "'")
      .replace(/%5B/g, '[')
      .replace(/%5D/g, ']')
      .replace(/%2B/g, '+');
  }

  /**
   * Generates a real cascade of cover sources.
   */
  public static getCoverSources(title: string, system: string, archiveIdentifier?: string, primaryUrl?: string | null): string[] {
    const sources: string[] = [];
    
    // 0. Primary URL (if provided by game data)
    if (primaryUrl) {
      sources.push(primaryUrl);
    }

    const libretroSystem = LIBRETRO_SYSTEM_MAP[system] || system.replace(/\s+/g, '_');
    const libretroBase = `https://raw.githubusercontent.com/libretro-thumbnails/${libretroSystem}/master/Named_Boxarts`;

    // 1. Libretro thumbnails (GitHub CDN)
    // Try original title first
    const titleWithoutExt = title.replace(/\.(nes|sfc|smc|bin|iso|gba|gbc|gb|gen|md|a26|a78|lnx|n64|z64|zip|7z|chd|cue)$/i, '').trim();
    const firstLibretro = `${libretroBase}/${this.safeEncode(titleWithoutExt)}.png`;
    sources.push(firstLibretro);
    
    // Add proxied version of the first source immediately as it's the most likely to work but might have CORS/Network issues
    sources.push(`https://wsrv.nl/?url=${encodeURIComponent(firstLibretro)}&w=400&output=webp&n=-1`);

    // Handle multiple regions like (USA, Europe)
    if (titleWithoutExt.includes('(USA, Europe)')) {
      sources.push(`${libretroBase}/${this.safeEncode(titleWithoutExt.replace('(USA, Europe)', '(USA)'))}.png`);
      sources.push(`${libretroBase}/${this.safeEncode(titleWithoutExt.replace('(USA, Europe)', '(World)'))}.png`);
    }

    // Try clean title (without parentheses)
    const cleanTitle = titleWithoutExt.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    
    sources.push(`${libretroBase}/${this.safeEncode(cleanTitle + ' (USA)')}.png`);
    sources.push(`${libretroBase}/${this.safeEncode(cleanTitle + ' (World)')}.png`);
    sources.push(`${libretroBase}/${this.safeEncode(cleanTitle)}.png`);

    // Try fully normalized title
    const normalizedTitle = this.normalizeTitle(title);
    sources.push(`${libretroBase}/${this.safeEncode(normalizedTitle)}.png`);
    sources.push(`${libretroBase}/${this.safeEncode(normalizedTitle + ' (USA)')}.png`);

    // 2. Archive.org
    if (archiveIdentifier) {
      sources.push(`https://archive.org/services/img/${archiveIdentifier}`);
      // Try to find a PNG in the download folder (common for some sets)
      const archiveTitle = normalizedTitle.replace(/\s+/g, '_');
      sources.push(`https://archive.org/download/${archiveIdentifier}/${archiveTitle}.png`);
    }

    // 3. GitHub mirrors alternativos
    sources.push(`https://cdn.libretro.com/thumbnails/${libretroSystem}/Named_Boxarts/${this.safeEncode(cleanTitle)} (USA).png`);
    sources.push(`https://cdn.libretro.com/thumbnails/${libretroSystem}/Named_Boxarts/${this.safeEncode(titleWithoutExt)}.png`);

    // 4. wsrv.nl (Proxy para fuentes externas)
    // Añadimos versiones proxied de las fuentes más probables
    const topSources = sources.slice(0, 5);
    topSources.forEach(src => {
      if (src.startsWith('http')) {
        sources.push(`https://wsrv.nl/?url=${encodeURIComponent(src)}&w=400&output=webp&n=-1`);
      }
    });

    // 4.5 Backend Tunnel (Last resort proxy if wsrv.nl is blocked or fails)
    topSources.forEach(src => {
      if (src.startsWith('http')) {
        sources.push(`/api/tunnel?url=${encodeURIComponent(src)}`);
      }
    });
    
    // 5. Placeholder local
    sources.push('/placeholder-cover.png');

    return [...new Set(sources.filter(Boolean))]; // Remove duplicates and nulls
  }

  /**
   * Generates a list of potential cover URLs to try in order.
   * Legacy method for backward compatibility.
   */
  public static getCoverCandidates(title: string, system: string, archiveIdentifier?: string): string[] {
    return this.getCoverSources(title, system, archiveIdentifier);
  }

  /**
   * Legacy method for backward compatibility
   */
  public static getCoverUrl(title: string, system: string, archiveIdentifier?: string): string {
    return this.getCoverSources(title, system, archiveIdentifier)[0];
  }
}
