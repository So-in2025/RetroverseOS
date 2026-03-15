/**
 * Service to resolve high-quality game cover art from reliable sources.
 * Prioritizes Libretro Thumbnails for consistency with the emulator ecosystem.
 */

const LIBRETRO_SYSTEM_MAP: Record<string, string> = {
  'NES': 'Nintendo_-_Nintendo_Entertainment_System',
  'SNES': 'Nintendo_-_Super_Nintendo_Entertainment_System',
  'GBA': 'Nintendo_-_Game_Boy_Advance',
  'GB': 'Nintendo_-_Game_Boy',
  'GBC': 'Nintendo_-_Game_Boy_Color',
  'Genesis': 'Sega_-_Mega_Drive_-_Genesis',
  'PS1': 'Sony_-_PlayStation',
  'PS2': 'Sony_-_PlayStation_2',
  'Atari 2600': 'Atari_-_2600'
};

export class CoverService {
  /**
   * Resolves the best possible cover URL for a game.
   */
  public static getCoverUrl(title: string, system: string, archiveIdentifier?: string): string {
    // 1. Try Libretro Thumbnails (High Quality Box Art)
    const libretroSystem = LIBRETRO_SYSTEM_MAP[system];
    if (libretroSystem) {
      const cleanTitle = this.normalizeTitleForLibretro(title);
      // We return the primary one, but the frontend can try fallbacks if this fails
      // However, since we can't easily try multiple URLs in a single string, 
      // we'll use a more robust normalization or a specific region priority.
      return `https://raw.githubusercontent.com/libretro-thumbnails/${libretroSystem}/master/Named_Boxarts/${encodeURIComponent(cleanTitle)} (USA).png`;
    }

    // 2. Fallback to Archive.org Image Service
    if (archiveIdentifier) {
      return `https://archive.org/services/img/${archiveIdentifier}`;
    }

    return 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=600';
  }

  /**
   * Generates a list of potential cover URLs to try in order.
   */
  public static getCoverCandidates(title: string, system: string, archiveIdentifier?: string): string[] {
    const candidates: string[] = [];
    const libretroSystem = LIBRETRO_SYSTEM_MAP[system];

    if (libretroSystem) {
      const cleanTitle = this.normalizeTitleForLibretro(title);
      const regions = [' (USA)', ' (World)', ' (Europe)', ' (Japan)', ''];
      
      regions.forEach(region => {
        candidates.push(`https://raw.githubusercontent.com/libretro-thumbnails/${libretroSystem}/master/Named_Boxarts/${encodeURIComponent(cleanTitle)}${region}.png`);
      });
    }

    if (archiveIdentifier) {
      candidates.push(`https://archive.org/services/img/${archiveIdentifier}`);
    }

    candidates.push('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=600');
    
    return candidates;
  }

  /**
   * Normalizes the title to match Libretro's "Named Boxarts" convention.
   * Usually: "Title, The" -> "The Title" and removing extra tags.
   */
  private static normalizeTitleForLibretro(title: string): string {
    let normalized = title
      .replace(/\([^)]*\)/g, '') // Remove (USA), (Europe), etc.
      .replace(/\[[^\]]*\]/g, '') // Remove [!], [b1], etc.
      .trim();

    // Handle "Title, The" -> "The Title"
    if (normalized.includes(', The')) {
      normalized = 'The ' + normalized.replace(', The', '');
    }

    return normalized;
  }

  /**
   * Validates if a cover URL is actually reachable.
   * Useful for falling back if Libretro doesn't have the specific game.
   */
  public static async validateCover(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}
