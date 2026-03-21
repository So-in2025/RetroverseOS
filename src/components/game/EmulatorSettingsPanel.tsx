import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Monitor, Volume2, Sliders, X, Zap, ShieldAlert, Gamepad2 } from 'lucide-react';
import { haptics } from '../../services/haptics';
import { storage } from '../../services/storage';
import { AudioEngine } from '../../services/audioEngine';
import { inputManager } from '../../services/inputManager';
import { RetroButton } from '../../services/inputManager';

interface EmulatorSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  crtEnabled: boolean;
  onToggleCrt: (enabled: boolean) => void;
  activeFilter: string;
  onChangeFilter: (filter: string) => void;
  bilinearEnabled: boolean;
  onToggleBilinear: (enabled: boolean) => void;
  scanlinesEnabled: boolean;
  onToggleScanlines: (enabled: boolean) => void;
}

export default function EmulatorSettingsPanel({ 
  isOpen, 
  onClose, 
  crtEnabled, 
  onToggleCrt,
  activeFilter,
  onChangeFilter,
  bilinearEnabled,
  onToggleBilinear,
  scanlinesEnabled,
  onToggleScanlines
}: EmulatorSettingsPanelProps) {
  const [volume, setVolume] = useState(100);
  const [showRemapping, setShowRemapping] = useState(false);
  const [remappingButton, setRemappingButton] = useState<RetroButton | null>(null);

  const buttons: RetroButton[] = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'start', 'select', 'l', 'r'];

  const handleRemap = (button: RetroButton) => {
    setRemappingButton(button);
    const listener = (e: KeyboardEvent) => {
      inputManager.updateKeyMapping({ [button]: e.key });
      setRemappingButton(null);
      window.removeEventListener('keydown', listener);
    };
    window.addEventListener('keydown', listener);
  };

  useEffect(() => {
    if (isOpen) {
      AudioEngine.playMoveSound();
    }
  }, [isOpen]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    // In a real implementation, this would call emulator.setVolume(newVol / 100)
  };

  const filters = [
    { id: 'classic', name: 'Clásico (CRT)' },
    { id: 'cyberpunk', name: 'Cyberpunk' },
    { id: 'vhs', name: 'VHS Glitch' },
    { id: 'matrix', name: 'Matrix Green' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Sliders className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ajustes del Emulador</h2>
                  <p className="text-xs text-zinc-400">Configuración avanzada de video y audio</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              
              {/* Video Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Monitor className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Video & Filtros</h3>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <div>
                    <div className="font-bold text-white">Filtro CRT</div>
                    <div className="text-xs text-zinc-400">Simula una pantalla de tubo antigua</div>
                  </div>
                  <button
                    onClick={() => {
                      haptics.light();
                      onToggleCrt(!crtEnabled);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${crtEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${crtEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <div>
                    <div className="font-bold text-white">Scanlines</div>
                    <div className="text-xs text-zinc-400">Líneas de escaneo horizontales</div>
                  </div>
                  <button
                    onClick={() => {
                      haptics.light();
                      onToggleScanlines(!scanlinesEnabled);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scanlinesEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scanlinesEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <div>
                    <div className="font-bold text-white">Suavizado de Píxeles (Bilinear)</div>
                    <div className="text-xs text-zinc-400">Reduce los bordes dentados</div>
                  </div>
                  <button
                    onClick={() => {
                      haptics.light();
                      onToggleBilinear(!bilinearEnabled);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bilinearEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${bilinearEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {crtEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    {filters.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          haptics.light();
                          onChangeFilter(f.id);
                        }}
                        className={`p-3 rounded-xl text-sm font-bold transition-all border ${
                          activeFilter === f.id 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
                            : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <Volume2 className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Audio</h3>
                </div>
                
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">Volumen Maestro</span>
                    <span className="text-xs font-mono text-cyan-400">{volume}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>

              {/* Input Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Gamepad2 className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Controles</h3>
                </div>
                
                <button
                  onClick={() => setShowRemapping(!showRemapping)}
                  className="w-full p-4 bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl border border-white/5 flex items-center justify-between transition-colors"
                >
                  <div className="text-left">
                    <div className="font-bold text-white">Mapeo de Botones</div>
                    <div className="text-xs text-zinc-400">Personaliza los controles del teclado y gamepad</div>
                  </div>
                  <Settings className="w-5 h-5 text-zinc-400" />
                </button>

                {showRemapping && (
                  <div className="space-y-2 p-4 bg-zinc-900/30 rounded-xl border border-white/5">
                    {buttons.map(btn => (
                      <div key={btn} className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg">
                        <span className="uppercase font-mono text-xs text-zinc-400">{btn}</span>
                        <button 
                          onClick={() => handleRemap(btn)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${remappingButton === btn ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-white'}`}
                        >
                          {remappingButton === btn ? 'Presiona tecla...' : 'Cambiar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  Los filtros avanzados pueden afectar el rendimiento en dispositivos móviles o de gama baja. Desactívalos si notas lag.
                </p>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
