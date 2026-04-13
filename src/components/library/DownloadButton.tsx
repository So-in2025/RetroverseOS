import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { ROMFetchService } from '../../services/romFetcher';
import { storage } from '../../services/storage';
import { haptics } from '../../services/haptics';

interface DownloadButtonProps {
  gameId: string;
  romUrl: string;
  systemId: string;
  onStatusChange?: (isCached: boolean) => void;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ gameId, romUrl, systemId, onStatusChange }) => {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'cached' | 'confirm_delete'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const checkCache = async () => {
      const isCached = await storage.isRomCached(gameId);
      if (isCached) {
        setStatus('cached');
        onStatusChange?.(true);
      }
    };
    checkCache();
  }, [gameId]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (status === 'cached') {
      setStatus('confirm_delete');
      return;
    }

    if (status === 'confirm_delete') {
      await storage.deleteCachedRom(gameId);
      setStatus('idle');
      onStatusChange?.(false);
      haptics.medium();
      return;
    }

    setStatus('downloading');
    haptics.light();
    
    try {
      await ROMFetchService.fetchRom(gameId, romUrl, (msg) => {
        const match = msg.match(/(\d+)%/);
        if (match) setProgress(parseInt(match[1], 10));
      }, systemId);
      
      setStatus('cached');
      onStatusChange?.(true);
      haptics.success();
    } catch (error: any) {
      console.error('[DownloadButton] Failed:', error);
      setStatus('idle');
      // We can't use alert() in iframe, so we just log it and maybe show a toast if we had one here.
      // For now, we just reset the state. The user can try again.
      haptics.error();
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('cached');
  };

  if (status === 'downloading') {
    return (
      <div className="flex items-center gap-2 bg-cyan-electric/20 px-3 py-1.5 rounded-lg border border-cyan-electric/30">
        <Loader2 className="w-3 h-3 text-cyan-electric animate-spin" />
        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-electric transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[8px] font-black text-cyan-electric">{progress}%</span>
      </div>
    );
  }

  if (status === 'confirm_delete') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
        >
          <Trash2 className="w-3 h-3" />
          <span className="text-[8px] font-black uppercase tracking-widest">CONFIRMAR</span>
        </button>
        <button
          onClick={handleCancelDelete}
          className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest"
        >
          X
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all group ${
        status === 'cached'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-500'
          : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-cyan-electric/10 hover:border-cyan-electric/30 hover:text-cyan-electric'
      }`}
      title={status === 'cached' ? 'Eliminar de Local' : 'Descargar para jugar Offline'}
    >
      {status === 'cached' ? (
        <>
          <CheckCircle className="w-3 h-3 group-hover:hidden" />
          <Trash2 className="w-3 h-3 hidden group-hover:block" />
          <span className="text-[8px] font-black uppercase tracking-widest">
            <span className="group-hover:hidden">BAJADO</span>
            <span className="hidden group-hover:inline">BORRAR</span>
          </span>
        </>
      ) : (
        <>
          <Download className="w-3 h-3" />
          <span className="text-[8px] font-black uppercase tracking-widest">BAJAR</span>
        </>
      )}
    </button>
  );
};
