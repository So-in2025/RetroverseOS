import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Clock, Shield, Swords, Copy, Check, Share2 } from 'lucide-react';

interface LobbyViewProps {
  gameId: string;
  players: string[];
  onStart: () => void;
  onInvite: () => void;
  status?: string | null;
}

export default function LobbyView({ gameId, players, onStart, onInvite, status }: LobbyViewProps) {
  const [timer, setTimer] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-30 bg-zinc-950 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl my-auto"
      >
        {/* Header */}
        <div className="bg-black/40 p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Swords className="w-6 h-6 text-emerald-500" />
              Sala de Espera
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Game ID: <span className="font-mono text-emerald-400">{gameId.toUpperCase()}</span></p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-lg border border-white/5">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="font-mono text-white">{formatTime(timer)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          
          {/* Player List */}
          <div className="space-y-4">
            <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2 md:mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Jugadores ({players.length + 1}/2)
            </h3>
            
            <div className="space-y-2">
              {/* Self */}
              <div className="flex items-center justify-between p-3 bg-emerald-900/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center font-bold text-white">TÚ</div>
                  <span className="font-medium text-white">Nexus_One</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">LISTO</span>
              </div>

              {/* Other Players */}
              {players.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/30 border border-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center font-bold text-zinc-400">P{i+2}</div>
                    <span className="font-medium text-zinc-300">Player_{p.slice(-4)}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-xs font-bold rounded">CONECTANDO...</span>
                </div>
              ))}

              {/* Empty Slots */}
              {Array.from({ length: Math.max(0, 1 - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center justify-between p-3 border border-dashed border-white/10 rounded-lg opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-800" />
                    <span className="text-zinc-500 italic">Buscando oponente...</span>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-800 border-t-emerald-500 animate-spin" />
                </div>
              ))}
            </div>
          </div>

          {/* Settings / Actions */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
               <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                 <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                   <Shield className="w-4 h-4 text-blue-400" /> Ajustes de Partida
                 </h4>
                 <ul className="space-y-2 text-sm text-zinc-400">
                   <li className="flex justify-between"><span>Región</span> <span className="text-white">US East</span></li>
                   <li className="flex justify-between"><span>Modo</span> <span className="text-white">Clasificatoria</span></li>
                   <li className="flex justify-between"><span>Retraso de Entrada</span> <span className="text-emerald-400">~12ms</span></li>
                 </ul>
               </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={onStart}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 flex items-center justify-center gap-2"
              >
                <Swords className="w-5 h-5" />
                {players.length > 0 ? 'INICIAR PARTIDA' : 'INICIAR (SOLO)'}
              </button>

              {status && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
                  <span className="text-xs font-mono text-emerald-400">{status}</span>
                </div>
              )}
              
              <button 
                onClick={onInvite}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Invitar Amigo
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
