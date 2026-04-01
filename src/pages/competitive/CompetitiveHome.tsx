import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Users, Sword, Target, ShieldAlert, History, Calendar, TrendingUp, Activity } from 'lucide-react';
import { statsService } from '../../competitive/statsService';
import { resultsService } from '../../competitive/resultsService';
import { rankingService } from '../../competitive/rankingService';
import { matchmakingService } from '../../competitive/matchmakingService';
import { useAuth } from '../../services/AuthContext';
import { gameCatalog } from '../../services/gameCatalog';

export default function CompetitiveHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    activePlayers: number | null;
    matchesToday: number | null;
    seasonEnd: string | null;
  }>({
    activePlayers: null,
    matchesToday: null,
    seasonEnd: null
  });
  
  const [playerRank, setPlayerRank] = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [gamesMap, setGamesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchStats = async () => {
      const data = await statsService.getCompetitiveStats();
      setStats(data);
    };
    fetchStats();

    const loadGames = async () => {
      const allGames = await gameCatalog.getAllGames();
      const map: Record<string, any> = {};
      allGames.forEach(g => map[g.game_id] = g);
      setGamesMap(map);
    };
    loadGames();

    if (user) {
      resultsService.resolvePendingTimeouts(user.id);
      rankingService.getPlayerRank(user.id).then(rank => setPlayerRank(rank));
      resultsService.getMatchHistory(user.id).then(history => setMatchHistory(history));
      matchmakingService.cleanupStaleEntries(); // Clean up stale matchmaking queue entries
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'win': return 'text-green-400';
      case 'loss': return 'text-red-400';
      case 'draw': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Hero Section - Immersive Landing */}
      <div className="relative min-h-[60vh] rounded-[40px] overflow-hidden border border-white/10 group">
        {/* Background with nostalgia/tech vibe */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon via-carbon/40 to-transparent" />
        
        {/* Animated Grid Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 h-full flex flex-col justify-center p-12 md:p-20 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-3xl"
          >
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-cyan-electric/10 text-cyan-electric text-[10px] font-retro uppercase tracking-[0.3em] border border-cyan-electric/20 backdrop-blur-md">
                Protocolo_Competitivo_V2.5
              </span>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] font-retro text-green-500 uppercase tracking-widest">Sistemas_Online</span>
              </div>
            </div>

            <h1 className="text-6xl md:text-8xl font-retro text-white tracking-tighter uppercase italic leading-[0.9]">
              Arena <span className="text-magenta-accent">Competitiva</span>
            </h1>

            <p className="text-gray-400 font-retro text-sm md:text-base uppercase tracking-widest leading-relaxed">
              Donde la <span className="text-cyan-electric">nostalgia</span> se encuentra con la <span className="text-magenta-accent">gloria</span>. 
              Compite en los clásicos que definieron generaciones, escala en el ranking global 
              y forja tu leyenda en la comunidad más grande de retrogaming.
            </p>

            <div className="flex flex-wrap gap-6 pt-4">
              <Link 
                to="/competitive/matchmaking"
                className="group relative px-12 py-6 bg-cyan-electric text-carbon rounded-2xl font-retro text-base uppercase tracking-tighter overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(0,255,255,0.3)]"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                <span className="relative flex items-center gap-3">
                  <Sword className="w-6 h-6" />
                  Entrar a la Arena
                </span>
              </Link>
              
              <Link 
                to="/competitive/leaderboard"
                className="px-10 py-6 glass border border-white/10 text-white rounded-2xl font-retro text-sm uppercase tracking-tighter hover:bg-white/5 transition-all flex items-center gap-3"
              >
                <Trophy className="w-5 h-5 text-yellow-400" />
                Salón de la Fama
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Info Section - Nostalgia, Competition, Community */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass p-8 rounded-[32px] border border-white/5 space-y-4 hover:border-cyan-electric/30 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-cyan-electric/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <History className="w-6 h-6 text-cyan-electric" />
          </div>
          <h3 className="text-xl font-retro text-white uppercase italic tracking-tighter">Nostalgia Pura</h3>
          <p className="text-gray-500 font-retro text-[10px] uppercase tracking-widest leading-relaxed">
            Revive los duelos legendarios de los 90s con latencia cero y emulación perfecta.
          </p>
        </div>
        <div className="glass p-8 rounded-[32px] border border-white/5 space-y-4 hover:border-magenta-accent/30 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-magenta-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6 text-magenta-accent" />
          </div>
          <h3 className="text-xl font-retro text-white uppercase italic tracking-tighter">Competencia Real</h3>
          <p className="text-gray-500 font-retro text-[10px] uppercase tracking-widest leading-relaxed">
            Sistema de MMR avanzado que garantiza emparejamientos justos y desafiantes.
          </p>
        </div>
        <div className="glass p-8 rounded-[32px] border border-white/5 space-y-4 hover:border-yellow-400/30 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 text-yellow-400" />
          </div>
          <h3 className="text-xl font-retro text-white uppercase italic tracking-tighter">Comunidad Viva</h3>
          <p className="text-gray-500 font-retro text-[10px] uppercase tracking-widest leading-relaxed">
            Únete a miles de jugadores, comparte tácticas y forja rivalidades eternas.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users className="w-5 h-5 text-cyan-electric" />}
          label="Jugadores en Línea"
          value={stats.activePlayers || '0'}
          subtext="Sincronizados ahora"
        />
        <StatCard 
          icon={<Activity className="w-5 h-5 text-magenta-accent" />}
          label="Partidas Hoy"
          value={stats.matchesToday || '0'}
          subtext="Combates registrados"
        />
        <StatCard 
          icon={<Calendar className="w-5 h-5 text-yellow-400" />}
          label="Fin de Temporada"
          value={stats.seasonEnd || '--'}
          subtext="Tiempo restante"
        />
        <StatCard 
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
          label="Progreso de Liga"
          value={playerRank?.rank_tier || 'Bronze'}
          subtext={`MMR: ${playerRank?.mmr || 1000}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-8 rounded-3xl border border-white/10 space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-electric to-magenta-accent p-[2px]">
                <div className="w-full h-full rounded-full bg-carbon flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-retro text-white uppercase tracking-tighter italic">
                  {user?.email?.split('@')[0] || 'Piloto'}
                </h3>
                <p className="text-cyan-electric font-retro text-[10px] uppercase tracking-widest">
                  Rango: {playerRank?.rank_tier || 'Bronze'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-retro text-gray-500 uppercase mb-1">MMR_Actual</p>
                <p className="text-2xl font-retro text-white">{playerRank?.mmr || 1000}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-retro text-gray-500 uppercase mb-1">Ratio_V/D</p>
                <p className="text-2xl font-retro text-white">
                  {playerRank?.wins || 0}/{playerRank?.losses || 0}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-retro uppercase tracking-widest">
                <span className="text-gray-500">Puntuación de Confianza</span>
                <span className={(playerRank?.trust_score ?? 100) < 50 ? 'text-red-500' : 'text-green-500'}>
                  {playerRank?.trust_score ?? 100}%
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${playerRank?.trust_score ?? 100}%` }}
                  className={`h-full ${(playerRank?.trust_score ?? 100) < 50 ? 'bg-red-500' : 'bg-green-500'}`}
                />
              </div>
              {(playerRank?.trust_score ?? 100) < 50 && (
                <div className="flex items-center gap-2 text-[10px] font-retro text-red-500 uppercase mt-2">
                  <ShieldAlert className="w-3 h-3" />
                  <span>Penalización Activa: Sin Ganancia de MMR</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity / Match History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-retro text-white uppercase tracking-tighter italic flex items-center gap-3">
              <History className="w-5 h-5 text-cyan-electric" />
              Historial de Combate
            </h2>
          </div>

          <div className="space-y-4">
            {matchHistory.length > 0 ? (
              matchHistory.map((match, index) => (
                <motion.div 
                  key={match.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-retro text-xs uppercase ${
                      match.status === 'win' ? 'bg-green-500/10 text-green-500' : 
                      match.status === 'loss' ? 'bg-red-500/10 text-red-500' : 
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {match.status.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-retro text-white uppercase tracking-tighter">
                        {gamesMap[match.game_id]?.title || 'Juego Desconocido'}
                      </h4>
                      <p className="text-[10px] font-retro text-gray-500 uppercase">
                        {new Date(match.reported_at).toLocaleDateString()} • {new Date(match.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`font-retro text-xs uppercase tracking-widest ${getStatusColor(match.status)}`}>
                      {match.status === 'win' ? 'Victoria' : match.status === 'loss' ? 'Derrota' : 'Empate'}
                    </span>
                    {match.is_suspicious && (
                      <div className="flex items-center justify-end gap-1 text-[8px] font-retro text-red-500 uppercase mt-1">
                        <ShieldAlert className="w-2 h-2" />
                        <span>Sospechoso</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="glass p-12 rounded-3xl border border-white/5 text-center space-y-4">
                <Target className="w-12 h-12 text-gray-700 mx-auto" />
                <p className="text-gray-500 font-retro text-xs uppercase tracking-widest">
                  No se han registrado combates recientes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string | number, subtext: string }) {
  return (
    <div className="glass p-6 rounded-3xl border border-white/10 space-y-4 hover:border-white/20 transition-all group">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[8px] font-retro text-gray-500 uppercase tracking-widest">Estado: OK</span>
      </div>
      <div>
        <p className="text-[10px] font-retro text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-retro text-white tracking-tighter">{value}</p>
        <p className="text-[10px] font-retro text-gray-600 uppercase mt-2">{subtext}</p>
      </div>
    </div>
  );
}
