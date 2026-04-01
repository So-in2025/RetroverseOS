import { useEffect, useState } from 'react';
import { leaderboardService } from '../../competitive/leaderboardService';
import { CompetitivePlayer } from '../../competitive/competitiveTypes';
import { isCompetitiveEnabled } from '../../competitive/competitiveConfig';
import { motion } from 'motion/react';
import { Trophy, Medal, Award } from 'lucide-react';

export default function Leaderboard() {
  const [players, setPlayers] = useState<CompetitivePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCompetitiveEnabled) return;
    leaderboardService.getTopPlayers().then(data => {
      setPlayers(data);
      setLoading(false);
    });
  }, []);

  if (!isCompetitiveEnabled) return (
    <div className="p-8 flex items-center justify-center min-h-[50vh]">
      <div className="glass p-8 rounded-2xl border border-red-500/30 text-red-500 font-retro text-center">
        ACCESO_DENEGADO: MODO_COMPETITIVO_DESCONECTADO
      </div>
    </div>
  );

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse font-retro text-cyan-electric">
        INICIALIZANDO_CLASIFICACIÓN...
      </div>
    </div>
  );

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getTierColor = (tier: string) => {
    const t = tier.toLowerCase();
    if (t.includes('diamond')) return 'text-cyan-electric';
    if (t.includes('platinum')) return 'text-blue-400';
    if (t.includes('gold')) return 'text-yellow-400';
    if (t.includes('silver')) return 'text-gray-300';
    return 'text-amber-600';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-retro text-magenta-accent mb-4 tracking-tighter uppercase italic">
            Clasificaciones <span className="text-cyan-electric">Globales</span>
          </h1>
          <p className="text-gray-400 font-retro text-sm uppercase tracking-widest">
            La élite del 1% del Retroverse. Datos actualizados en tiempo real.
          </p>
        </div>
        <div className="glass px-6 py-3 rounded-full border border-white/10 flex items-center gap-4">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-retro text-gray-400 uppercase tracking-widest">Sincronización_En_Vivo_Activa</span>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-6 font-retro text-[10px] text-gray-500 uppercase tracking-widest">Rango</th>
                <th className="p-6 font-retro text-[10px] text-gray-500 uppercase tracking-widest">ID_Jugador</th>
                <th className="p-6 font-retro text-[10px] text-gray-500 uppercase tracking-widest text-center">MMR</th>
                <th className="p-6 font-retro text-[10px] text-gray-500 uppercase tracking-widest text-center">Ratio_V/D</th>
                <th className="p-6 font-retro text-[10px] text-gray-500 uppercase tracking-widest text-right">Clase_Tier</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <motion.tr 
                  key={player.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <span className={`font-retro text-lg ${index < 3 ? 'text-white' : 'text-gray-600'}`}>
                        #{index + 1}
                      </span>
                      {getRankIcon(index)}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-electric to-magenta-accent p-[1px]">
                        <div className="w-full h-full rounded-full bg-carbon flex items-center justify-center text-[10px] font-retro">
                          {player.user_id.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <span className="font-retro text-xs text-white group-hover:text-cyan-electric transition-colors uppercase tracking-widest">
                        {player.user_id.substring(0, 12)}...
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className="font-retro text-sm font-bold text-cyan-electric">
                      {player.mmr}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-retro text-[10px] text-green-400 uppercase tracking-widest">V: {player.wins}</span>
                      <span className="font-retro text-[10px] text-red-400 uppercase tracking-widest">D: {player.losses}</span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <span className={`font-retro text-[10px] uppercase tracking-tighter ${getTierColor(player.rank_tier)}`}>
                      {player.rank_tier}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
