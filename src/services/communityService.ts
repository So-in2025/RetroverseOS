import { storage } from './storage';
import { neuralService } from './neuralService';

export interface FeedItem {
  id: string;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  date: string;
  prize: string;
  participants: string;
  status: 'REGISTRATION OPEN' | 'UPCOMING' | 'CLOSED' | 'LIVE';
  image: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  rating: number;
  winRate: string;
  main: string;
  avatar: string;
}

export interface AgentLog {
  id: string;
  agent: string;
  action: string;
  timestamp: string;
  status: 'info' | 'warning' | 'success' | 'critical';
}

class CommunityService {
  private FEED_KEY = 'retroverse_feed';
  private TOURNAMENTS_KEY = 'retroverse_tournaments';
  private JOINED_TOURNAMENTS_KEY = 'retroverse_joined_tournaments';

  private defaultFeed: FeedItem[] = [
    {
      id: '1',
      user: 'CyberKai',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      content: '¡Acabo de superar mi récord personal en Tetris! ¿Quién quiere desafiarme? #Dominion #Tetris',
      timestamp: '2 horas atrás',
      likes: 24,
      comments: 12
    },
    {
      id: '2',
      user: 'PixelQueen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      content: 'Buscando equipo para el próximo torneo de Street Fighter II. ¡Mándenme un DM!',
      timestamp: '4 horas atrás',
      likes: 15,
      comments: 8
    }
  ];

  private defaultTournaments: Tournament[] = [
    {
      id: '1',
      title: "Dominion Winter Championship",
      game: "Street Fighter II",
      date: "Mar 15 • 8:00 PM EST",
      prize: "50,000 CR",
      participants: "128/256",
      status: "REGISTRATION OPEN",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800&h=400"
    },
    {
      id: '2',
      title: "Speedrun Sunday: Sonic",
      game: "Sonic the Hedgehog",
      date: "Mar 18 • 2:00 PM EST",
      prize: "10,000 CR",
      participants: "42/100",
      status: "UPCOMING",
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800&h=400"
    }
  ];

  async getFeed(): Promise<FeedItem[]> {
    const stored = await storage.getSetting(this.FEED_KEY);
    return stored || this.defaultFeed;
  }

  async postToFeed(user: string, avatar: string, content: string): Promise<FeedItem> {
    const feed = await this.getFeed();
    const newItem: FeedItem = {
      id: Math.random().toString(36).substr(2, 9),
      user,
      avatar,
      content,
      timestamp: 'Justo ahora',
      likes: 0,
      comments: 0
    };
    const updatedFeed = [newItem, ...feed];
    await storage.saveSetting(this.FEED_KEY, updatedFeed);
    return newItem;
  }

  async getTournaments(): Promise<Tournament[]> {
    const stored = await storage.getSetting(this.TOURNAMENTS_KEY);
    return stored || this.defaultTournaments;
  }

  async joinTournament(tournamentId: string): Promise<boolean> {
    const joined = await storage.getSetting(this.JOINED_TOURNAMENTS_KEY) || [];
    if (joined.includes(tournamentId)) return false;
    
    await storage.saveSetting(this.JOINED_TOURNAMENTS_KEY, [...joined, tournamentId]);
    return true;
  }

  async isJoined(tournamentId: string): Promise<boolean> {
    const joined = await storage.getSetting(this.JOINED_TOURNAMENTS_KEY) || [];
    return joined.includes(tournamentId);
  }

  async generateTournament(): Promise<Tournament> {
    const prompt = `Genera un torneo de videojuegos retro aleatorio. Devuelve un JSON con: title, game, format, prize (en CR), startTime. Sé creativo y usa juegos clásicos.`;
    
    try {
      const response = await neuralService.generateContent(prompt, {
        jsonMode: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            game: { type: 'string' },
            format: { type: 'string' },
            prize: { type: 'string' },
            startTime: { type: 'string' }
          },
          required: ['title', 'game', 'format', 'prize', 'startTime']
        }
      });

      const data = JSON.parse(response);
      const newTournament: Tournament = {
        id: Math.random().toString(36).substr(2, 9),
        title: data.title,
        game: data.game,
        date: data.startTime,
        prize: data.prize,
        participants: "0/64",
        status: 'REGISTRATION OPEN',
        image: `https://picsum.photos/seed/${data.game.replace(/\s+/g, '')}/800/400`
      };

      const tournaments = await this.getTournaments();
      await storage.saveSetting(this.TOURNAMENTS_KEY, [newTournament, ...tournaments]);
      return newTournament;
    } catch (error) {
      console.error('[CommunityService] Failed to generate tournament:', error);
      throw error;
    }
  }

  getLeaderboard(): LeaderboardEntry[] {
    return [
      { rank: 1, name: "NEXUS_ONE", rating: 2850, winRate: "72%", main: "Strategist", avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
      { rank: 2, name: "CyberKai", rating: 2810, winRate: "68%", main: "Aggro", avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
      { rank: 3, name: "PixelQueen", rating: 2795, winRate: "70%", main: "Tactician", avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
      { rank: 4, name: "GlitchRunner", rating: 2750, winRate: "65%", main: "Speed", avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop' },
      { rank: 5, name: "RetroKing", rating: 2720, winRate: "62%", main: "Balanced", avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=100&h=100&fit=crop' },
    ];
  }

  getAgentLogs(): AgentLog[] {
    return [
      { id: '1', agent: 'Director de Torneos', action: 'Analizando picos de actividad en Street Fighter II', timestamp: 'Hace 2m', status: 'info' },
      { id: '2', agent: 'Economista IA', action: 'Ajustando multiplicadores de créditos para el fin de semana', timestamp: 'Hace 5m', status: 'success' },
      { id: '3', agent: 'Sentinel GCTS', action: 'Detectada anomalía en core SNES (reparación automática iniciada)', timestamp: 'Hace 8m', status: 'warning' },
      { id: '4', agent: 'Juez & Moderador', action: 'Bloqueado intento de inyección de código en chat global', timestamp: 'Hace 12m', status: 'critical' },
      { id: '5', agent: 'DevOps Enjambre', action: 'Escalando nodos en región US-East (128 activos)', timestamp: 'Hace 15m', status: 'info' },
    ];
  }
}

export const communityService = new CommunityService();
