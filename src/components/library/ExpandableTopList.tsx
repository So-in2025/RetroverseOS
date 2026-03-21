import React, { useState } from 'react';
import { GameObject } from '../../services/metadataNormalization';
import { Link } from 'react-router-dom';
import { Play, ChevronDown } from 'lucide-react';
import { GameCover } from './GameCover';

interface ExpandableTopListProps {
  title: string;
  games: GameObject[];
}

export const ExpandableTopList: React.FC<ExpandableTopListProps> = ({ title, games }) => {
  const [visibleCount, setVisibleCount] = useState(5);

  if (games.length === 0) return null;

  const handleExpand = () => {
    if (visibleCount < 20) {
      setVisibleCount(prev => Math.min(prev + 5, 20, games.length));
    }
  };

  return (
    <div className="mb-12 z-20 relative pointer-events-auto">
      <div className="flex items-center justify-between mb-6 px-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3 italic flex-shrink-0">
          <span className="w-1.5 h-8 rounded-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
        {games.slice(0, visibleCount).map((game, index) => (
          <div key={game.game_id} className="w-full group relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-yellow-500 text-black font-black flex items-center justify-center rounded-full z-10 border-2 border-black shadow-[0_0_10px_rgba(234,179,8,0.5)]">
              {index + 1}
            </div>
            <Link to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}>
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 bg-zinc-900 border border-yellow-500/30 transition-all duration-300 group-hover:scale-105 group-hover:border-yellow-500">
                <GameCover 
                  gameId={game.game_id}
                  primaryUrl={game.cover_url || game.artwork_url} 
                  title={game.title}
                  systemId={game.system_id}
                  className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                />
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-500">
                    <Play className="w-6 h-6 text-black fill-current" />
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors truncate uppercase tracking-tight">
                {game.title}
              </h3>
            </Link>
          </div>
        ))}
      </div>

      {visibleCount < Math.min(20, games.length) && (
        <div className="mt-8 flex justify-center px-4">
          <button 
            onClick={handleExpand}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-yellow-500/30 text-yellow-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]"
          >
            VER MÁS (TOP {Math.min(visibleCount + 5, 20)}) <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
