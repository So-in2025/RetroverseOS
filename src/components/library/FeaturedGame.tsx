import React from 'react';
import { motion } from 'motion/react';
import { Play, Info, Trophy, Zap, ShieldCheck, Lock } from 'lucide-react';
import { GameObject } from '../../services/metadataNormalization';
import { Link, useNavigate } from 'react-router-dom';
import { gameCatalog } from '../../services/gameCatalog';
import { haptics } from '../../services/haptics';
import { GameCover } from './GameCover';
import { useCustomization } from '../../hooks/useCustomization';

interface FeaturedGameProps {
  game: GameObject;
}

export default function FeaturedGame({ game }: FeaturedGameProps) {
  const navigate = useNavigate();
  const { ownedItems, isRetroPassActive } = useCustomization();
  const isLocked = gameCatalog.isGameLocked(game);

  const handlePlayClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      haptics.error();
      navigate('/marketplace');
    }
  };

  return (
    <section className={`relative w-full h-[60vh] min-h-[500px] rounded-3xl overflow-hidden mb-12 group ${isLocked ? 'grayscale opacity-80' : ''}`}>
      {/* Background Image with Blur */}
      <div className="absolute inset-0 bg-zinc-900">
        <GameCover 
          gameId={game.game_id}
          primaryUrl={game.cover_url || game.artwork_url}
          title={game.title}
          systemId={game.system_id}
          className="w-full h-full object-cover scale-110 blur-2xl opacity-40 group-hover:scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon via-carbon/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-cyan-electric/20 text-cyan-electric text-xs font-bold rounded-full border border-cyan-electric/30 uppercase tracking-widest">
              {game.system}
            </span>
            {game.compatibility_status === 'compatible' && (
              <span className="flex items-center gap-1 text-cyan-electric text-xs font-bold px-3 py-1 bg-cyan-electric/10 rounded-full border border-cyan-electric/30 uppercase tracking-widest shadow-[0_0_10px_rgba(0,242,255,0.3)]">
                <ShieldCheck className="w-3 h-3" /> Sentinel Verified
              </span>
            )}
            <span className="flex items-center gap-1 text-zinc-400 text-xs font-medium">
              <Trophy className="w-3 h-3 text-yellow-500" /> 12 Achievements
            </span>
            <span className="flex items-center gap-1 text-zinc-400 text-xs font-medium">
              <Zap className="w-3 h-3 text-magenta-accent" /> AI Strategy Ready
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight tracking-tighter uppercase italic">
            {game.title}
          </h1>

          <p className="text-zinc-400 text-lg mb-8 max-w-2xl line-clamp-2 font-medium leading-relaxed">
            {isLocked 
              ? `Este juego requiere el desbloqueo de la consola ${game.system} en el Mercado.`
              : (game.description || `Experience the ultimate ${game.system} classic. Re-engineered for 2026 with tactical AI coaching and real-time multiplayer.`)}
          </p>

          <div className="flex items-center gap-4">
            <Link 
              to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}
              onClick={handlePlayClick}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-8 py-4 ${isLocked ? 'bg-yellow-500' : 'bg-cyan-electric'} text-black rounded-xl font-black text-lg flex items-center gap-3 neon-glow-cyan transition-all`}
              >
                {isLocked ? <Lock className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                {isLocked ? 'DESBLOQUEAR' : 'PLAY NOW'}
              </motion.button>
            </Link>
            
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-lg flex items-center gap-3 backdrop-blur-md border border-white/10 transition-all">
              <Info className="w-6 h-6" /> DETAILS
            </button>
          </div>
        </motion.div>
      </div>

      {/* Corner Accent */}
      <div className="absolute top-0 right-0 p-12">
        <div className="w-32 h-32 border-t-4 border-r-4 border-cyan-electric/20 rounded-tr-3xl" />
      </div>
    </section>
  );
}
