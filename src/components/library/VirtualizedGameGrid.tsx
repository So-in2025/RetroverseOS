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

interface CellData {
  games: GameObject[];
  columnCount: number;
  onCacheChange?: (gameId: string, isCached: boolean) => void;
}

const Cell = ({ columnIndex, rowIndex, style, data }: { columnIndex: number; rowIndex: number; style: React.CSSProperties; data: CellData }) => {
  const { games, columnCount, onCacheChange } = data;
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
        className="group relative w-full h-full bg-zinc-900/80 rounded-xl overflow-hidden border border-white/5 hover:border-cyan-electric/50 hover:shadow-[0_0_30px_rgba(0,242,255,0.15)] transition-all duration-500 block backdrop-blur-sm"
      >
        {/* Subtle Inner Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(0,242,255,0.1),transparent_70%)]" />
        
        <GameCover 
          key={game.game_id}
          gameId={game.game_id}
          archiveId={game.archive_id}
          primaryUrl={game.artwork_url || game.cover_url} 
          title={game.title}
          systemId={game.system_id}
          className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-105 group-hover:brightness-110"
        />
        
        {/* Overlay Info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-end p-4 text-center pb-8">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-cyan-electric/20 border border-cyan-electric/40 flex items-center justify-center mb-4 backdrop-blur-md shadow-[0_0_20px_rgba(0,242,255,0.3)]">
              <Play className="w-6 h-6 text-cyan-electric fill-current" />
            </div>
            
            <h4 className="font-black text-[11px] uppercase tracking-tighter leading-tight text-white mb-3 line-clamp-2 max-w-[140px] drop-shadow-lg">
              {game.title}
            </h4>
            
            <div className="flex items-center gap-2">
              <DownloadButton 
                gameId={game.game_id} 
                romUrl={game.rom_url} 
                systemId={game.system_id}
                onStatusChange={(isCached) => onCacheChange?.(game.game_id, isCached)}
              />
            </div>
          </div>
        </div>

        {/* System Badge (Always Visible but subtle) */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md text-[7px] font-bold uppercase tracking-[0.2em] text-white/50 border border-white/5 group-hover:text-cyan-electric group-hover:border-cyan-electric/30 transition-colors">
          {game.system_id.replace(/_/g, ' ')}
        </div>
      </Link>
    </div>
  );
};

export const VirtualizedGameGrid: React.FC<VirtualizedGameGridProps> = ({
  games,
  width,
  height,
  onCacheChange
}) => {
  // Configuración de la rejilla
  const safeWidth = Math.max(width, 300);
  const columnWidth = 180;
  const rowHeight = 270;
  const columnCount = Math.max(2, Math.floor(safeWidth / (columnWidth + 16)));
  const rowCount = Math.ceil(games.length / columnCount);

  const itemData: CellData = useMemo(() => ({
    games,
    columnCount,
    onCacheChange
  }), [games, columnCount, onCacheChange]);

  return (
    <Grid
      columnCount={columnCount}
      columnWidth={safeWidth / columnCount}
      height={height}
      rowCount={rowCount}
      rowHeight={rowHeight}
      width={safeWidth}
      itemData={itemData}
      className="hide-scrollbar"
    >
      {Cell}
    </Grid>
  );
};
