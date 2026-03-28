import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { GameCover } from '../library/GameCover';

interface LoadingScreenProps {
  status: string;
  progress: number;
  gameId?: string | null;
  coverUrl?: string | null;
  title?: string;
  system?: string;
  systemId?: string;
}

export default function LoadingScreen({ status, progress, gameId, coverUrl, title, system, systemId }: LoadingScreenProps) {
  const [showCover, setShowCover] = useState(false);

  useEffect(() => {
    setShowCover(true);
  }, []);

  // Determine system color for radial gradient
  const getSystemColor = (sys?: string) => {
    if (!sys) return 'rgba(0, 242, 255, 0.1)'; // Default Cyan
    const s = sys.toLowerCase();
    if (s.includes('nintendo') || s.includes('nes') || s.includes('famicom')) return 'rgba(220, 38, 38, 0.15)'; // Red
    if (s.includes('snes') || s.includes('super')) return 'rgba(99, 102, 241, 0.15)'; // Indigo
    if (s.includes('genesis') || s.includes('mega')) return 'rgba(0, 0, 0, 0.3)'; // Black/Dark
    if (s.includes('playstation') || s.includes('psx')) return 'rgba(37, 99, 235, 0.15)'; // Blue
    if (s.includes('xbox')) return 'rgba(16, 185, 129, 0.15)'; // Emerald
    return 'rgba(0, 242, 255, 0.1)';
  };

  const radialColor = getSystemColor(system || title);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: `radial-gradient(circle at center, ${radialColor} 0%, rgba(0,0,0,1) 70%)`
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-4xl px-8">
        
        {/* Cover Art with Pulse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-cyan-electric/20 blur-3xl rounded-full opacity-50 animate-pulse"></div>
          {gameId || coverUrl ? (
            <div className="relative w-64 h-auto md:w-96 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 overflow-hidden">
              <GameCover 
                gameId={gameId || ''}
                primaryUrl={coverUrl}
                title={title || "Game Cover"}
                systemId={systemId || ''}
                className="w-full h-auto object-contain max-h-[50vh]"
              />
            </div>
          ) : (
            <div className="relative w-64 h-80 md:w-96 md:h-96 bg-zinc-900 rounded-lg shadow-2xl flex items-center justify-center border border-white/5 z-10">
              <span className="text-zinc-700 font-black text-4xl uppercase tracking-tighter">NO SIGNAL</span>
            </div>
          )}
        </motion.div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-xl flex flex-col gap-6">
          <div className="relative h-4 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
            {/* Animated Background Track */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_0%,rgba(0,242,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
            
            <motion.div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-electric shadow-[0_0_25px_rgba(0,242,255,0.6)] rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 40, damping: 15 }}
            >
              {/* Glossy highlight */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.2)_0%,transparent_50%,rgba(0,0,0,0.1)_100%)]" />
            </motion.div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={status}
                className="flex flex-col"
              >
                <span className="text-cyan-electric font-black text-xs uppercase tracking-[0.2em] mb-1">Status Report</span>
                <span className="text-white font-bold text-lg uppercase tracking-tight">
                  {status || `Iniciando ${title || 'juego'}...`}
                </span>
              </motion.div>
              <div className="flex flex-col items-end">
                <span className="text-zinc-500 font-black text-xs uppercase tracking-widest mb-1">Progress</span>
                <span className="text-cyan-electric font-black text-3xl tracking-tighter italic">{progress}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
