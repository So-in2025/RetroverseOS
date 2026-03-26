import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { recommendationEngine } from '../../services/recommendationEngine';
import { GameObject } from '../../services/metadataNormalization';
import { GameCover } from './GameCover';
import { AudioEngine } from '../../services/audioEngine';
import { haptics } from '../../services/haptics';

export const RecommendedSection: React.FC = () => {
  const [recommendedGames, setRecommendedGames] = useState<GameObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecommendations = async () => {
    setIsLoading(true);
    const games = await recommendationEngine.getRecommendedGames(6);
    setRecommendedGames(games);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRecommendations();

    const handleUpdate = () => {
      loadRecommendations();
    };

    window.addEventListener('recommendations_updated', handleUpdate);
    return () => window.removeEventListener('recommendations_updated', handleUpdate);
  }, []);

  if (!isLoading && recommendedGames.length === 0) return null;

  return (
    <section className="space-y-6 py-8">
      <div className="flex items-center justify-between px-4 md:px-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-electric/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-cyan-electric animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
              Sugerencias del Algoritmo
            </h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              IA de fondo optimizada para tus gustos
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-4 md:px-0">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl animate-pulse border border-white/10" />
            ))
          ) : (
            recommendedGames.map((game, index) => (
              <motion.div
                key={game.game_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <Link
                  to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}
                  onClick={() => { AudioEngine.playSelectSound(); haptics.medium(); }}
                  className="block relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 group-hover:border-cyan-electric/50 transition-all duration-500 shadow-2xl"
                >
                  <GameCover
                    gameId={game.game_id}
                    archiveId={game.archive_id}
                    primaryUrl={game.artwork_url || game.cover_url}
                    title={game.title}
                    systemId={game.system_id}
                    className="w-full h-full transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                    <div className="w-12 h-12 bg-cyan-electric rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,255,242,0.5)]">
                      <Play className="w-6 h-6 text-black fill-current ml-1" />
                    </div>
                  </div>

                  {/* Info Badge */}
                  <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
                    <span className="text-[8px] font-black bg-white/10 backdrop-blur-md text-cyan-electric px-1.5 py-0.5 rounded border border-white/10 w-fit uppercase tracking-widest">
                      {game.system}
                    </span>
                    <h3 className="text-[10px] font-black text-white uppercase italic leading-tight line-clamp-1 drop-shadow-md">
                      {game.title}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
