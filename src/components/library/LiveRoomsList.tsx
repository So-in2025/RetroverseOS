import React, { useState, useEffect, useMemo } from 'react';
import { GameObject } from '../../services/metadataNormalization';
import { Link } from 'react-router-dom';
import { Play, Search, Users, Radio } from 'lucide-react';
import { DynamicCover } from './DynamicCover';
import { motion, AnimatePresence } from 'motion/react';

interface LiveRoomsListProps {
  title: string;
  games: GameObject[];
}

export const LiveRoomsList: React.FC<LiveRoomsListProps> = ({ title, games }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rotationIndex, setRotationIndex] = useState(0);

  // Simulate a pool of live games (e.g. 30 games)
  const simulatedLiveGames = useMemo(() => {
    if (games.length === 0) return [];
    // Efficiently pick 30 games without filtering the entire array
    const result = [];
    const step = Math.max(1, Math.floor(games.length / 30));
    for (let i = 0; i < 30 && i * step < games.length; i++) {
      result.push(games[i * step]);
    }
    return result;
  }, [games]);

  // Rotate games every 8 seconds
  useEffect(() => {
    if (searchQuery) return; // Don't rotate while searching
    
    const interval = setInterval(() => {
      setRotationIndex(prev => (prev + 5) % Math.max(1, simulatedLiveGames.length));
    }, 8000);
    
    return () => clearInterval(interval);
  }, [simulatedLiveGames.length, searchQuery]);

  const displayedGames = useMemo(() => {
    if (searchQuery) {
      return simulatedLiveGames.filter(g => 
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10);
    }
    
    // Get 5 games starting from rotationIndex
    const result = [];
    for (let i = 0; i < 5; i++) {
      const idx = (rotationIndex + i) % Math.max(1, simulatedLiveGames.length);
      if (simulatedLiveGames[idx]) {
        result.push(simulatedLiveGames[idx]);
      }
    }
    return result;
  }, [simulatedLiveGames, rotationIndex, searchQuery]);

  if (games.length === 0) return null;

  return (
    <div className="mb-12 z-20 relative pointer-events-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 px-4 gap-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3 italic flex-shrink-0">
          <span className="w-1.5 h-8 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
          {title}
          <span className="flex items-center gap-1 text-[10px] font-black bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded ml-2 border border-emerald-500/30">
            <Radio className="w-3 h-3 animate-pulse" /> EN DIRECTO
          </span>
        </h2>
        
        <div className="relative group w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="BUSCAR PARTIDA..."
            className="w-full bg-zinc-900 border border-emerald-500/30 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all"
          />
        </div>
      </div>

      <div className="px-4 min-h-[280px]">
        {displayedGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-zinc-900/50 border border-white/5 rounded-2xl border-dashed">
            <Users className="w-12 h-12 text-zinc-700 mb-2" />
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">NO HAY PARTIDAS ACTIVAS</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">INTENTA CON OTRO JUEGO</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {displayedGames.map((game, index) => (
                <motion.div 
                  key={`${game.game_id}-${searchQuery ? 'search' : rotationIndex}`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="w-full group relative"
                >
                  <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md border border-emerald-500/50 text-emerald-500 text-[9px] font-black px-2 py-1 rounded-md z-10 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <Users className="w-3 h-3" /> {Math.floor(Math.random() * 3) + 1}/2
                  </div>
                  <Link to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}>
                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 bg-zinc-900 border border-emerald-500/30 transition-all duration-300 group-hover:scale-105 group-hover:border-emerald-500">
                      <DynamicCover 
                        src={game.cover_url || game.artwork_url} 
                        alt={game.title}
                        title={game.title}
                        system={game.system}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500">
                          <Play className="w-6 h-6 text-black fill-current" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full border border-emerald-500/50">
                          UNIRSE
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors truncate uppercase tracking-tight">
                      {game.title}
                    </h3>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
