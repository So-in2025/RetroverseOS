import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Users, Calendar, Trophy, Medal, Crown, Swords, ArrowRight, Activity, ShieldAlert, TrendingUp, Cpu, Server, Share2, Send, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioEngine } from '../services/audioEngine';
import { haptics } from '../services/haptics';
import { communityService, FeedItem, Tournament, LeaderboardEntry, AgentLog } from '../services/communityService';
import { useAuthStore } from '../store/authStore';
import TournamentBracket from '../components/community/TournamentBracket';
import { BYOKModal } from '../components/ai/BYOKModal';

import { useGameStore } from '../store/gameStore';

export default function Community() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { sentinelStats } = useGameStore();
  const [activeTab, setActiveTab] = useState<'feed' | 'tournaments' | 'leaderboards' | 'mission-control'>('feed');
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [isGeneratingTournament, setIsGeneratingTournament] = useState(false);
  const [showGeneratedTournament, setShowGeneratedTournament] = useState(false);
  const [generatedTournament, setGeneratedTournament] = useState<Tournament | null>(null);
  const [showBYOKModal, setShowBYOKModal] = useState(false);
  
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [postContent, setPostContent] = useState('');
  const [joinedTournaments, setJoinedTournaments] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [feedData, tournamentsData, agentLogsData] = await Promise.all([
        communityService.getFeed(),
        communityService.getTournaments(),
        Promise.resolve(communityService.getAgentLogs())
      ]);
      
      setFeed(feedData);
      setTournaments(tournamentsData);
      setLeaderboard(communityService.getLeaderboard());
      setAgentLogs(agentLogsData);
      
      // Check joined status
      const joined = await Promise.all(
        tournamentsData.map(async (t) => {
          const joined = await communityService.isJoined(t.id);
          return joined ? t.id : null;
        })
      );
      setJoinedTournaments(joined.filter((id): id is string => id !== null));
    };

    loadData();
  }, []);

  useEffect(() => {
    if (location.pathname.includes('tournaments')) {
      setActiveTab('tournaments');
    }
  }, [location]);

  const handlePost = async () => {
    if (!postContent.trim() || !user) return;
    
    const newItem = await communityService.postToFeed(
      user.username,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
      postContent
    );
    
    setFeed([newItem, ...feed]);
    setPostContent('');
    AudioEngine.playSelectSound();
    haptics.success();
  };

  const handleJoinTournament = async (tournamentId: string) => {
    const success = await communityService.joinTournament(tournamentId);
    if (success) {
      setJoinedTournaments([...joinedTournaments, tournamentId]);
      AudioEngine.playSelectSound();
      haptics.success();
    }
  };

  const handleGenerateTournament = async () => {
    setIsGeneratingTournament(true);
    AudioEngine.playSelectSound();
    haptics.light();
    
    try {
      const newTournament = await communityService.generateTournament();
      setGeneratedTournament(newTournament);
      const updatedTournaments = await communityService.getTournaments();
      setTournaments(updatedTournaments);
      setShowGeneratedTournament(true);
      haptics.success();
    } catch (e: any) {
      console.error("AI Generation failed:", e);
      if (e.message === 'NO_NODES_AVAILABLE' || e.message === 'BYOK_REQUIRED') {
        setShowBYOKModal(true);
      }
      haptics.error();
    } finally {
      setIsGeneratingTournament(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:static lg:inset-auto w-full bg-zinc-950 text-white font-sans z-40 overflow-y-auto lg:overflow-visible scrollbar-hide">
      {/* Native Header */}
      <div className="pt-14 pb-4 px-4 md:pt-10 md:px-8 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-1">Centro de la Comunidad</h1>
          <p className="text-zinc-400 text-sm font-medium">Conecta. Compite. Domina.</p>
        </div>
      </div>

      {/* Sticky Tabs - Native Feel */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-b border-white/5 mb-6">
        <div className="max-w-7xl mx-auto flex overflow-x-auto px-4 py-3 gap-3 [&::-webkit-scrollbar]:hidden md:px-8">
          {[
            { id: 'feed', label: 'ACTIVIDAD', icon: MessageSquare },
            { id: 'tournaments', label: 'TORNEOS', icon: Swords },
            { id: 'leaderboards', label: 'CLASIFICACIÓN', icon: Trophy },
            { id: 'mission-control', label: 'MISSION CONTROL', icon: Cpu },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                AudioEngine.playSelectSound();
                haptics.light();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs tracking-wider transition-all whitespace-nowrap flex-none ${
                activeTab === tab.id 
                  ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                  : 'bg-zinc-900 text-zinc-500 border border-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-40 lg:pb-12">
        <AnimatePresence mode="popLayout">
          
          {/* FEED TAB */}
          {activeTab === 'feed' && (
            <motion.div 
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 w-full"
            >
              {/* Main Feed */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                {/* Live Activity Ticker */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 overflow-hidden relative">
                  <div className="flex items-center gap-3 whitespace-nowrap animate-marquee">
                    <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                      <Activity className="w-3 h-3" /> LIVE:
                    </div>
                    <span className="text-zinc-300 text-[10px] font-medium uppercase tracking-wider">
                      NEXUS_ONE acaba de ganar el torneo relámpago de Pac-Man • PixelQueen subió a Rango Diamante • Nuevo récord en Donkey Kong por RetroKing • 128 nuevos jugadores se unieron hoy •
                    </span>
                    {/* Duplicate for seamless loop */}
                    <span className="text-zinc-300 text-[10px] font-medium uppercase tracking-wider">
                      NEXUS_ONE acaba de ganar el torneo relámpago de Pac-Man • PixelQueen subió a Rango Diamante • Nuevo récord en Donkey Kong por RetroKing • 128 nuevos jugadores se unieron hoy •
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 md:p-6">
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center font-bold text-xs md:text-sm uppercase">
                      {user?.username.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <textarea 
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Comparte tu última puntuación más alta..." 
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none h-20 md:h-24 text-sm"
                      />
                      <div className="flex justify-end mt-2">
                        <button 
                          onClick={handlePost}
                          disabled={!postContent.trim()}
                          className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-xs md:text-sm transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Publicar Actualización
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feed Items */}
                {feed.map((item) => (
                  <div key={item.id} className="bg-zinc-900 border border-white/5 rounded-xl p-4 md:p-6 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={item.avatar} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover bg-zinc-800" alt={item.user} referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-bold text-white text-sm md:text-base">{item.user}</p>
                        <p className="text-[10px] md:text-xs text-zinc-500">{item.timestamp}</p>
                      </div>
                    </div>
                    <p className="text-zinc-300 mb-4 leading-relaxed text-sm md:text-base">{item.content}</p>
                    <div className="flex gap-4 md:gap-6 text-zinc-500 text-xs md:text-sm">
                      <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                        <Heart className="w-3 h-3 md:w-4 md:h-4" /> {item.likes}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                        <MessageSquare className="w-3 h-3 md:w-4 md:h-4" /> {item.comments}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">Compartir</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 md:p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-emerald-400 uppercase text-xs md:text-sm tracking-wider">
                    <Users className="w-4 h-4" />
                    Conectados Ahora
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
                      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
                      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
                      'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=100&h=100&fit=crop',
                      'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=100&h=100&fit=crop',
                      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100&h=100&fit=crop'
                    ].map((url, i) => (
                      <img key={i} src={url} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 hover:border-emerald-500 transition-colors cursor-pointer object-cover" title={`Jugador ${i}`} />
                    ))}
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-xs text-zinc-500 font-bold">
                      +42
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TOURNAMENTS TAB */}
          {activeTab === 'tournaments' && (
            <motion.div 
              key="tournaments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full space-y-6"
            >
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 p-4 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white">Torneos Oficiales</h2>
                  <p className="text-xs text-zinc-400">Compite por premios en créditos y gloria eterna.</p>
                </div>
                <button 
                  onClick={handleGenerateTournament}
                  disabled={isGeneratingTournament}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black font-bold rounded-xl transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingTournament ? (
                    <>
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4" />
                      Generar Torneo IA
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:gap-6 w-full">
                {tournaments.map((t) => (
                <div key={t.id} className="group relative bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-900/10">
                    <div className="absolute inset-0 z-0">
                      <img src={t.image} alt={t.title} className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity group-hover:scale-105 duration-700" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent" />
                    </div>
                    
                    <div className="relative z-10 p-5 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                      <div className="space-y-2 w-full">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded text-[10px] md:text-xs font-bold tracking-wider border ${
                            t.status === 'REGISTRATION OPEN' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 
                            t.status === 'CLOSED' ? 'bg-red-500/20 text-red-400 border-red-500/20' : 
                            'bg-blue-500/20 text-blue-400 border-blue-500/20'
                          }`}>
                            {t.status === 'REGISTRATION OPEN' ? 'INSCRIPCIÓN ABIERTA' : t.status === 'CLOSED' ? 'CERRADO' : 'PRÓXIMO'}
                          </span>
                          <span className="text-zinc-400 text-xs md:text-sm flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {t.date}
                          </span>
                        </div>
                        <h2 className="text-xl md:text-3xl font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{t.title}</h2>
                        <p className="text-zinc-400 flex items-center gap-2 text-sm">
                          <Swords className="w-4 h-4" /> {t.game}
                        </p>
                      </div>

                      <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-8 mt-2 md:mt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pozo de Premios</p>
                          <p className="text-lg md:text-2xl font-mono text-emerald-400 font-bold">{t.prize}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedTournament(t.title)}
                            className="px-4 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all text-sm"
                          >
                            Cuadro
                          </button>
                          {joinedTournaments.includes(t.id) ? (
                            <button className="px-6 py-3 bg-emerald-500/20 text-emerald-400 font-bold rounded-xl border border-emerald-500/30 cursor-default flex items-center gap-2 text-sm">
                              Inscrito <Medal className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleJoinTournament(t.id)}
                              className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 text-sm"
                            >
                              Inscribirse <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                </div>
              ))}
              </div>
            </motion.div>
          )}

          {/* LEADERBOARDS TAB */}
          {activeTab === 'leaderboards' && (
            <motion.div 
              key="leaderboards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 md:p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/20">
                  <h3 className="font-bold text-lg md:text-xl flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Clasificaciones Globales
                  </h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-3 py-1.5 bg-white/10 rounded text-xs md:text-sm hover:bg-white/20 transition-colors">Global</button>
                    <button className="flex-1 sm:flex-none px-3 py-1.5 bg-transparent text-zinc-500 hover:text-white transition-colors text-xs md:text-sm">Amigos</button>
                  </div>
                </div>

                <div className="flex flex-col">
                  {/* Header Row (Desktop Only) */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5 bg-zinc-950/30">
                    <div className="col-span-1 font-medium">Rango</div>
                    <div className="col-span-5 font-medium">Jugador</div>
                    <div className="col-span-2 font-medium">Puntaje</div>
                    <div className="col-span-2 font-medium">Tasa de Victorias</div>
                    <div className="col-span-2 font-medium">Rol Principal</div>
                  </div>

                  {/* Leaderboard Rows */}
                  {leaderboard.map((player, i) => (
                    <div key={player.rank} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 md:px-6 md:py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group cursor-pointer relative">
                      
                      {/* Mobile Rank Badge */}
                      <div className="absolute top-4 right-4 md:hidden">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${player.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' : 
                            player.rank === 2 ? 'bg-zinc-400/20 text-zinc-300' : 
                            player.rank === 3 ? 'bg-amber-700/20 text-amber-600' : 'bg-zinc-800 text-zinc-500'}`}>
                          #{player.rank}
                        </div>
                      </div>

                      {/* Desktop Rank */}
                      <div className="hidden md:flex col-span-1 items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${player.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' : 
                            player.rank === 2 ? 'bg-zinc-400/20 text-zinc-300' : 
                            player.rank === 3 ? 'bg-amber-700/20 text-amber-600' : 'text-zinc-500'}`}>
                          {player.rank}
                        </div>
                      </div>

                      {/* Player Info */}
                      <div className="col-span-5 flex items-center gap-3">
                        <img 
                          src={player.avatar} 
                          className="w-10 h-10 md:w-8 md:h-8 rounded object-cover bg-zinc-800" 
                          alt={player.name}
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span className="font-bold text-white group-hover:text-emerald-400 transition-colors block md:inline text-sm md:text-base">{player.name}</span>
                          <span className="md:hidden text-xs text-zinc-500 block mt-0.5">{player.main}</span>
                        </div>
                      </div>

                      {/* Stats Grid (Mobile) / Columns (Desktop) */}
                      <div className="flex items-center justify-between md:contents mt-2 md:mt-0">
                        <div className="col-span-2 flex flex-col md:block">
                          <span className="md:hidden text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Puntaje</span>
                          <span className="font-mono text-emerald-400 font-bold text-sm md:text-base">{player.rating}</span>
                        </div>
                        <div className="col-span-2 flex flex-col md:block text-right md:text-left">
                          <span className="md:hidden text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Tasa de Victorias</span>
                          <span className="text-zinc-300 text-sm md:text-base">{player.winRate}</span>
                        </div>
                        <div className="hidden md:block col-span-2 text-zinc-400 text-sm">{player.main}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* MISSION CONTROL TAB */}
          {activeTab === 'mission-control' && (
            <motion.div 
              key="mission-control"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full space-y-6"
            >
              <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200')] bg-cover opacity-5" />
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 to-zinc-900/90" />
                
                <div className="relative z-10 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                        <Cpu className="w-8 h-8 text-emerald-400" />
                        Mission Control IA
                      </h2>
                      <p className="text-zinc-400 mt-2 max-w-2xl">
                        Supervisión en tiempo real del ecosistema de Agentes IA que gestionan la economía, torneos, tendencias y moderación de Retroverse.
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-xs font-bold tracking-wider">SISTEMA ONLINE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Agent 1: Director de Torneos */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-5 hover:border-emerald-500/50 transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">Director de Torneos</h3>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Agente Operativo</span>
                          </div>
                        </div>
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-zinc-400 mb-4 h-12">
                        Analizando picos de jugadores en Street Fighter II. Generando torneo relámpago con buy-in de 50 CR.
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Estado:</span>
                        <span className="text-blue-400 font-mono">Creando Brackets</span>
                      </div>
                    </div>

                    {/* Agent 2: Cazador de Tendencias */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-5 hover:border-emerald-500/50 transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">Cazador de Tendencias</h3>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Agente Analítico</span>
                          </div>
                        </div>
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-zinc-400 mb-4 h-12">
                        Detectada viralidad en TikTok para "Sonic Speedruns". Empaquetando "Sega Sonic Collection" para el Marketplace.
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Estado:</span>
                        <span className="text-purple-400 font-mono">Actualizando Tienda</span>
                      </div>
                    </div>

                    {/* Agent 3: Economista */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-5 hover:border-emerald-500/50 transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                            <Crown className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">Economista IA</h3>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Agente Financiero</span>
                          </div>
                        </div>
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-zinc-400 mb-4 h-12">
                        Ajustando precios de Retro Pass por región. Optimizando recompensas de referidos para maximizar retención.
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Estado:</span>
                        <span className="text-amber-400 font-mono">Balanceando Economía</span>
                      </div>
                    </div>

                    {/* Agent 4: Juez y Moderador */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-5 hover:border-emerald-500/50 transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">Juez & Moderador</h3>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Agente de Seguridad</span>
                          </div>
                        </div>
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-zinc-400 mb-4 h-12">
                        Monitoreando inputs en torneos de alto nivel. 0 anomalías detectadas. Chat global limpio de toxicidad.
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Estado:</span>
                        <span className="text-emerald-400 font-mono">Vigilancia Activa</span>
                      </div>
                    </div>

                    {/* Agent 5: Sentinel GCTS */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-5 hover:border-emerald-500/50 transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">Sentinel GCTS</h3>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Agente de Compatibilidad</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <Activity className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-500">
                          <span>Testeados Hoy</span>
                          <span className="text-white font-mono">{sentinelStats.testedToday}</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(sentinelStats.successful / (sentinelStats.testedToday || 1)) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-500">
                          <span>Éxito / Reparaciones</span>
                          <span className="text-emerald-400 font-mono">{sentinelStats.successful} / {sentinelStats.repairs}</span>
                        </div>
                      </div>
                    </div>

                    {/* Agent 6: DevOps */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-5 hover:border-emerald-500/50 transition-colors group lg:col-span-2">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Server className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">DevOps Enjambre</h3>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Agente de Infraestructura</span>
                          </div>
                        </div>
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                      </div>
                      <div className="flex flex-col md:flex-row gap-6">
                        <p className="text-xs text-zinc-400 flex-1">
                          Escalando nodos en US-East debido a pico de tráfico por torneo de Smash Bros. Latencia promedio mantenida en ~15ms.
                        </p>
                        <div className="flex gap-4 flex-1">
                          <div className="bg-zinc-900/50 rounded p-2 flex-1 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase">Carga CPU</div>
                            <div className="text-emerald-400 font-mono text-sm">42%</div>
                          </div>
                          <div className="bg-zinc-900/50 rounded p-2 flex-1 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase">Nodos Activos</div>
                            <div className="text-emerald-400 font-mono text-sm">128</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent Logs */}
                  <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Registros de Actividad de Agentes
                      </h3>
                      <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
                        {agentLogs.map((log) => (
                          <div key={log.id} className="flex items-center gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                              log.status === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                              log.status === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                              'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-bold text-xs text-white uppercase tracking-wider">{log.agent}</span>
                                <span className="text-[10px] text-zinc-600 font-mono">{log.timestamp}</span>
                              </div>
                              <p className="text-xs text-zinc-400 truncate">{log.action}</p>
                            </div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                              log.status === 'success' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' :
                              log.status === 'warning' ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' :
                              log.status === 'critical' ? 'text-red-400 border-red-400/20 bg-red-400/5' :
                              'text-blue-400 border-blue-400/20 bg-blue-400/5'
                            }`}>
                              {log.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        Estado del Enjambre
                      </h3>
                      <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 font-mono text-[10px] space-y-2 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between text-emerald-500/50">
                          <span>[SYS] AUTH_SERVICE</span>
                          <span>STABLE</span>
                        </div>
                        <div className="flex justify-between text-emerald-500/50">
                          <span>[SYS] MATCHMAKING_V3</span>
                          <span>ACTIVE</span>
                        </div>
                        <div className="flex justify-between text-emerald-500/50">
                          <span>[SYS] NEURAL_ENGINE</span>
                          <span>OPTIMIZING</span>
                        </div>
                        <div className="flex justify-between text-amber-500/50">
                          <span>[SYS] STORAGE_CLUSTER</span>
                          <span>SYNC_PENDING</span>
                        </div>
                        <div className="flex justify-between text-emerald-500/50">
                          <span>[SYS] CDN_EDGE_GLOBAL</span>
                          <span>100% UP</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 text-zinc-600">
                          {'>'} tail -f /var/log/retroverse.log
                          <br />
                          <span className="text-emerald-400/80 animate-pulse">_</span>
                        </div>
                      </div>

                      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Distribución de Tráfico</h4>
                        <div className="space-y-3">
                          {[
                            { label: 'Norteamérica', val: 45 },
                            { label: 'Europa', val: 30 },
                            { label: 'Latinoamérica', val: 15 },
                            { label: 'Asia', val: 10 },
                          ].map((region) => (
                            <div key={region.label} className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-zinc-400">{region.label}</span>
                                <span className="text-white font-bold">{region.val}%</span>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${region.val}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedTournament && (
          <TournamentBracket 
            tournamentTitle={selectedTournament} 
            onClose={() => setSelectedTournament(null)} 
          />
        )}
        
        {showGeneratedTournament && generatedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-emerald-900/20"
            >
              <div className="flex items-center gap-3 mb-4 text-emerald-400">
                <Cpu className="w-6 h-6" />
                <h3 className="text-xl font-bold text-white">{generatedTournament.title}</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-6">
                El <strong className="text-emerald-400">Director de Torneos IA</strong> ha analizado la actividad reciente y ha creado un torneo relámpago para maximizar el engagement.
              </p>
              
              <div className="bg-black/50 rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase">Juego</span>
                  <span className="text-sm font-bold text-white">{generatedTournament.game}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase">Pozo de Premios</span>
                  <span className="text-sm font-bold text-emerald-400">{generatedTournament.prize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase">Inicio</span>
                  <span className="text-sm font-bold text-white">{generatedTournament.date}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowGeneratedTournament(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors text-sm"
                >
                  Cerrar
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://retroverse.app/tournaments/${generatedTournament.title.toLowerCase().replace(/\s+/g, '-')}`);
                    haptics.success();
                  }}
                  className="px-4 py-3 bg-emerald-500/20 text-emerald-500 font-bold rounded-xl hover:bg-emerald-500/30 transition-colors flex items-center justify-center"
                  title="Compartir Torneo"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setShowGeneratedTournament(false);
                    setSelectedTournament(generatedTournament.title);
                  }}
                  className="flex-[2] px-4 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors text-sm"
                >
                  Ver Cuadro
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BYOKModal 
        isOpen={showBYOKModal}
        onClose={() => setShowBYOKModal(false)}
        onSuccess={() => {
          handleGenerateTournament();
        }}
      />
    </div>
  );
}
