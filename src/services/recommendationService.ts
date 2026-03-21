import { gameCatalog } from './gameCatalog';
import { storage } from './storage';
import { GameObject } from './metadataNormalization';
import { GoogleGenAI, Type } from '@google/genai';

class RecommendationService {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    await gameCatalog.init();
    this.initialized = true;
  }

  async getRecommendedGames(userId?: string, limit: number = 10): Promise<GameObject[]> {
    await this.init();
    const allGames = gameCatalog.getAllGames();
    const recent = await storage.getRecentGames(20);
    
    const apiKey = localStorage.getItem('retroos_gemini_key');
    
    if (apiKey && apiKey.startsWith('AIza')) {
      try {
        return await this.getAIRecommendations(apiKey, recent, allGames, limit);
      } catch (e) {
        console.error("AI Recommendation failed, falling back to basic logic", e);
        return this.getBasicRecommendations(recent, allGames, limit);
      }
    } else {
      return this.getBasicRecommendations(recent, allGames, limit);
    }
  }

  private async getAIRecommendations(apiKey: string, recent: any[], allGames: GameObject[], limit: number): Promise<GameObject[]> {
    const ai = new GoogleGenAI({ apiKey });
    
    const playedGameIds = recent.map(r => r.gameId);
    const playedGames = playedGameIds
      .map(id => gameCatalog.getGame(id))
      .filter(Boolean) as GameObject[];
      
    if (playedGames.length === 0) {
      return this.getBasicRecommendations(recent, allGames, limit);
    }

    const playedTitles = playedGames.map(g => g.title).join(', ');
    const availableGames = allGames.filter(g => !playedGameIds.includes(g.game_id)).map(g => ({ id: g.game_id, title: g.title, genre: g.genre }));
    
    // To save tokens, we only send a subset of available games if the catalog is huge
    const sampleAvailable = availableGames.sort(() => 0.5 - Math.random()).slice(0, 50);

    const prompt = `
      El usuario ha jugado recientemente a estos juegos: ${playedTitles}.
      Basado en sus gustos, recomienda ${limit} juegos de la siguiente lista de juegos disponibles:
      ${JSON.stringify(sampleAvailable)}
      
      Devuelve SOLO un array JSON con los IDs de los juegos recomendados.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    try {
      const recommendedIds: string[] = JSON.parse(response.text || '[]');
      const recommendedGames = recommendedIds
        .map(id => gameCatalog.getGame(id))
        .filter(Boolean) as GameObject[];
        
      if (recommendedGames.length > 0) {
        return recommendedGames.slice(0, limit);
      }
    } catch (e) {
      console.error("Failed to parse AI response", e);
    }
    
    return this.getBasicRecommendations(recent, allGames, limit);
  }

  private getBasicRecommendations(recent: any[], allGames: GameObject[], limit: number): GameObject[] {
    if (recent.length === 0) {
      // Cold start: Return high-rated/verified games
      return allGames
        .filter(g => g.compatibility_status === 'verified')
        .sort(() => 0.5 - Math.random())
        .slice(0, limit);
    }

    // Simple genre-based recommendation
    const playedGameIds = recent.map(r => r.gameId);
    const playedGames = playedGameIds
      .map(id => gameCatalog.getGame(id))
      .filter(Boolean) as GameObject[];

    const favoriteGenres = this.getFavoriteGenres(playedGames);
    
    const recommendations = allGames.filter(g => {
      // Don't recommend games already played recently
      if (playedGameIds.includes(g.game_id)) return false;
      
      // Match genres
      const gameGenres = g.genre ? [g.genre] : [];
      return gameGenres.some(genre => favoriteGenres.includes(genre));
    });

    // If not enough recommendations, pad with verified games
    if (recommendations.length < limit) {
      const padding = allGames
        .filter(g => !playedGameIds.includes(g.game_id) && !recommendations.includes(g))
        .sort(() => 0.5 - Math.random())
        .slice(0, limit - recommendations.length);
      return [...recommendations, ...padding].slice(0, limit);
    }

    return recommendations.sort(() => 0.5 - Math.random()).slice(0, limit);
  }

  private getFavoriteGenres(games: GameObject[]): string[] {
    const counts: Record<string, number> = {};
    games.forEach(g => {
      (g.genre ? [g.genre] : []).forEach(genre => {
        counts[genre] = (counts[genre] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
  }

  async getTrendingGames(limit: number = 10): Promise<GameObject[]> {
    await this.init();
    const allGames = gameCatalog.getAllGames();
    // In a real app, this would come from a global "plays" count in Supabase
    // For now, we simulate with verified + random
    return allGames
      .filter(g => g.compatibility_status === 'verified')
      .sort(() => 0.5 - Math.random())
      .slice(0, limit);
  }
}

export const recommendationService = new RecommendationService();
