import React from 'react';
import { GameObject } from '../../services/metadataNormalization';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { DynamicCover } from './DynamicCover';

interface GameSectionProps {
  title: string;
  games: GameObject[];
  variant?: 'default' | 'live' | 'online' | 'elite';
}

const GameSection: React.FC<GameSectionProps> = ({ title, games, variant = 'default' }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (games.length === 0) return null;

  return (
    <div className="mb-12 z-20 relative pointer-events-auto">
      <div className="flex items-center justify-between mb-6 px-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3 italic flex-shrink-0">
          <span className={`w-1.5 h-8 rounded-full ${
            variant === 'live' ? 'bg-rose-500 animate-pulse' : 
            variant === 'online' ? 'bg-emerald-500' : 
            variant === 'elite' ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]' :
            'bg-magenta-accent'
          }`} />
          {title}
        </h2>
        {games.length > 5 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="text-xs font-bold text-white hover:bg-cyan-electric transition-colors uppercase tracking-widest pointer-events-auto cursor-pointer active:scale-95 bg-zinc-800 p-2 rounded"
          >
            {isExpanded ? 'COLAPSAR' : 'VER TODO'}
          </button>
        )}
      </div>

      {/* Grid (Always visible) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
        {games.slice(0, isExpanded ? games.length : (variant === 'elite' ? 15 : 5)).map((game) => (
          <div key={game.game_id} className="w-full group">
            <Link to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}>
              <div className={`relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 bg-zinc-900 border transition-all duration-300 group-hover:scale-105 ${
                variant === 'live' ? 'border-rose-500/30 group-hover:border-rose-500' : 
                variant === 'online' ? 'border-emerald-500/30 group-hover:border-emerald-500' : 
                variant === 'elite' ? 'border-yellow-500/30 group-hover:border-yellow-500' :
                'border-white/5 group-hover:border-cyan-electric/50'
              }`}>
                <DynamicCover 
                  src={game.cover_url || game.artwork_url} 
                  alt={game.title}
                  title={game.title}
                  system={game.system}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    variant === 'live' ? 'bg-rose-500' : 
                    variant === 'online' ? 'bg-emerald-500' : 
                    variant === 'elite' ? 'bg-yellow-500' :
                    'bg-cyan-electric'
                  }`}>
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
    </div>
  );
};

export default GameSection;
