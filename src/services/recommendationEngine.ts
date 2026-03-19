import { gameCatalog } from './gameCatalog';
import { storage } from './storage';

export interface UserPreferences {
  genres: string[];
  era: string;
  playstyle: string;
}

class RecommendationEngine {
  private preferences: UserPreferences | null = null;

  async init() {
    const prefs = await storage.getSetting('user_preferences');
    if (prefs) {
      this.preferences = prefs;
    }
  }

  async getRecommendedGames(limit: number = 8) {
    if (!this.preferences) return [];

    const allGames = await gameCatalog.getGames();
    
    // Algorithm: Score games based on preferences
    const scoredGames = allGames.map(game => {
      let score = 0;

      // Era matching
      if (this.preferences?.era === '8bit' && ['NES', 'Master System'].includes(game.system_id)) score += 10;
      if (this.preferences?.era === '16bit' && ['SNES', 'Genesis'].includes(game.system_id)) score += 10;
      if (this.preferences?.era === '32bit' && ['PS1', 'N64'].includes(game.system_id)) score += 10;
      if (this.preferences?.era === 'handheld' && ['GB', 'GBA'].includes(game.system_id)) score += 10;

      // Genre matching (simulated by checking tags or title keywords since we don't have explicit genres in catalog yet)
      const title = game.title.toLowerCase();
      this.preferences?.genres.forEach(genre => {
        if (title.includes(genre.toLowerCase())) score += 5;
        // Map common genres to keywords
        if (genre === 'racing' && (title.includes('kart') || title.includes('race') || title.includes('drive'))) score += 5;
        if (genre === 'rpg' && (title.includes('fantasy') || title.includes('quest') || title.includes('mana'))) score += 5;
        if (genre === 'platformer' && (title.includes('mario') || title.includes('sonic') || title.includes('jump'))) score += 5;
      });

      // Boost popular games (simulated)
      if (game.play_count > 100) score += 2;

      return { ...game, recommendationScore: score };
    });

    // Sort by score and return top results
    return scoredGames
      .filter(g => g.recommendationScore > 0)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  async updatePreferences(newPrefs: UserPreferences) {
    this.preferences = newPrefs;
    await storage.saveSetting('user_preferences', newPrefs);
  }
}

export const recommendationEngine = new RecommendationEngine();
