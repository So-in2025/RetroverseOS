import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Volume2, Gamepad2, Cpu, Save, RotateCcw, Check, Keyboard, LogOut, Trash2, Zap, User, Coins, ShieldCheck, Activity, AlertTriangle, Globe, Fingerprint, Video } from 'lucide-react';
import { storage } from '../services/storage';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../services/AuthContext';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';
import { SentinelEngine } from '../services/gcts';
import { gameCatalog } from '../services/gameCatalog';
import { inputManager } from '../services/inputManager';
import { economyService } from '../services/economyService';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout = useAuthStore((state) => state.logout);
  const sentinelStats = useGameStore((state) => state.sentinelStats);
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'controls' | 'system' | 'sentinel' | 'storage' | 'network' | 'streamer'>('video');
  const [saved, setSaved] = useState(false);
  const [credits, setCredits] = useState(0);
  const [isForcingRepair, setIsForcingRepair] = useState(false);
  const [storageStats, setStorageStats] = useState<{
    totalSize: number;
    games: { gameId: string, title: string, size: number, playCount: number, lastPlayed: number }[]
  }>({ totalSize: 0, games: [] });

  // Engine Configuration State
  const [videoSettings, setVideoSettings] = useState({
    qualityPreset: 'custom',
    crtFilter: true,
    scanlines: 50,
    bilinearFiltering: false,
    textureEnhancement: true,
    aspectRatio: '4:3',
    resolution: '1080p',
    vsync: true,
    activeFilter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100
  });

  const [audioSettings, setAudioSettings] = useState({
    masterVolume: 80,
    musicVolume: 60,
    sfxVolume: 100,
    latencyMode: 'ultra-low',
  });

  const [controls, setControls] = useState({
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    a: '2',
    b: '1',
    x: '5',
    y: '4',
    l: '6',
    r: '3',
    start: 'Enter',
    select: '+',
  });

  const [activeKeyBind, setActiveKeyBind] = useState<string | null>(null);

  const [networkSettings, setNetworkSettings] = useState({
    useProxy: true,
    useFingerprint: true,
    proxyMode: 'auto' as 'auto' | 'manual',
    anonymityLevel: 'high' as 'low' | 'medium' | 'high',
  });

  const [language, setLanguage] = useState('es');

  const [streamerSettings, setStreamerSettings] = useState({
    enabled: false,
    hidePrivateInfo: true,
    audienceInteraction: true,
    showOverlay: false,
    twitchIntegration: false,
  });

  const handleSave = async () => {
    try {
      await economyService.saveVideoSettings(user?.id, videoSettings);
      await economyService.saveAudioSettings(user?.id, audioSettings);
      await economyService.saveControls(user?.id, controls);
      await economyService.saveSetting('networkSettings', networkSettings, user?.id);
      await economyService.saveSetting('language', language, user?.id);
      await economyService.saveSetting('streamerSettings', streamerSettings, user?.id);
      inputManager.updateKeyMapping(controls);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedVideo = await economyService.getVideoSettings(user?.id);
      if (savedVideo) setVideoSettings(prev => ({ ...prev, ...savedVideo }));
      
      const savedAudio = await economyService.getAudioSettings(user?.id);
      if (savedAudio) setAudioSettings(prev => ({ ...prev, ...savedAudio }));
      
      const savedControls = await economyService.getControls(user?.id);
      if (savedControls) setControls(prev => ({ ...prev, ...savedControls }));

      const savedNetwork = await economyService.getSetting('networkSettings', user?.id);
      if (savedNetwork) setNetworkSettings(prev => ({ ...prev, ...savedNetwork }));

      const savedLanguage = await economyService.getSetting('language', user?.id);
      if (savedLanguage) setLanguage(savedLanguage);

      const savedStreamer = await economyService.getSetting('streamerSettings', user?.id);
      if (savedStreamer) setStreamerSettings(prev => ({ ...prev, ...savedStreamer }));

      const currentCredits = await economyService.getCredits(user?.id);
      setCredits(currentCredits);

      // Load Storage Stats
      const roms = await storage.getAllCachedRomsMetadata();
      const stats = await storage.getAllStats();
      const allGames = gameCatalog.getAllGames();
      
      const gamesWithStats = roms.map(rom => {
        const game = allGames.find(g => g.game_id === rom.gameId);
        const stat = stats.find(s => s.gameId === rom.gameId);
        return {
          gameId: rom.gameId,
          title: game?.title || 'Unknown Game',
          size: rom.size,
          playCount: stat?.playCount || 0,
          lastPlayed: rom.lastAccessed
        };
      }).sort((a, b) => b.playCount - a.playCount);

      setStorageStats({
        totalSize: roms.reduce((acc, rom) => acc + rom.size, 0),
        games: gamesWithStats
      });
    };
    loadSettings();
  }, []);

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [repairResult, setRepairResult] = useState<string | null>(null);

  const handleDeleteGame = async (gameId: string) => {
    setShowDeleteModal(gameId);
  };

  const executeDeleteRom = async () => {
    if (showDeleteModal) {
      await storage.deleteCachedRom(showDeleteModal);
      window.location.reload();
    }
  };

  const tabs = [
    { id: 'video', label: 'Video y Pantalla', icon: Monitor },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'controls', label: 'Mapeo de Controles', icon: Gamepad2 },
    { id: 'system', label: 'Sistema y Emulación', icon: Cpu },
    { id: 'sentinel', label: 'Motor Sentinel', icon: ShieldCheck },
    { id: 'network', label: 'Red y Privacidad', icon: Globe },
    { id: 'streamer', label: 'Modo Streamer', icon: Video },
    { id: 'storage', label: 'Gestión de Almacenamiento', icon: Save },
  ];

  const handleClearCatalog = async () => {
    setShowPurgeModal(true);
  };

  const executePurge = async () => {
    await storage.clearCatalog();
    await storage.clearAllRoms();
    window.location.reload();
  };

  const handleReboot = () => {
    setShowRebootModal(true);
  };

  const executeReboot = () => {
    window.location.href = '/';
  };

  const handleForceRepair = async () => {
    setShowRepairModal(true);
  };

  const executeRepair = async () => {
    setIsForcingRepair(true);
    try {
      const games = await gameCatalog.getAllGames();
      let repaired = 0;
      for (const game of games) {
        if (game.compatibility_status === 'broken') {
          game.compatibility_status = 'untested';
          await gameCatalog.addGame(game);
          repaired++;
        }
      }
      // Restart worker if it was stopped
      SentinelEngine.startBackgroundWorker();
      setRepairResult(`Reparación completada. Se han restablecido ${repaired} juegos.`);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      console.error(e);
      setRepairResult('Error durante la reparación.');
      setTimeout(() => {
        setShowRepairModal(false);
        setRepairResult(null);
      }, 2000);
    } finally {
      setIsForcingRepair(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeKeyBind) {
      e.preventDefault();
      setControls({ ...controls, [activeKeyBind]: e.key === ' ' ? 'Espacio' : e.key });
      setActiveKeyBind(null);
    }
  };

  return (
    <div 
      className="min-h-screen bg-zinc-950 text-white font-sans outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-500" />
          <h1 className="font-black italic uppercase tracking-tighter text-sm">Configuración del Sistema</h1>
        </div>
        <button 
          onClick={handleSave}
          className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
            saved ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8 pb-32 lg:pb-20">
        
        {/* Desktop Header */}
        <div className="hidden lg:flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-white/10 pb-6 gap-6">
          <div className="w-full">
            <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter mb-2 flex items-center gap-3">
              <Cpu className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
              Configuración del Motor
            </h1>
            <p className="text-zinc-400 text-sm">Ajusta tu hardware de emulación y entradas.</p>
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <button className="flex-1 md:flex-none px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Reiniciar
            </button>
            <button 
              onClick={handleSave}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                saved ? 'bg-emerald-500 text-white shadow-emerald-900/50' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
              }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? '¡Guardado!' : 'Aplicar'}
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0 flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-none md:flex-none flex items-center justify-center md:justify-start gap-3 px-5 py-3 md:py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-inner' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-zinc-900/50 border border-white/5 rounded-2xl p-5 md:p-8 min-h-0 md:min-h-[500px]">
            <AnimatePresence mode="wait">
              
              {/* VIDEO SETTINGS */}
              {activeTab === 'video' && (
                <motion.div 
                  key="video"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                    <Monitor className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" /> Configuración de Video
                  </h2>
                  
                  <div className="mb-8">
                    <p className="font-black text-xs uppercase tracking-widest text-white mb-3">Perfil de Calidad Visual</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { id: 'potato', label: 'Baja (Potato)', desc: 'Rendimiento Máximo' },
                        { id: 'retro', label: 'Media (Retro)', desc: 'Fiel al Original' },
                        { id: 'smooth', label: 'Alta (Suave)', desc: 'Bordes Suavizados' },
                        { id: 'ultra', label: 'Ultra (HD)', desc: 'Máxima Calidad' },
                        { id: 'custom', label: 'Personalizada', desc: 'Ajuste Manual' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            let newSettings = { ...videoSettings, qualityPreset: preset.id };
                            if (preset.id === 'potato') {
                              newSettings = { ...newSettings, crtFilter: false, bilinearFiltering: false, textureEnhancement: false, resolution: 'Nativa', vsync: false };
                            } else if (preset.id === 'retro') {
                              newSettings = { ...newSettings, crtFilter: true, bilinearFiltering: false, textureEnhancement: false, resolution: 'Nativa', vsync: true };
                            } else if (preset.id === 'smooth') {
                              newSettings = { ...newSettings, crtFilter: false, bilinearFiltering: true, textureEnhancement: true, resolution: '1080p', vsync: true };
                            } else if (preset.id === 'ultra') {
                              newSettings = { ...newSettings, crtFilter: true, bilinearFiltering: true, textureEnhancement: true, resolution: '4K', vsync: true };
                            }
                            setVideoSettings(newSettings);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            videoSettings.qualityPreset === preset.id 
                              ? 'bg-emerald-500/20 border-emerald-500/50' 
                              : 'bg-black/20 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          <p className={`font-black text-[10px] uppercase tracking-widest ${videoSettings.qualityPreset === preset.id ? 'text-emerald-400' : 'text-white'}`}>{preset.label}</p>
                          <p className="text-[9px] text-zinc-500 mt-1">{preset.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {/* Toggles */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">Emulación CRT</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Simular pantalla de televisión clásica</p>
                        </div>
                        <button 
                          onClick={() => setVideoSettings({...videoSettings, crtFilter: !videoSettings.crtFilter, qualityPreset: 'custom'})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${videoSettings.crtFilter ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${videoSettings.crtFilter ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">Filtro Bilineal</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Suavizar bordes pixelados</p>
                        </div>
                        <button 
                          onClick={() => setVideoSettings({...videoSettings, bilinearFiltering: !videoSettings.bilinearFiltering, qualityPreset: 'custom'})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${videoSettings.bilinearFiltering ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${videoSettings.bilinearFiltering ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">Mejora de Texturas (3D)</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Aplica MSAA 16x y Trilineal (N64/PSX)</p>
                        </div>
                        <button 
                          onClick={() => setVideoSettings({...videoSettings, textureEnhancement: !videoSettings.textureEnhancement, qualityPreset: 'custom'})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${videoSettings.textureEnhancement ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${videoSettings.textureEnhancement ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">V-Sync</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Prevenir desgarro de pantalla</p>
                        </div>
                        <button 
                          onClick={() => setVideoSettings({...videoSettings, vsync: !videoSettings.vsync, qualityPreset: 'custom'})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${videoSettings.vsync ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${videoSettings.vsync ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Sliders & Selects */}
                    <div className="space-y-4">
                      <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex justify-between mb-2">
                          <p className="font-black text-xs uppercase tracking-widest text-white">Intensidad de Scanlines</p>
                          <span className="text-emerald-400 font-mono text-[10px]">{videoSettings.scanlines}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={videoSettings.scanlines}
                          onChange={(e) => setVideoSettings({...videoSettings, scanlines: parseInt(e.target.value), qualityPreset: 'custom'})}
                          className="w-full accent-emerald-500 cursor-pointer"
                          disabled={!videoSettings.crtFilter}
                        />
                      </div>

                      <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                        <p className="font-black text-xs uppercase tracking-widest text-white mb-3">Relación de Aspecto</p>
                        <div className="flex gap-2">
                          {['4:3', '16:9', 'Original'].map((ratio) => (
                            <button 
                              key={ratio}
                              onClick={() => setVideoSettings({...videoSettings, aspectRatio: ratio, qualityPreset: 'custom'})}
                              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                videoSettings.aspectRatio === ratio 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                              }`}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                        <p className="font-black text-xs uppercase tracking-widest text-white mb-3">Estilo Visual (CRT)</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'classic', label: 'Clásico' },
                            { id: 'cyberpunk', label: 'Cyberpunk' },
                            { id: 'vhs', label: 'VHS Glitch' },
                            { id: 'matrix', label: 'Matrix' }
                          ].map((filter) => (
                            <button 
                              key={filter.id}
                              onClick={() => setVideoSettings({...videoSettings, activeFilter: filter.id as any, qualityPreset: 'custom'})}
                              className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                videoSettings.activeFilter === filter.id 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                              }`}
                            >
                              {filter.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                        <p className="font-black text-xs uppercase tracking-widest text-white mb-3">Resolución</p>
                        <div className="flex gap-2">
                          {['Nativa', '1080p', '4K'].map((res) => (
                            <button 
                              key={res}
                              onClick={() => setVideoSettings({...videoSettings, resolution: res, qualityPreset: 'custom'})}
                              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                videoSettings.resolution === res 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                              }`}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}


              {/* AUDIO SETTINGS */}
              {activeTab === 'audio' && (
                <motion.div 
                  key="audio"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                    <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" /> Configuración de Audio
                  </h2>
                  
                  <div className="max-w-2xl space-y-4">
                    {[
                      { id: 'masterVolume', label: 'Volumen Maestro' },
                      { id: 'musicVolume', label: 'Volumen de Música' },
                      { id: 'sfxVolume', label: 'Volumen de Efectos' },
                    ].map((vol) => (
                      <div key={vol.id} className="p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex justify-between mb-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">{vol.label}</p>
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

                    <div className="p-4 bg-black/20 rounded-xl border border-white/5 mt-6">
                      <p className="font-black text-xs uppercase tracking-widest text-white mb-1">Modo de Latencia</p>
                      <p className="text-[10px] text-zinc-500 mb-4">El modo ultra bajo puede causar chasquidos en conexiones lentas.</p>
                      <div className="flex flex-wrap gap-2">
                        {['ultra-low', 'normal', 'safe'].map((mode) => (
                          <button 
                            key={mode}
                            onClick={() => setAudioSettings({...audioSettings, latencyMode: mode})}
                            className={`flex-1 min-w-[80px] py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                              audioSettings.latencyMode === mode 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                          >
                            {mode === 'ultra-low' ? 'ULTRA BAJA' : mode === 'normal' ? 'NORMAL' : 'SEGURA'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CONTROLS SETTINGS */}
              {activeTab === 'controls' && (
                <motion.div 
                  key="controls"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 mb-6 gap-4">
                    <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" /> Mapeo de Entradas
                    </h2>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setControls({
                          up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
                          a: '2', b: '1', x: '5', y: '4', l: '6', r: '3', start: 'Enter', select: '+'
                        })}
                        className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-400 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
                      >
                        Restablecer
                      </button>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/5">
                        <Keyboard className="w-3.5 h-3.5" /> Teclado Activo
                      </div>
                    </div>
                  </div>

                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-8">Haz clic en un botón y presiona la tecla que quieras asignar.</p>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-4xl mx-auto">
                    {/* D-PAD */}
                    <div className="space-y-4">
                      <h3 className="text-emerald-500 font-black text-[10px] uppercase tracking-widest mb-4 text-center">Pad Direccional</h3>
                      <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                        <div />
                        <KeyBindBtn id="up" label="ARRIBA" value={controls.up} active={activeKeyBind} set={setActiveKeyBind} />
                        <div />
                        <KeyBindBtn id="left" label="IZQUIERDA" value={controls.left} active={activeKeyBind} set={setActiveKeyBind} />
                        <KeyBindBtn id="down" label="ABAJO" value={controls.down} active={activeKeyBind} set={setActiveKeyBind} />
                        <KeyBindBtn id="right" label="DERECHA" value={controls.right} active={activeKeyBind} set={setActiveKeyBind} />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                      <h3 className="text-emerald-500 font-black text-[10px] uppercase tracking-widest mb-4 text-center">Botones de Acción</h3>
                      <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                        <KeyBindBtn id="l" label="L" value={controls.l} active={activeKeyBind} set={setActiveKeyBind} />
                        <KeyBindBtn id="x" label="X" value={controls.x} active={activeKeyBind} set={setActiveKeyBind} />
                        <KeyBindBtn id="r" label="R" value={controls.r} active={activeKeyBind} set={setActiveKeyBind} />
                        <KeyBindBtn id="y" label="Y" value={controls.y} active={activeKeyBind} set={setActiveKeyBind} />
                        <div />
                        <KeyBindBtn id="a" label="A" value={controls.a} active={activeKeyBind} set={setActiveKeyBind} />
                        <div />
                        <KeyBindBtn id="b" label="B" value={controls.b} active={activeKeyBind} set={setActiveKeyBind} />
                        <div />
                      </div>
                    </div>

                    {/* System Buttons */}
                    <div className="lg:col-span-2 flex justify-center gap-3 mt-4">
                      <KeyBindBtn id="select" label="SELECT" value={controls.select} active={activeKeyBind} set={setActiveKeyBind} className="w-28" />
                      <KeyBindBtn id="start" label="START" value={controls.start} active={activeKeyBind} set={setActiveKeyBind} className="w-28" />
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-white/5">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2 mb-4">
                      <Gamepad2 className="w-5 h-5 text-emerald-500" /> Configuración del Mando
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6 leading-relaxed">Conecta un mando Bluetooth o USB. El motor detecta automáticamente los diseños estándar.</p>
                    <div className="p-5 bg-black/20 rounded-xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <Gamepad2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-black text-xs uppercase tracking-widest text-white">Auto-Detección</p>
                          <p className="text-[10px] text-zinc-500">Soporta XInput y DirectInput de forma nativa.</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">
                        Activo
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SYSTEM SETTINGS */}
              {activeTab === 'system' && (
                <motion.div 
                  key="system"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                    <Cpu className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" /> System & Emulation
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div className="p-5 bg-black/20 rounded-xl border border-white/5">
                      <h3 className="font-black text-xs uppercase tracking-widest text-white mb-2">Sincronización en la Nube</h3>
                      <p className="text-[10px] text-zinc-500 mb-4">Copia de seguridad automática de tus partidas en la nube.</p>
                      <button className="px-4 py-2.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-black text-[10px] uppercase tracking-widest w-full hover:bg-emerald-600/20 transition-colors">
                        Forzar Sincronización
                      </button>
                    </div>

                    <div className="p-5 bg-black/20 rounded-xl border border-white/5">
                      <h3 className="font-black text-xs uppercase tracking-widest text-white mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-500" /> Limpiar Caché</h3>
                      <p className="text-[10px] text-zinc-500 mb-4">Libera espacio local eliminando los recursos descargados.</p>
                      <button onClick={handleClearCatalog} className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-black text-[10px] uppercase tracking-widest w-full hover:bg-red-500/20 transition-colors">
                        PURGAR AHORA
                      </button>
                    </div>

                    <div className="p-5 bg-black/20 rounded-xl border border-white/5">
                      <h3 className="font-black text-xs uppercase tracking-widest text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Reiniciar Sistema</h3>
                      <p className="text-[10px] text-zinc-500 mb-4">Reinicia la aplicación para aplicar cambios profundos del sistema.</p>
                      <button onClick={handleReboot} className="px-4 py-2.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg font-black text-[10px] uppercase tracking-widest w-full hover:bg-yellow-500/20 transition-colors">
                        REINICIAR
                      </button>
                    </div>

                    <div className="p-5 bg-black/20 rounded-xl border border-white/5 lg:col-span-2">
                      <h3 className="font-black text-xs uppercase tracking-widest text-white mb-2 flex items-center gap-2"><User className="w-4 h-4 text-cyan-500" /> Perfil del Operador</h3>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                        <div>
                          <p className="text-[10px] text-zinc-500">Gestiona tu cuenta y consulta tu saldo actual.</p>
                          <div className="flex items-center gap-2 text-amber-500 mt-2">
                            <Coins className="w-4 h-4" />
                            <span className="text-xs font-black tracking-widest">{credits} CRÉDITOS</span>
                          </div>
                        </div>
                        <button onClick={() => navigate('/profile')} className="w-full sm:w-auto px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500/20 transition-colors">
                          Ver Perfil
                        </button>
                      </div>
                      <button onClick={logout} className="px-4 py-2.5 bg-zinc-800 text-zinc-500 border border-white/5 rounded-lg font-black text-[10px] uppercase tracking-widest w-full hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2">
                        <LogOut className="w-4 h-4" /> Desconectar
                      </button>
                    </div>

                    <div className="p-5 bg-black/20 rounded-xl border border-white/5 lg:col-span-2">
                      <h3 className="font-black text-xs uppercase tracking-widest text-white mb-2">Idioma del Sistema</h3>
                      <p className="text-[10px] text-zinc-500 mb-4">Selecciona el idioma de la interfaz y de la IA.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'es', label: 'Español' },
                          { id: 'en', label: 'English' },
                          { id: 'pt', label: 'Português' },
                          { id: 'jp', label: '日本語' }
                        ].map((lang) => (
                          <button 
                            key={lang.id}
                            onClick={() => setLanguage(lang.id)}
                            className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                              language === lang.id 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 bg-black/20 rounded-xl border border-white/5 lg:col-span-2">
                      <h3 className="font-black text-xs uppercase tracking-widest text-white mb-2">Selección de Núcleo</h3>
                      <p className="text-[10px] text-zinc-500 mb-4">Elige el núcleo de emulación predeterminado para sistemas específicos.</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg border border-white/5">
                          <span className="font-mono text-[10px] text-zinc-400">SNES</span>
                          <select className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] text-emerald-400 outline-none">
                            <option>Snes9x (Recomendado)</option>
                            <option>bsnes</option>
                          </select>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg border border-white/5">
                          <span className="font-mono text-[10px] text-zinc-400">GBA</span>
                          <select className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] text-emerald-400 outline-none">
                            <option>mGBA (Recomendado)</option>
                            <option>VBA-M</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SENTINEL SETTINGS */}
              {activeTab === 'sentinel' && (
                <motion.div 
                  key="sentinel"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-cyan-electric" /> Diagnósticos de Sentinel
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="p-5 bg-black/20 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                      <Activity className="w-8 h-8 text-cyan-electric mb-3" />
                      <h3 className="font-black text-3xl text-white mb-1">{sentinelStats.testedToday}</h3>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sectores Escaneados</p>
                    </div>

                    <div className="p-5 bg-black/20 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                      <Check className="w-8 h-8 text-emerald-500 mb-3" />
                      <h3 className="font-black text-3xl text-white mb-1">
                        {sentinelStats.testedToday > 0 ? Math.round((sentinelStats.successful / sentinelStats.testedToday) * 100) : 0}%
                      </h3>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tasa de Éxito</p>
                    </div>

                    <div className="p-5 bg-black/20 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                      <RotateCcw className="w-8 h-8 text-magenta-accent mb-3" />
                      <h3 className="font-black text-3xl text-white mb-1">{sentinelStats.repairs}</h3>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Auto-Reparaciones</p>
                    </div>

                    <div className="p-5 bg-black/20 rounded-xl border border-white/5 lg:col-span-3">
                      <h3 className="font-black text-xs uppercase tracking-widest text-white mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-electric" /> Forzar Reparación Global
                      </h3>
                      <p className="text-[10px] text-zinc-500 mb-4">
                        Restablece todos los juegos "Rotos" a "No Probados" y obliga al Motor Sentinel a reevaluarlos usando la última rotación de proxies y núcleos de respaldo.
                      </p>
                      <button 
                        onClick={handleForceRepair} 
                        disabled={isForcingRepair}
                        className={`px-4 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest w-full transition-all flex items-center justify-center gap-2 ${
                          isForcingRepair 
                            ? 'bg-cyan-electric/20 text-cyan-electric/50 cursor-wait' 
                            : 'bg-cyan-electric/10 text-cyan-electric border border-cyan-electric/20 hover:bg-cyan-electric/20'
                        }`}
                      >
                        {isForcingRepair ? 'Ejecutando Protocolo...' : 'Ejecutar Reparación Global'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STREAMER SETTINGS */}
              {activeTab === 'streamer' && (
                <motion.div 
                  key="streamer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                    <Video className="w-5 h-5 md:w-6 md:h-6 text-magenta-accent" /> Modo Streamer (Beta)
                  </h2>
                  
                  <div className="p-6 bg-magenta-accent/5 border border-magenta-accent/20 rounded-2xl mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-magenta-accent/20 flex items-center justify-center">
                        <Video className="w-6 h-6 text-magenta-accent" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm uppercase tracking-widest text-white">Optimizado para Creadores</h3>
                        <p className="text-[10px] text-zinc-400 mt-1">Activa herramientas diseñadas para compartir tu gameplay en Twitch, YouTube y TikTok.</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setStreamerSettings({...streamerSettings, enabled: !streamerSettings.enabled})}
                      className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2 ${
                        streamerSettings.enabled 
                          ? 'bg-magenta-accent text-white border-magenta-accent shadow-lg shadow-magenta-900/50' 
                          : 'bg-transparent text-magenta-accent border-magenta-accent/30 hover:bg-magenta-accent/10'
                      }`}
                    >
                      {streamerSettings.enabled ? 'MODO STREAMER ACTIVO' : 'ACTIVAR MODO STREAMER'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">Ocultar Info Privada</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Oculta emails y nombres reales en la interfaz</p>
                        </div>
                        <button 
                          onClick={() => setStreamerSettings({...streamerSettings, hidePrivateInfo: !streamerSettings.hidePrivateInfo})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${streamerSettings.hidePrivateInfo ? 'bg-magenta-accent' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${streamerSettings.hidePrivateInfo ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">Interacción de Audiencia</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Permitir que los espectadores envíen items o retos</p>
                        </div>
                        <button 
                          onClick={() => setStreamerSettings({...streamerSettings, audienceInteraction: !streamerSettings.audienceInteraction})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${streamerSettings.audienceInteraction ? 'bg-magenta-accent' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${streamerSettings.audienceInteraction ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">Overlay de Stream</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Mostrar estadísticas de juego en pantalla</p>
                        </div>
                        <button 
                          onClick={() => setStreamerSettings({...streamerSettings, showOverlay: !streamerSettings.showOverlay})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${streamerSettings.showOverlay ? 'bg-magenta-accent' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${streamerSettings.showOverlay ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white">Integración con Twitch</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Conectar cuenta para chat interactivo</p>
                        </div>
                        <button 
                          onClick={() => setStreamerSettings({...streamerSettings, twitchIntegration: !streamerSettings.twitchIntegration})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${streamerSettings.twitchIntegration ? 'bg-magenta-accent' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${streamerSettings.twitchIntegration ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* NETWORK SETTINGS */}
              {activeTab === 'network' && (
                <motion.div 
                  key="network"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                    <Globe className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" /> Red y Anonimato
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sistema de Proxies
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">Enrutar peticiones IA a través de nodos públicos</p>
                        </div>
                        <button 
                          onClick={() => setNetworkSettings({...networkSettings, useProxy: !networkSettings.useProxy})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${networkSettings.useProxy ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${networkSettings.useProxy ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="pr-4">
                          <p className="font-black text-xs uppercase tracking-widest text-white flex items-center gap-2">
                            <Fingerprint className="w-4 h-4 text-emerald-500" /> Fingerprint Aleatorio
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">Ofuscar identidad del navegador en cada petición</p>
                        </div>
                        <button 
                          onClick={() => setNetworkSettings({...networkSettings, useFingerprint: !networkSettings.useFingerprint})}
                          className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${networkSettings.useFingerprint ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-3 h-3 md:w-4 md:h-4 bg-white rounded-full absolute top-1 transition-transform ${networkSettings.useFingerprint ? 'left-6 md:left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                        <p className="font-black text-xs uppercase tracking-widest text-white mb-3">Nivel de Anonimato</p>
                        <div className="flex gap-2">
                          {[
                            { id: 'low', label: 'Bajo' },
                            { id: 'medium', label: 'Medio' },
                            { id: 'high', label: 'Máximo' }
                          ].map((level) => (
                            <button 
                              key={level.id}
                              onClick={() => setNetworkSettings({...networkSettings, anonymityLevel: level.id as any})}
                              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                networkSettings.anonymityLevel === level.id 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                              }`}
                            >
                              {level.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-3 italic">
                          {networkSettings.anonymityLevel === 'high' ? 'Rotación agresiva de proxies y headers en cada interacción.' : 
                           networkSettings.anonymityLevel === 'medium' ? 'Balance entre velocidad y privacidad.' : 
                           'Conexión directa priorizada.'}
                        </p>
                      </div>

                      <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                        <div className="flex items-center gap-3 mb-2">
                          <Activity className="w-4 h-4 text-emerald-500" />
                          <p className="font-black text-xs uppercase tracking-widest text-emerald-400">Estado de la Red</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-zinc-500 uppercase font-bold">Nodos Disponibles:</span>
                            <span className="text-emerald-500 font-mono">12 Activos</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-zinc-500 uppercase font-bold">Latencia Promedio:</span>
                            <span className="text-emerald-500 font-mono">142ms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STORAGE SETTINGS */}
              {activeTab === 'storage' && (
                <motion.div 
                  key="storage"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                    <Save className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" /> Gestión de Almacenamiento
                  </h2>
                  
                  <div className="p-6 bg-black/20 rounded-xl border border-white/5 mb-8">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Almacenamiento Total Usado</p>
                       <p className="text-emerald-400 font-mono text-lg font-black">{(storageStats.totalSize / 1024 / 1024).toFixed(2)} MB / 3072 MB</p>
                    </div>
                    <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden mb-6">
                      <div className="bg-emerald-500 h-full" style={{ width: `${(storageStats.totalSize / (3 * 1024 * 1024 * 1024)) * 100}%` }} />
                    </div>
                    
                    <button 
                      onClick={async () => {
                        if (confirm('¿ELIMINAR TODAS LAS ROMS DESCARGADAS? Esto liberará espacio pero tendrás que volver a descargarlas para jugar.')) {
                          await storage.clearAllRoms();
                          window.location.reload();
                        }
                      }}
                      className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Purgar Caché de ROMs
                    </button>
                  </div>

                  <div className="space-y-2">
                    {storageStats.games.map(game => (
                      <div key={game.gameId} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:bg-black/30 transition-colors">
                        <div>
                          <p className="text-white font-bold text-sm">{game.title}</p>
                          <p className="text-zinc-500 text-[10px] uppercase tracking-widest">
                            {(game.size / 1024 / 1024).toFixed(2)} MB • Jugado {game.playCount} veces
                          </p>
                        </div>
                        <button 
                          onClick={() => handleDeleteGame(game.gameId)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Purge Modal */}
      <AnimatePresence>
        {showPurgeModal && (
          <motion.div
            key="purge-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-rose-500">
                <AlertTriangle className="w-8 h-8" />
                <h2 className="text-xl font-black uppercase tracking-widest">¿Purgar Caché Total?</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-6">
                Esto borrará el catálogo y <strong>todas las ROMs descargadas</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPurgeModal(false)}
                  className="px-4 py-2 rounded-lg font-bold text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={executePurge}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  PURGAR AHORA
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reboot Modal */}
      <AnimatePresence>
        {showRebootModal && (
          <motion.div
            key="reboot-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-yellow-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-yellow-500">
                <Zap className="w-8 h-8" />
                <h2 className="text-xl font-black uppercase tracking-widest">¿Reiniciar Sistema?</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-6">
                Esto recargará la aplicación para aplicar cambios profundos del sistema.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRebootModal(false)}
                  className="px-4 py-2 rounded-lg font-bold text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={executeReboot}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-yellow-500 text-black hover:bg-yellow-400 transition-colors"
                >
                  REINICIAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repair Modal */}
      <AnimatePresence>
        {showRepairModal && (
          <motion.div
            key="repair-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-cyan-electric/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-cyan-electric">
                <ShieldCheck className="w-8 h-8" />
                <h2 className="text-xl font-black uppercase tracking-widest">¿Forzar Reparación Global?</h2>
              </div>
              
              {repairResult ? (
                <div className="text-emerald-400 text-sm mb-6 font-mono">
                  {repairResult}
                  <br/><br/>Reiniciando sistema...
                </div>
              ) : (
                <>
                  <p className="text-zinc-400 text-sm mb-6">
                    Esto restablecerá todos los juegos rotos a "no probado" y activará Sentinel.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowRepairModal(false)}
                      className="px-4 py-2 rounded-lg font-bold text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={executeRepair}
                      className="px-4 py-2 rounded-lg font-bold text-sm bg-cyan-electric text-black hover:bg-cyan-400 transition-colors"
                    >
                      REPARAR
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete ROM Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-rose-500">
                <Trash2 className="w-8 h-8" />
                <h2 className="text-xl font-black uppercase tracking-widest">¿Eliminar ROM?</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-6">
                Se borrará el archivo local pero el juego seguirá en el catálogo.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="px-4 py-2 rounded-lg font-bold text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={executeDeleteRom}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  ELIMINAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Helper component for key bindings
function KeyBindBtn({ id, label, value, active, set, className = "" }: any) {
  const isActive = active === id;
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{label}</span>
      <button
        onClick={() => set(isActive ? null : id)}
        className={`w-full h-10 md:h-12 rounded-xl border-2 font-mono text-[10px] md:text-sm font-bold transition-all flex items-center justify-center
          ${isActive 
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse' 
            : 'bg-zinc-900 border-white/10 text-white hover:border-zinc-500 hover:bg-zinc-700'
          }
        `}
      >
        {isActive ? 'WAIT...' : value}
      </button>
    </div>
  );
}
