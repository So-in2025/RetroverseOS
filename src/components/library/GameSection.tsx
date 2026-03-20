import React, { useState, useRef, useEffect } from 'react';
import { GameObject } from '../../services/metadataNormalization';
import { Link } from 'react-router-dom';
import { Play, Info, Users, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import { DynamicCover } from './DynamicCover';
import { motion, AnimatePresence } from 'motion/react';
import { AudioEngine } from '../../services/audioEngine';
import { haptics } from '../../services/haptics';
import GameQuickViewModal from './GameQuickViewModal';

interface GameSectionProps {
  title: string;
  games: GameObject[];
  variant?: 'default' | 'live' | 'online' | 'elite';
}

const GameSection: React.FC<GameSectionProps> = ({ title, games, variant = 'default' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameObject | null>(null);

  // Predictive Loading: Prefetch ROM when hovering
  useEffect(() => {
    if (hoveredGame) {
      const game = games.find(g => g.game_id === hoveredGame);
      if (game && game.rom_url) {
        // Small delay to prevent spamming prefetches if user scrolls quickly
        const timer = setTimeout(() => {
          import('../../services/romFetcher').then(({ ROMFetchService }) => {
            ROMFetchService.prefetchRom(game.game_id, game.rom_url, game.system_id);
          });
          import('../../services/emulator').then(({ emulator }) => {
            emulator.prefetchCore(game.system_id);
          });
        }, 400); // 400ms hover required to trigger prefetch
        
        return () => clearTimeout(timer);
      }
    }
  }, [hoveredGame, games]);

  if (games.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
      haptics.light();
    }
  };

  const openQuickView = (e: React.MouseEvent, game: GameObject) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedGame(game);
  };

  return (
    <div className="mb-12 z-20 relative pointer-events-auto group/section">
      <div className="flex items-center justify-between mb-6 px-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3 italic flex-shrink-0">
          <span className={`w-1.5 h-8 rounded-full ${
            variant === 'live' ? 'bg-rose-500 animate-pulse' : 
            variant === 'online' ? 'bg-emerald-500' : 
            variant === 'elite' ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]' :
            'bg-cyan-electric'
          }`} />
          {title}
        </h2>
        
        {/* Carousel Controls */}
        <div className="hidden md:flex items-center gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
          <button 
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Carousel Container */}
      <div 
        ref={scrollRef}
        className="flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-8 pt-4 -mt-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {games.map((game) => (
          <div 
            key={game.game_id} 
            className="snap-start shrink-0 relative"
            style={{ width: 'calc(20% - 12.8px)', minWidth: '160px', maxWidth: '240px' }}
            onMouseEnter={() => {
              setHoveredGame(game.game_id);
              AudioEngine.playMoveSound();
            }}
            onMouseLeave={() => setHoveredGame(null)}
          >
            <Link 
              to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}
              onClick={(e) => {
                // Prevent default navigation if we want to open quick view on mobile tap, 
                // but for now let's keep the link functional and use the Info button for quick view.
              }}
            >
              <motion.div 
                layoutId={`game-card-${game.game_id}-${variant}`}
                className={`relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border transition-all duration-300 ${
                  hoveredGame === game.game_id ? 'scale-105 z-30 shadow-2xl' : 'scale-100 z-10'
                } ${
                  variant === 'live' ? 'border-rose-500/30' : 
                  variant === 'online' ? 'border-emerald-500/30' : 
                  variant === 'elite' ? 'border-yellow-500/30' :
                  'border-white/5'
                }`}
                style={{
                  borderColor: hoveredGame === game.game_id ? (
                    variant === 'live' ? '#f43f5e' : 
                    variant === 'online' ? '#10b981' : 
                    variant === 'elite' ? '#eab308' : '#00f2ff'
                  ) : undefined
                }}
              >
                <DynamicCover 
                  game_id={game.game_id}
                  src={game.cover_url || game.artwork_url} 
                  alt={game.title}
                  title={game.title}
                  system={game.system}
                  className="w-full h-full object-cover"
                />
                
                {/* Hover Overlay (Cinematic Expansion) */}
                <AnimatePresence>
                  {hoveredGame === game.game_id && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-4"
                    >
                      <div className="transform translate-y-0 transition-transform">
                        <h3 className="text-white font-black text-lg leading-tight line-clamp-2 mb-2 italic shadow-black drop-shadow-md">
                          {game.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[9px] font-black uppercase tracking-widest text-white">
                            {game.system}
                          </span>
                          {game.year && (
                            <span className="text-[10px] font-mono text-cyan-electric font-bold">
                              {game.year}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button className="flex-1 py-2 bg-cyan-electric text-black rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-1">
                            <Play className="w-3 h-3 fill-current" /> Jugar
                          </button>
                          <button 
                            onClick={(e) => openQuickView(e, game)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-md"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
            
            {/* Title below card (hidden on hover) */}
            <div className={`mt-3 transition-opacity duration-200 ${hoveredGame === game.game_id ? 'opacity-0' : 'opacity-100'}`}>
              <h3 className="text-sm font-bold text-zinc-300 truncate uppercase tracking-tight">
                {game.title}
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {game.developer || game.publisher || 'Unknown'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <GameQuickViewModal 
        game={selectedGame} 
        isOpen={!!selectedGame} 
        onClose={() => setSelectedGame(null)} 
      />
    </div>
  );
};

export default GameSection;

