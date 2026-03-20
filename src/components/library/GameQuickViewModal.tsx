import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Star, Users, Trophy, Clock, Gamepad2, Heart } from 'lucide-react';
import { GameObject } from '../../services/metadataNormalization';
import { DynamicCover } from './DynamicCover';
import { Link, useNavigate } from 'react-router-dom';
import { AudioEngine } from '../../services/audioEngine';
import { haptics } from '../../services/haptics';
import { storage } from '../../services/storage';

interface GameQuickViewModalProps {
  game: GameObject | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GameQuickViewModal({ game, isOpen, onClose }: GameQuickViewModalProps) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (isOpen && game) {
      AudioEngine.playSelectSound();
      haptics.medium();
      // Check if favorite
      storage.getSetting(`fav_${game.game_id}`).then(val => setIsFavorite(!!val));
    }
  }, [isOpen, game]);

  if (!game) return null;

  const handlePlay = () => {
    AudioEngine.playSelectSound();
    haptics.heavy();
    navigate(`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`);
    onClose();
  };

  const toggleFavorite = async () => {
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    await storage.saveSetting(`fav_${game.game_id}`, newVal);
    haptics.light();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-3xl z-[101] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row"
          >
            {/* Left: Cover & Actions */}
            <div className="w-full md:w-2/5 relative bg-black">
              <div className="aspect-[3/4] md:aspect-auto md:h-full relative">
                <DynamicCover
                  src={game.cover_url || game.artwork_url}
                  alt={game.title}
                  title={game.title}
                  system={game.system}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-950" />
              </div>
              
              <button 
                onClick={onClose}
                className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Right: Info */}
            <div className="w-full md:w-3/5 p-6 md:p-10 flex flex-col justify-center relative">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors hidden md:block"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-cyan-electric/20 text-cyan-electric text-[10px] font-black uppercase tracking-widest rounded-lg border border-cyan-electric/30">
                  {game.system}
                </span>
                {game.year && (
                  <span className="text-xs font-mono text-zinc-400 font-bold">
                    {game.year}
                  </span>
                )}
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-2 leading-tight">
                {game.title}
              </h2>
              
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">
                {game.developer || game.publisher || 'Unknown Developer'}
              </p>

              <div className="flex items-center gap-6 mb-8 text-sm font-bold text-zinc-300">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>4.8/5</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>1.2k Jugando</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-500" />
                  <span>Logros</span>
                </div>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed mb-8 line-clamp-4">
                {game.description || `Experimenta el clásico ${game.title} de ${game.system}. Sumérgete en la nostalgia con emulación de alta precisión, soporte para multijugador online y guardado en la nube.`}
              </p>

              <div className="flex items-center gap-4 mt-auto">
                <button 
                  onClick={handlePlay}
                  className="flex-1 py-4 bg-cyan-electric text-black rounded-xl font-black text-sm uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_rgba(0,242,255,0.5)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Jugar Ahora
                </button>
                
                <button 
                  onClick={toggleFavorite}
                  className={`p-4 rounded-xl border transition-all ${
                    isFavorite 
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-500' 
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>

                <Link 
                  to={`/game/${game.game_id}`}
                  onClick={onClose}
                  className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors"
                  title="Ver Detalles Completos"
                >
                  <Gamepad2 className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
