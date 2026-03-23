import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Monitor, Volume2, Sliders, X, Zap, ShieldAlert, Gamepad2, Save, RotateCcw, Check, Keyboard } from 'lucide-react';
import { haptics } from '../../services/haptics';
import { storage } from '../../services/storage';
import { AudioEngine } from '../../services/audioEngine';
import { inputManager, RetroButton } from '../../services/inputManager';
import { economyService } from '../../services/economyService';
import { useAuth } from '../../services/AuthContext';

interface EmulatorSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  videoSettings: any;
  onUpdateVideo: (settings: any) => void;
}

export default function EmulatorSettingsPanel({ 
  isOpen, 
  onClose, 
  videoSettings,
  onUpdateVideo
}: EmulatorSettingsPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'controls'>('video');
  const [audioSettings, setAudioSettings] = useState({
    masterVolume: 80,
    musicVolume: 60,
    sfxVolume: 100,
    latencyMode: 'ultra-low',
  });
  const [controls, setControls] = useState({
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    a: '2', b: '1', x: '5', y: '4', l: '6', r: '3', start: 'Enter', select: '+'
  });
  const [activeKeyBind, setActiveKeyBind] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      AudioEngine.playMoveSound();
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    const savedAudio = await economyService.getAudioSettings(user?.id);
    if (savedAudio) setAudioSettings(prev => ({ ...prev, ...savedAudio }));
    
    const savedControls = await economyService.getControls(user?.id);
    if (savedControls) setControls(prev => ({ ...prev, ...savedControls }));
  };

  const handleSave = async () => {
    try {
      await economyService.saveVideoSettings(user?.id, videoSettings);
      await economyService.saveAudioSettings(user?.id, audioSettings);
      await economyService.saveControls(user?.id, controls);
      inputManager.updateKeyMapping(controls);
      setSaved(true);
      haptics.success();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (activeKeyBind) {
      e.preventDefault();
      setControls({ ...controls, [activeKeyBind]: e.key === ' ' ? 'Espacio' : e.key });
      setActiveKeyBind(null);
      haptics.light();
    }
  };

  useEffect(() => {
    if (activeKeyBind) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKeyBind, controls]);

  const tabs = [
    { id: 'video', label: 'Video', icon: Monitor },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'controls', label: 'Controles', icon: Gamepad2 },
  ];

  const filters = [
    { id: 'classic', name: 'Clásico' },
    { id: 'cyberpunk', name: 'Cyberpunk' },
    { id: 'vhs', name: 'VHS Glitch' },
    { id: 'matrix', name: 'Matrix' }
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
            className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Sliders className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ajustes del Sistema</h2>
                  <p className="text-xs text-zinc-400">Configuración unificada del motor</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSave}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                    saved ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                  {saved ? 'Guardado' : 'Aplicar'}
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-zinc-900/30 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    haptics.light();
                  }}
                  className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                    activeTab === tab.id ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              
              {/* VIDEO SETTINGS */}
              {activeTab === 'video' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <div>
                        <div className="font-bold text-white text-sm">Filtro CRT</div>
                        <div className="text-[10px] text-zinc-400">Simula una pantalla clásica</div>
                      </div>
                      <button
                        onClick={() => onUpdateVideo({ ...videoSettings, crtFilter: !videoSettings.crtFilter })}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${videoSettings.crtFilter ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${videoSettings.crtFilter ? 'translate-x-5.5' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <div>
                        <div className="font-bold text-white text-sm">Scanlines</div>
                        <div className="text-[10px] text-zinc-400">Líneas de escaneo horizontales</div>
                      </div>
                      <button
                        onClick={() => onUpdateVideo({ ...videoSettings, scanlines: videoSettings.scanlines > 0 ? 0 : 50 })}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${videoSettings.scanlines > 0 ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${videoSettings.scanlines > 0 ? 'translate-x-5.5' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <div>
                        <div className="font-bold text-white text-sm">Suavizado Bilineal</div>
                        <div className="text-[10px] text-zinc-400">Reduce bordes pixelados</div>
                      </div>
                      <button
                        onClick={() => onUpdateVideo({ ...videoSettings, bilinearFiltering: !videoSettings.bilinearFiltering })}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${videoSettings.bilinearFiltering ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${videoSettings.bilinearFiltering ? 'translate-x-5.5' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <div>
                        <div className="font-bold text-white text-sm">V-Sync</div>
                        <div className="text-[10px] text-zinc-400">Prevenir desgarro de pantalla</div>
                      </div>
                      <button
                        onClick={() => onUpdateVideo({ ...videoSettings, vsync: !videoSettings.vsync })}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${videoSettings.vsync ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${videoSettings.vsync ? 'translate-x-5.5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                    <div className="flex justify-between mb-4">
                      <p className="font-black text-[10px] uppercase tracking-widest text-white">Intensidad de Scanlines</p>
                      <span className="text-emerald-400 font-mono text-[10px]">{videoSettings.scanlines}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={videoSettings.scanlines}
                      onChange={(e) => onUpdateVideo({ ...videoSettings, scanlines: parseInt(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                    <p className="font-black text-[10px] uppercase tracking-widest text-white mb-4">Filtros de Post-Procesado</p>
                    <div className="grid grid-cols-2 gap-2">
                      {filters.map(f => (
                        <button
                          key={f.id}
                          onClick={() => onUpdateVideo({ ...videoSettings, activeFilter: f.id })}
                          className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            videoSettings.activeFilter === f.id 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
                              : 'bg-zinc-950 text-zinc-500 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AUDIO SETTINGS */}
              {activeTab === 'audio' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {[
                    { id: 'masterVolume', label: 'Volumen Maestro' },
                    { id: 'musicVolume', label: 'Volumen de Música' },
                    { id: 'sfxVolume', label: 'Volumen de Efectos' },
                  ].map((vol) => (
                    <div key={vol.id} className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <div className="flex justify-between mb-4">
                        <p className="font-black text-[10px] uppercase tracking-widest text-white">{vol.label}</p>
                        <span className="text-emerald-400 font-mono text-[10px]">{(audioSettings as any)[vol.id]}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={(audioSettings as any)[vol.id]}
                        onChange={(e) => setAudioSettings({...audioSettings, [vol.id]: parseInt(e.target.value)})}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </motion.div>
              )}

              {/* CONTROLS SETTINGS */}
              {activeTab === 'controls' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {Object.entries(controls).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{key}</span>
                        <button
                          onClick={() => {
                            setActiveKeyBind(key);
                            haptics.light();
                          }}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all min-w-[80px] ${
                            activeKeyBind === key 
                              ? 'bg-emerald-500 text-black animate-pulse' 
                              : 'bg-zinc-800 text-white hover:bg-zinc-700'
                          }`}
                        >
                          {activeKeyBind === key ? 'Presiona...' : value}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-3">
                    <Keyboard className="w-5 h-5 text-emerald-500" />
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Los cambios en los controles se aplicarán inmediatamente al motor de emulación.
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                  Los ajustes avanzados se sincronizan con tu perfil global. Algunos cambios pueden requerir reiniciar el núcleo del emulador.
                </p>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
