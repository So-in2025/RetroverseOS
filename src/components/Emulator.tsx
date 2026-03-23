import React, { useEffect, useRef, useState } from 'react';
import { Nostalgist } from 'nostalgist';
import { useStore } from '../store';
import { X, Maximize, Volume2, VolumeX, Play, Pause, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Emulator: React.FC = () => {
  const { currentGame, setPlaying, setGame } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nostalgistRef = useRef<Nostalgist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentGame || !canvasRef.current) return;

    const initEmulator = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Map platform to core
        const coreMap: Record<string, string> = {
          psx: 'pcsx_rearmed',
          n64: 'mupen64plus_next',
          snes: 'snes9x',
          nes: 'nestopia',
          gba: 'mgba'
        };

        const core = coreMap[currentGame.platform];
        if (!core) throw new Error('Unsupported platform');

        nostalgistRef.current = await Nostalgist.launch({
          rom: currentGame.romUrl,
          core: core,
          element: canvasRef.current,
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Emulator launch failed:', err);
        setError('Failed to load emulator. Please try again.');
        setIsLoading(false);
      }
    };

    initEmulator();

    return () => {
      if (nostalgistRef.current) {
        nostalgistRef.current.exit();
        nostalgistRef.current = null;
      }
    };
  }, [currentGame]);

  if (!currentGame) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
    >
      <div className="relative w-full max-w-5xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-900/80 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">{currentGame.title}</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{currentGame.platform}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPlaying(false);
              setGame(null);
            }}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emulator Canvas Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />
          
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm text-zinc-400 font-mono animate-pulse">INITIALIZING CORE...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900 p-8 text-center">
              <p className="text-red-400 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-zinc-900/80 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-white/10" />
            <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">System Status: Optimal</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
