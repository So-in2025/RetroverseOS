import React, { useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { GameObject } from '../../services/metadataNormalization';
import { GameCover } from './GameCover';
import { DownloadButton } from './DownloadButton';
import { AudioEngine } from '../../services/audioEngine';

interface VirtualizedGameGridProps {
  games: GameObject[];
  width: number;
  height: number;
  onCacheChange?: (gameId: string, isCached: boolean) => void;
}

export const VirtualizedGameGrid: React.FC<VirtualizedGameGridProps> = ({
  games,
  width,
  height,
  onCacheChange
}) => {
  // Configuración de la rejilla
  const columnWidth = 180;
  const rowHeight = 270;
  const columnCount = Math.max(2, Math.floor(width / (columnWidth + 16)));
  const rowCount = Math.ceil(games.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    const game = games[index];

    if (!game) return null;

    return (
      <div style={{
        ...style,
        padding: '8px',
      }}>
        <Link 
          to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}
          onClick={() => AudioEngine.playSelectSound()}
          className="group relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-electric hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all block"
        >
          <GameCover 
            gameId={game.game_id}
            primaryUrl={game.cover_url || game.artwork_url} 
            title={game.title}
            systemId={game.system_id}
            className="w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
            <Play className="w-10 h-10 text-cyan-electric fill-current mb-3 drop-shadow-[0_0_10px_rgba(0,242,255,0.8)] transform scale-90 group-hover:scale-100 transition-transform" />
            <h4 className="font-black text-[10px] uppercase tracking-tight leading-tight text-white mb-2 line-clamp-2">
              {game.title}
            </h4>
            <DownloadButton 
              gameId={game.game_id} 
              romUrl={game.rom_url} 
              systemId={game.system_id}
              onStatusChange={(isCached) => onCacheChange?.(game.game_id, isCached)}
            />
          </div>
        </Link>
      </div>
    );
  };

  return (
    <Grid
      columnCount={columnCount}
      columnWidth={width / columnCount}
      height={height}
      rowCount={rowCount}
      rowHeight={rowHeight}
      width={width}
      className="hide-scrollbar"
    >
      {Cell}
    </Grid>
  );
};
