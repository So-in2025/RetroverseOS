import { Pause, Settings, Mic, MicOff, Gamepad2 } from 'lucide-react';
import { useState } from 'react';

interface GameOverlayProps {
  onPause: () => void;
  onResume: () => void;
  onExit: () => void;
  onOpenSavePanel: () => void;
  isPaused: boolean;
}

export default function GameOverlay({ onPause, onResume, onExit, onOpenSavePanel, isPaused }: GameOverlayProps) {
  if (!isPaused) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-40">
      {/* Pause Menu */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto">
        <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10 max-w-sm w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">Juego Pausado</h2>
          <div className="space-y-3">
            <button onClick={onResume} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors">
              Reanudar Juego
            </button>
            <button onClick={onOpenSavePanel} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors">
              Guardar / Cargar Partida
            </button>
            <button onClick={onExit} className="w-full py-3 bg-red-900/50 hover:bg-red-900/70 text-red-200 rounded-xl font-medium transition-colors mt-4">
              Salir a la Bóveda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
