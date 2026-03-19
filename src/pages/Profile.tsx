import React, { useEffect, useState } from 'react';
import { Trophy, Activity, Target, TrendingUp, Clock, Map, Shield, Medal, Star, Zap, ChevronRight, Crown, Video, PlayCircle, Users, Coins } from 'lucide-react';
import { aiCoach } from '../services/aiCoaching';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { motion } from 'motion/react';
import { achievements, ACHIEVEMENTS } from '../services/achievements';
import { economyService } from '../services/economyService';

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
  const [coachInsights, setCoachInsights] = useState<any[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [referralData, setReferralData] = useState({ code: '', count: 0 });

  useEffect(() => {
    const history = aiCoach.getHistory();
    if (history.length > 0) {
      setCoachInsights(history.slice(0, 4));
    } else {
      setCoachInsights([
        { id: 1, type: "STRENGTH", text: "Excellent map awareness in mid-game rotations." },
        { id: 2, type: "WEAKNESS", text: "Tendency to over-extend without support in early rounds." },
        { id: 3, type: "FOCUS", text: "Practice crosshair placement on vertical angles." },
        { id: 4, type: "STRENGTH", text: "High APM during critical teamfight phases." }
      ]);
    }

    const loadAchievements = async () => {
      const unlocked = ACHIEVEMENTS.filter(a => achievements.isUnlocked(a.id)).map(a => a.id);
      setUnlockedIds(unlocked);
    };
    loadAchievements();

    const loadReferrals = async () => {
      const data = await economyService.getReferralData();
      setReferralData(data);
    };
    loadReferrals();
  }, []);

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
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop" alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full border-2 border-zinc-950 z-20 whitespace-nowrap tracking-wider">
                LVL 99
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 pb-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 rounded flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Retro Pass Activo
                </span>
                <span className="text-zinc-500 text-xs font-mono">ID: 8X-2941</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-lg">NEXUS_ONE</h1>
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
                  <div className="text-2xl font-bold font-mono text-white">{stats.rank}</div>
                  <div className="text-emerald-400 font-mono text-sm">{stats.rating} MMR</div>
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

            <div className="w-full md:w-64 bg-black/40 border border-white/10 rounded-xl p-5 shrink-0">
              <div className="flex justify-between items-end mb-2">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Progreso</span>
                <span className="text-emerald-400 font-mono font-bold text-lg">{referralData.count % 3}/3</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500" 
                  style={{ width: `${((referralData.count % 3) / 3) * 100}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 text-center">
                {3 - (referralData.count % 3)} amigo{3 - (referralData.count % 3) !== 1 ? 's' : ''} más para tu próximo pack!
              </p>
            </div>
          </div>
        </motion.div>

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
                <Activity className="w-4 h-4 md:w-5 md:h-5" />
                Análisis Post-Partida IA
              </h3>
              <div className="space-y-3">
                {coachInsights.map((insight: any) => (
                  <div key={insight.id} className="p-3 md:p-4 bg-black/40 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded uppercase tracking-wider
                        ${insight.type === 'STRENGTH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          insight.type === 'WEAKNESS' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                        {insight.type === 'STRENGTH' ? 'FORTALEZA' : insight.type === 'WEAKNESS' ? 'DEBILIDAD' : 'ENFOQUE'}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-zinc-300 leading-relaxed group-hover:text-white transition-colors">{insight.text}</p>
                  </div>
                ))}
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
                  Actividad de Amigos
                </h3>
                <button className="text-[10px] md:text-xs text-zinc-500 hover:text-white transition-colors">Ver Todos</button>
              </div>
              
              <div className="space-y-4">
                {[
                  { id: 1, user: 'RetroKing99', action: 'desbloqueó un logro en', game: 'Super Mario World', time: 'hace 5m', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RetroKing99' },
                  { id: 2, user: 'PixelQueen', action: 'compró el pack', game: 'JRPG Golden Era', time: 'hace 2h', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PixelQueen' },
                  { id: 3, user: 'ArcadeMaster', action: 'superó tu récord en', game: 'Street Fighter II', time: 'hace 5h', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ArcadeMaster' }
                ].map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 group cursor-pointer">
                    <img src={activity.avatar} alt={activity.user} className="w-8 h-8 rounded-full bg-zinc-800" />
                    <div>
                      <p className="text-xs text-zinc-300 leading-tight">
                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{activity.user}</span> {activity.action} <span className="font-bold text-white">{activity.game}</span>
                      </p>
                      <span className="text-[10px] text-zinc-500">{activity.time}</span>
                    </div>
                  </div>
                ))}
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
                    <img src={game.image} alt={game.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
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
                      <img src={clip.image} alt={clip.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <PlayCircle className="w-10 h-10 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-lg" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                        {clip.duration}
                      </div>
                    </div>
                    <div className="p-3 bg-zinc-950/80">
                      <h4 className="text-xs font-bold text-white truncate">{clip.title}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-zinc-400">{clip.game}</span>
                        <span className="text-[10px] font-bold text-purple-400">{clip.views} vistas</span>
                      </div>
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
