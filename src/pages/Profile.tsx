import React, { useEffect, useState } from 'react';
import { Trophy, Activity, Target, TrendingUp, Clock, Map, Shield, Medal, Star, Zap, ChevronRight, Crown, Video, PlayCircle, Users, Coins, Monitor, Cpu, Cloud, ShoppingCart, Check, Bot } from 'lucide-react';
import { aiCoachHistory, CoachAdvice } from '../services/aiCoachHistoryService';
import { leaderboard, UserRank, LeaderboardEntry } from '../services/leaderboardService';
import { friendService, Friend } from '../services/friendService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { achievements, ACHIEVEMENTS } from '../services/achievements';
import { economyService } from '../services/economyService';
import { useAuth } from '../services/AuthContext';
import { useCustomization } from '../hooks/useCustomization';
import { STORE_ITEMS } from '../services/customization';
import { gameCatalog } from '../services/gameCatalog';

const iconMap: Record<string, any> = {
  Trophy,
  BrainCircuit: Trophy,
  Swords: Target,
  Coins: Target,
  ShoppingBag: Target,
  MessageSquare: Target,
  Power: Target
};

export default function Profile() {
  const { user } = useAuth();
  const { ownedItems, equipped, isRetroPassActive } = useCustomization();
  const [coachInsights, setCoachInsights] = useState<CoachAdvice[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [referralData, setReferralData] = useState({ code: '', invites: 0, claimedRewards: [] as string[] });
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [streamerMode, setStreamerMode] = useState(false);

  useEffect(() => {
    const unsubscribeCoach = aiCoachHistory.subscribe(() => {
      setCoachInsights(aiCoachHistory.getHistory().slice(0, 5));
    });

    const unsubscribeFriends = friendService.subscribe(() => {
      setFriends(friendService.getFriends());
    });

    const loadInitialData = async () => {
      await aiCoachHistory.init();
      if (user) {
        await aiCoachHistory.pullHistory(user.id);
        const rank = await leaderboard.getUserRank(user.id);
        setUserRank(rank);
        await friendService.init(user.id);
        
        // Load streamer mode
        const streamer = await economyService.getSetting('streamerSettings', user.id);
        if (streamer) setStreamerMode(streamer.enabled);
      }
      const top = await leaderboard.getGlobalTop(5);
      setTopPlayers(top);
      setCoachInsights(aiCoachHistory.getHistory().slice(0, 5));
    };
    loadInitialData();

    const loadAchievements = async () => {
      const unlocked = ACHIEVEMENTS.filter(a => achievements.isUnlocked(a.id)).map(a => a.id);
      setUnlockedIds(unlocked);
    };
    loadAchievements();

    const loadReferrals = async () => {
      const data = await economyService.getReferralData(user?.id);
      setReferralData(data);
    };
    loadReferrals();

    return () => {
      unsubscribeCoach();
      unsubscribeFriends();
    };
  }, [user?.id]);

  const stats = {
    rank: "DIAMANTE II",
    rating: 2450,
    winRate: "68%",
    matches: 142,
    playtime: "86h",
    mainRole: "Estratega"
  };

  const performanceData = [
    { name: 'Week 1', mmr: 2100 },
    { name: 'Week 2', mmr: 2150 },
    { name: 'Week 3', mmr: 2120 },
    { name: 'Week 4', mmr: 2280 },
    { name: 'Week 5', mmr: 2350 },
    { name: 'Week 6', mmr: 2310 },
    { name: 'Week 7', mmr: 2450 },
  ];

  const recentMatches = [
    { id: 1, result: "VICTORY", score: "12 - 4", game: "Street Fighter II", time: "2h ago", kda: "Perfect", impact: "High" },
    { id: 2, result: "DEFEAT", score: "2 - 3", game: "Sonic Speedrun", time: "5h ago", kda: "04:12.05", impact: "Low" },
    { id: 3, result: "VICTORY", score: "1st Place", game: "Tetris Grand Prix", time: "1d ago", kda: "450k pts", impact: "High" },
    { id: 4, result: "VICTORY", score: "3 - 0", game: "Street Fighter II", time: "2d ago", kda: "Flawless", impact: "Medium" },
  ];

  const trophies = ACHIEVEMENTS.map(a => {
    const isUnlocked = unlockedIds.includes(a.id);
    return {
      id: a.id,
      name: a.title,
      description: a.description,
      icon: iconMap[a.icon] || Trophy,
      color: isUnlocked ? "text-emerald-400" : "text-zinc-600",
      bg: isUnlocked ? "bg-emerald-400/10" : "bg-zinc-800/10",
      border: isUnlocked ? "border-emerald-400/20" : "border-zinc-800/20",
      isUnlocked
    };
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 font-sans">
      
      {/* Hero Banner Section */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1920&h=400')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full">
          <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8 flex flex-col md:flex-row items-end gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-zinc-800 border-4 border-zinc-950 overflow-hidden relative z-10 shadow-2xl shadow-emerald-900/50">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop" alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full border-2 border-zinc-950 z-20 whitespace-nowrap tracking-wider">
                LVL 99
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 pb-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                {isRetroPassActive && (
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 rounded flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Retro Pass Activo
                  </span>
                )}
                {streamerMode && (
                  <span className="px-2 py-1 bg-magenta-accent/20 text-magenta-accent text-[10px] font-bold uppercase tracking-wider border border-magenta-accent/20 rounded flex items-center gap-1">
                    <Video className="w-3 h-3" /> Modo Streamer
                  </span>
                )}
                <span className="text-zinc-500 text-xs font-mono">ID: {user?.id.substring(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">
                  {streamerMode && (user?.user_metadata.full_name || 'OPERADOR').length > 10 
                    ? (user?.user_metadata.full_name || 'OPERADOR').substring(0, 8) + '...' 
                    : (user?.user_metadata.full_name || 'OPERADOR')}
                </h1>
                <div className="flex items-center gap-1 mt-2">
                  <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30 tooltip-trigger" title="Beta Tester">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded-md border border-yellow-500/30 tooltip-trigger" title="Tournament Winner">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <p className="text-zinc-400 font-medium flex items-center justify-center md:justify-start gap-2 text-sm md:text-base mb-4">
                Especialista Táctico <span className="w-1 h-1 rounded-full bg-zinc-600" /> Norteamérica
              </p>
              
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <button 
                  onClick={() => alert('Función de propinas en desarrollo')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg transition-colors text-sm"
                >
                  <Coins className="w-4 h-4" />
                  Enviar Propina
                </button>
                <button 
                  onClick={() => alert('Añadido a amigos')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors text-sm"
                >
                  <Users className="w-4 h-4" />
                  Añadir Amigo
                </button>
              </div>
              
              {/* XP Bar */}
              <div className="max-w-md mx-auto md:mx-0">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Progreso Nivel 100</span>
                  <span className="text-[10px] text-emerald-400 font-mono">12,450 / 15,000 XP</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[83%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
            </div>

            {/* Rank Badge */}
            <div className="hidden md:flex flex-col items-end pb-2">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2">Current Rank</p>
              <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl shadow-xl">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <Trophy className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-white">{userRank?.rank_name || 'RECLUTA'}</div>
                  <div className="text-emerald-400 font-mono text-sm">{userRank?.score || 0} MMR</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-8 space-y-6 md:space-y-8">
        
        {/* Top Grid: Stats & Chart */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Left: Quick Stats */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {[
              { label: "Victoria", value: stats.winRate, icon: Target, color: "text-blue-400" },
              { label: "Partidas", value: stats.matches, icon: TrendingUp, color: "text-purple-400" },
              { label: "Tiempo", value: stats.playtime, icon: Clock, color: "text-amber-400" },
              { label: "Rol", value: stats.mainRole, icon: Shield, color: "text-emerald-400" }
            ].map((stat, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={stat.label} 
                className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 md:p-5 hover:border-white/10 transition-colors group"
              >
                <div className="flex items-center gap-2 text-zinc-500 mb-2 md:mb-3">
                  <stat.icon className={`w-3 h-3 md:w-4 md:h-4 ${stat.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-xl md:text-2xl font-mono text-white group-hover:text-emerald-400 transition-colors">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Right: Performance Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="flex justify-between items-center mb-4 md:mb-6 relative z-10">
              <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                Progresión MMR
              </h3>
              <select className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-400 outline-none focus:border-emerald-500 transition-colors">
                <option>7 Semanas</option>
                <option>Temporada 4</option>
                <option>Todo</option>
              </select>
            </div>
            
            <div className="h-40 md:h-48 w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMmr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff1a', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="mmr" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMmr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Referral Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-r from-emerald-900/40 to-zinc-900/50 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-6 md:p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3">
                <Zap className="w-3 h-3 md:w-4 md:h-4" /> Programa de Embajadores
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Invita y Gana Packs Premium</h3>
              <p className="text-zinc-300 text-sm md:text-base mb-6 max-w-xl">
                Por cada 3 amigos que se registren con tu enlace y jueguen su primera partida, desbloqueas un <strong>Premium Game Pack</strong> gratis.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                <div className="relative w-full">
                  <input 
                    type="text" 
                    readOnly 
                    value={`https://retroverse.app/invite/${referralData.code}`} 
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-24 py-3 text-sm text-zinc-300 font-mono focus:outline-none"
                  />
                  <button 
                    onClick={() => navigator.clipboard.writeText(`https://retroverse.app/invite/${referralData.code}`)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full md:w-64 bg-black/40 border border-white/10 rounded-xl p-5 shrink-0 flex flex-col justify-center">
              <div className="flex justify-between items-end mb-2">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Progreso</span>
                <span className="text-emerald-400 font-mono font-bold text-lg">{referralData.invites % 3}/3</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500" 
                  style={{ width: `${((referralData.invites % 3) / 3) * 100}%` }}
                />
              </div>
              {referralData.invites >= 3 && (referralData.invites % 3) === 0 ? (
                <button 
                  onClick={async () => {
                    await economyService.claimReferralReward(user?.id, 'pack_1', 3);
                    const data = await economyService.getReferralData(user?.id);
                    setReferralData(data);
                    alert('¡Recompensa reclamada! Revisa tu inventario.');
                  }}
                  className="w-full py-2 bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
                >
                  Reclamar Recompensa
                </button>
              ) : (
                <p className="text-xs text-zinc-500 text-center">
                  {3 - (referralData.invites % 3)} amigo{3 - (referralData.invites % 3) !== 1 ? 's' : ''} más para tu próximo pack!
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* My Collection Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              Mi Colección
            </h3>
            <span className="text-xs text-zinc-500 font-mono">{ownedItems.length} Ítems Desbloqueados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Consoles */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Monitor className="w-3 h-3" /> Sistemas
              </h4>
              <div className="space-y-2">
                {STORE_ITEMS.filter(i => i.category === 'console' && ownedItems.includes(i.id)).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Monitor className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                  </div>
                ))}
                {STORE_ITEMS.filter(i => i.category === 'console' && ownedItems.includes(i.id)).length === 0 && (
                  <p className="text-xs text-zinc-600 italic">No hay sistemas desbloqueados.</p>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3" /> Funciones Pro
              </h4>
              <div className="space-y-2">
                {STORE_ITEMS.filter(i => i.category === 'feature' && ownedItems.includes(i.id)).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                      {equipped.feature === item.id && (
                        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-tighter">Activo</span>
                      )}
                    </div>
                  </div>
                ))}
                {STORE_ITEMS.filter(i => i.category === 'feature' && ownedItems.includes(i.id)).length === 0 && (
                  <p className="text-xs text-zinc-600 italic">No hay funciones activas.</p>
                )}
              </div>
            </div>

            {/* Performance */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-3 h-3" /> Rendimiento
              </h4>
              <div className="space-y-2">
                {STORE_ITEMS.filter(i => i.category === 'performance' && ownedItems.includes(i.id)).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                      {equipped.performance === item.id && (
                        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-tighter">Activo</span>
                      )}
                    </div>
                  </div>
                ))}
                {STORE_ITEMS.filter(i => i.category === 'performance' && ownedItems.includes(i.id)).length === 0 && (
                  <p className="text-xs text-zinc-600 italic">Sin mejoras de rendimiento.</p>
                )}
              </div>
            </div>

            {/* Game Packs */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart className="w-3 h-3" /> Packs
              </h4>
              <div className="space-y-2">
                {STORE_ITEMS.filter(i => i.category === 'pack' && ownedItems.includes(i.id)).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                  </div>
                ))}
                {STORE_ITEMS.filter(i => i.category === 'pack' && ownedItems.includes(i.id)).length === 0 && (
                  <p className="text-xs text-zinc-600 italic">No hay packs de juegos.</p>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Bottom Grid: Trophies, Matches, AI Coach */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Left Column: Trophies, Earnings & AI Coach */}
          <div className="space-y-6 md:space-y-8">
            
            {/* Tournament Earnings */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6"
            >
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                  <Coins className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                  Ganancias de Torneos
                </h3>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Ganado</p>
                      <p className="text-xl font-mono font-bold text-white">125,000 CR</p>
                    </div>
                  </div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Torneos Jugados</p>
                      <p className="text-xl font-mono font-bold text-white">42</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Trophy Case */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6"
            >
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                  <Medal className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                  Vitrina de Trofeos
                </h3>
                <button className="text-[10px] md:text-xs text-zinc-500 hover:text-white transition-colors">Ver Todo</button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {trophies.map((trophy) => (
                  <div 
                    key={trophy.id} 
                    className={`p-3 md:p-4 rounded-xl border ${trophy.border} ${trophy.bg} flex flex-col items-center justify-center text-center gap-1 md:gap-2 hover:scale-105 transition-transform cursor-default`}
                    title={trophy.description}
                  >
                    <trophy.icon className={`w-6 h-6 md:w-8 md:h-8 ${trophy.color} ${trophy.isUnlocked ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'opacity-30'}`} />
                    <div>
                      <p className={`text-[10px] md:text-xs font-bold leading-tight ${trophy.isUnlocked ? 'text-white' : 'text-zinc-600'}`}>{trophy.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* AI Coach Insights */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6"
            >
              <h3 className="text-emerald-400 font-bold mb-4 md:mb-6 flex items-center gap-2 text-sm md:text-base">
                <Bot className="w-4 h-4 md:w-5 md:h-5" />
                Historial de IA Táctica
              </h3>
              <div className="space-y-3">
                {coachInsights.length > 0 ? coachInsights.map((insight) => (
                  <div key={insight.id} className="p-3 md:p-4 bg-black/40 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {gameCatalog.getGame(insight.game_id)?.title || 'Juego Retro'}
                      </span>
                      <span className="text-[8px] text-zinc-500 font-mono">
                        {new Date(insight.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      {insight.screenshot && (
                        <img 
                          src={`data:image/jpeg;base64,${insight.screenshot}`} 
                          alt="Screenshot" 
                          className="w-16 h-12 object-cover rounded border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <p className="text-xs md:text-sm text-zinc-300 leading-relaxed group-hover:text-white transition-colors flex-1">
                        {insight.advice}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
                    <p className="text-xs text-zinc-600 italic">No hay consejos tácticos registrados aún.</p>
                  </div>
                )}
              </div>
            </motion.section>
            {/* Friend Activity */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6"
            >
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                  Amigos Conectados
                </h3>
                <button className="text-[10px] md:text-xs text-zinc-500 hover:text-white transition-colors">Ver Todos</button>
              </div>
              
              <div className="space-y-4">
                {friends.length > 0 ? friends.map(friend => (
                  <div key={friend.user_id} className="flex items-start gap-3 group cursor-pointer">
                    <div className="relative">
                      <img 
                        src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} 
                        alt={friend.username} 
                        className="w-8 h-8 rounded-full bg-zinc-800" 
                        crossOrigin="anonymous"
                      />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                        friend.status === 'online' ? 'bg-emerald-500' : 
                        friend.status === 'playing' ? 'bg-blue-500' : 'bg-zinc-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white font-bold group-hover:text-blue-400 transition-colors">
                        {friend.username}
                      </p>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                        {friend.status === 'playing' ? `Jugando: ${friend.current_game || 'Retro'}` : 
                         friend.status === 'online' ? 'En Línea' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-zinc-600 italic text-xs">
                    No tienes amigos agregados aún.
                  </div>
                )}
              </div>
            </motion.section>
          </div>

          {/* Right Column: Match History */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <section className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                  <Map className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
                  Partidas Recientes
                </h3>
                <button className="text-[10px] md:text-xs text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  Historial <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
              
              <div className="flex-1 space-y-2">
                {/* Header Row (Desktop Only) */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-2">
                  <div className="col-span-2">Resultado</div>
                  <div className="col-span-4">Juego / Modo</div>
                  <div className="col-span-2">Puntuación/Tiempo</div>
                  <div className="col-span-2">Impacto</div>
                  <div className="col-span-2 text-right">Fecha</div>
                </div>

                {/* Match Rows */}
                {recentMatches.map((match) => (
                  <div key={match.id} className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 px-3 md:px-4 py-3 md:py-4 bg-black/20 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-xl transition-all cursor-pointer group">
                    
                    {/* Mobile Header: Result + Date */}
                    <div className="flex md:hidden justify-between items-center mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${match.result === 'VICTORY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {match.result === 'VICTORY' ? 'VICTORIA' : 'DERROTA'}
                      </span>
                      <span className="text-zinc-500 text-[10px] font-medium">{match.time}</span>
                    </div>

                    {/* Desktop Result */}
                    <div className="hidden md:block col-span-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${match.result === 'VICTORY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {match.result === 'VICTORY' ? 'VICTORIA' : 'DERROTA'}
                      </span>
                    </div>

                    {/* Game Info */}
                    <div className="col-span-4 font-bold text-white text-xs md:text-sm truncate group-hover:text-emerald-400 transition-colors">
                      {match.game}
                    </div>

                    {/* Score & Impact (Mobile: Flex Row) */}
                    <div className="flex md:contents justify-between items-center mt-1 md:mt-0">
                      <div className="col-span-2 font-mono text-zinc-300 text-xs md:text-sm">{match.score}</div>
                      <div className="col-span-2">
                        <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${match.impact === 'High' ? 'text-emerald-400' : match.impact === 'Medium' ? 'text-yellow-400' : 'text-zinc-500'}`}>
                          {match.impact === 'High' ? 'Alto' : match.impact === 'Medium' ? 'Medio' : 'Bajo'}
                        </span>
                      </div>
                    </div>

                    {/* Desktop Date */}
                    <div className="hidden md:block col-span-2 text-right text-zinc-500 text-xs font-medium">{match.time}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Global Leaderboard */}
            <section className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6 mt-6 md:mt-8">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                  <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                  Ranking Global Ronin
                </h3>
              </div>
              
              <div className="space-y-2">
                {topPlayers.map((player, index) => (
                  <div 
                    key={player.user_id} 
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                      player.user_id === user?.id 
                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                        : 'bg-black/20 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center font-mono font-bold text-zinc-500">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{player.username}</span>
                        {player.user_id === user?.id && (
                          <span className="text-[8px] font-bold bg-emerald-500 text-black px-1.5 py-0.5 rounded uppercase">Tú</span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">{player.rank_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-emerald-400">{player.score}</div>
                      <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">MMR</div>
                    </div>
                  </div>
                ))}
                {topPlayers.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 italic text-xs">
                    No hay datos de ranking disponibles.
                  </div>
                )}
              </div>
            </section>

            {/* Favorite Games Vitrine */}
            <section className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6 mt-6 md:mt-8">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                  <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                  Juegos Favoritos
                </h3>
                <button className="text-[10px] md:text-xs text-zinc-500 hover:text-white transition-colors">Editar</button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { id: 'smw', title: 'Super Mario World', image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7d.png' },
                  { id: 'sf2', title: 'Street Fighter II', image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co22l7.png' },
                  { id: 'oot', title: 'Zelda: Ocarina of Time', image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wn0.png' },
                  { id: 'sotn', title: 'Castlevania: SOTN', image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1tq0.png' }
                ].map(game => (
                  <div key={game.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 group cursor-pointer">
                    <img src={game.image} alt={game.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-white text-[10px] font-bold leading-tight">{game.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Viral Clips */}
            <section className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6 mt-6 md:mt-8">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                  <Video className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                  Clips Virales
                </h3>
                <button className="text-[10px] md:text-xs text-zinc-500 hover:text-white transition-colors">Ver Todos</button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 1, title: 'Combo Perfecto 99 Hits', game: 'Street Fighter II', views: '12.5K', duration: '0:15', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400' },
                  { id: 2, title: 'Speedrun Glitch Skip', game: 'Super Mario World', views: '8.2K', duration: '0:28', image: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&q=80&w=400' }
                ].map(clip => (
                  <div key={clip.id} className="group relative rounded-xl overflow-hidden border border-white/10 cursor-pointer">
                    <div className="aspect-video relative">
                      <img src={clip.image} alt={clip.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <PlayCircle className="w-10 h-10 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-lg" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                        {clip.duration}
                      </div>
                    </div>
                    <div className="p-3 bg-zinc-950/80">
                      <h4 className="text-xs font-bold text-white truncate">{clip.title}</h4>
                      <div className="flex justify-between items-center mt-1 mb-2">
                        <span className="text-[10px] text-zinc-400">{clip.game}</span>
                        <span className="text-[10px] font-bold text-purple-400">{clip.views} vistas</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); alert('Compartiendo en TikTok...'); }}
                        className="w-full py-1.5 bg-white text-black text-[10px] font-bold rounded hover:bg-zinc-200 transition-colors"
                      >
                        Compartir en TikTok
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
