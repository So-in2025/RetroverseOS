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
    
    let baseTitle = title;
    
    // 1. Remove common file extensions
    baseTitle = baseTitle.replace(/\.(nes|sfc|smc|bin|iso|gba|gbc|gb|gen|md|a26|a78|lnx|n64|z64|zip|7z|chd|cue)$/i, '');

    // 2. Remove common tags in parentheses or brackets
    // But keep things like (USA) if we want to try specific matches later
    baseTitle = baseTitle.replace(/\s*[(\[].*?[)\]]/g, ' ').trim();

    // 3. Remove non-game keywords and special characters
    // NOTE: We keep '-' because Libretro uses it for subtitles (e.g. "Game - Subtitle")
    return baseTitle
      .replace(/Screenshot|Official|Beta|Demo|Sample|Promo|Review|Preview|Debug|Build|v\d+\.\d+|V\d+/gi, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '') 
      .replace(/\s+/g, ' ')
      .trim();
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
    // # -> _
    const libretroClean = str.replace(/[&*/:`<>?\|"#]/g, '_');

    return encodeURIComponent(libretroClean)
      .replace(/%20/g, '%20') 
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
    const libretroTitlesBase = `https://raw.githubusercontent.com/libretro-thumbnails/${libretroSystem}/master/Named_Titles`;
    const libretroSnapsBase = `https://raw.githubusercontent.com/libretro-thumbnails/${libretroSystem}/master/Named_Snaps`;

    // 1. Libretro thumbnails (GitHub CDN)
    const titleWithoutExt = title.replace(/\.(nes|sfc|smc|bin|iso|gba|gbc|gb|gen|md|a26|a78|lnx|n64|z64|zip|7z|chd|cue)$/i, '').trim();
    
    // Try exact title from Archive.org (often contains (USA) etc)
    sources.push(`${libretroBase}/${this.safeEncode(titleWithoutExt)}.png`);
    sources.push(`${libretroTitlesBase}/${this.safeEncode(titleWithoutExt)}.png`);
    
    // Try clean title (without tags)
    const cleanTitle = titleWithoutExt.replace(/\s*[(\[].*?[)\]]/g, '').trim();
    
    // Try common region variations
    const regions = [' (USA)', ' (World)', ' (Europe)', ' (Japan) (En)', ' (Japan)', ''];
    regions.forEach(region => {
      sources.push(`${libretroBase}/${this.safeEncode(cleanTitle + region)}.png`);
      sources.push(`${libretroTitlesBase}/${this.safeEncode(cleanTitle + region)}.png`);
    });

    // Try normalized title
    const normalizedTitle = this.normalizeTitle(title);
    sources.push(`${libretroBase}/${this.safeEncode(normalizedTitle)}.png`);
    sources.push(`${libretroBase}/${this.safeEncode(normalizedTitle + ' (USA)')}.png`);
    
    // Try with " - " replacement (some games use ":" which Libretro replaces with " - ")
    if (titleWithoutExt.includes(':')) {
      const dashTitle = titleWithoutExt.replace(/:/g, ' -');
      sources.push(`${libretroBase}/${this.safeEncode(dashTitle)}.png`);
    }

    // 2. Archive.org
    if (archiveIdentifier) {
      // Archive.org auto-generated thumb (usually the best fallback)
      sources.push(`https://archive.org/services/img/${archiveIdentifier}`);
      
      // Try specific common filenames in the item
      const archiveTitle = normalizedTitle.replace(/\s+/g, '_');
      sources.push(`https://archive.org/download/${archiveIdentifier}/${archiveTitle}.png`);
      sources.push(`https://archive.org/download/${archiveIdentifier}/cover.jpg`);
      sources.push(`https://archive.org/download/${archiveIdentifier}/boxart.jpg`);
      sources.push(`https://archive.org/download/${archiveIdentifier}/front.jpg`);
      
      // Try the __ia_thumb.jpg which is almost always present
      sources.push(`https://archive.org/download/${archiveIdentifier}/__ia_thumb.jpg`);
    }

    // 3. Alternative CDN (Libretro official)
    sources.push(`https://cdn.libretro.com/thumbnails/${libretroSystem}/Named_Boxarts/${this.safeEncode(cleanTitle)} (USA).png`);
    sources.push(`https://cdn.libretro.com/thumbnails/${libretroSystem}/Named_Boxarts/${this.safeEncode(titleWithoutExt)}.png`);
    sources.push(`${libretroSnapsBase}/${this.safeEncode(cleanTitle)}.png`);

    // 4. OpenGameArt / IGDB Proxy
    // Use wsrv.nl to proxy and resize everything for better performance and CORS bypass
    const finalSources: string[] = [];
    
    // Add original sources but wrapped in wsrv.nl for CORS and speed
    sources.forEach(src => {
      if (src && src.startsWith('http')) {
        // We prioritize the proxied version because it's more reliable for CORS
        finalSources.push(`https://wsrv.nl/?url=${encodeURIComponent(src)}&w=400&output=webp&n=-1`);
        finalSources.push(src);
      }
    });

    // 5. Placeholder local
    finalSources.push('/placeholder-cover.png');

    return [...new Set(finalSources.filter(Boolean))];
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
