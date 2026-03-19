import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Share2, Users, MessageSquare, Send, BrainCircuit, Loader2, Volume2, VolumeX, Save, X, Maximize, Minimize, MonitorPlay, Play, Pause, Coins, AlertTriangle, Menu, Video } from 'lucide-react';
import { emulator } from '../services/emulator';
import { multiplayer } from '../services/multiplayer';
import { aiCoach } from '../services/aiCoaching';
import { inputManager, RetroButton } from '../services/inputManager';
import { gameCatalog } from '../services/gameCatalog';
import { storage } from '../services/storage';
import { achievements } from '../services/achievements';
import { AudioEngine } from '../services/audioEngine';
import { MetadataNormalizationEngine } from '../services/metadataNormalization';
import GameOverlay from '../components/game/GameOverlay';
import LobbyView from '../components/game/LobbyView';
import SaveStatePanel from '../components/game/SaveStatePanel';
import VirtualController from '../components/game/VirtualController';
import CRTFilter from '../components/game/CRTFilter';
import LoadingScreen from '../components/game/LoadingScreen';
import TacticalOverlay from '../components/game/TacticalOverlay';
import CommunityTipsPanel from '../components/game/CommunityTipsPanel';
import { motion, AnimatePresence } from 'motion/react';

import { saveService } from '../services/saveService';
import { useAuth } from '../services/AuthContext';

export default function GameRoom() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [players, setPlayers] = useState<string[]>([]);
  const [messages, setMessages] = useState<{user: string, text: string}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [gameState, setGameState] = useState<'loading' | 'waiting' | 'playing' | 'paused' | 'error'>('loading');
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('Initializing Systems...');
  const [matchmakingStatus, setMatchmakingStatus] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false);
  const [isTipsPanelOpen, setIsTipsPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [bilinearEnabled, setBilinearEnabled] = useState(false);
  const [credits, setCredits] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [showClipModal, setShowClipModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userId = useRef('user-' + Math.random().toString(36).substr(2, 9));
  const mountedRef = useRef(false);

  const [pendingExit, setPendingExit] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
    
    // Load video settings
    const loadVideoSettings = async () => {
      const settings = await storage.getSetting('videoSettings');
      if (settings) {
        setCrtEnabled(settings.crtFilter && !isTouch);
        setBilinearEnabled(settings.bilinearFiltering);
      } else {
        // Default to smooth/high quality
        setCrtEnabled(false);
        setBilinearEnabled(true);
      }
    };
    loadVideoSettings();

    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (coachAdvice && voiceEnabled) {
      // Auto-speech disabled by default to prevent annoyance
      // const utterance = new SpeechSynthesisUtterance(coachAdvice);
      // utterance.rate = 1.1;
      // utterance.pitch = 1.0;
      // window.speechSynthesis.cancel();
      // window.speechSynthesis.speak(utterance);
    }
  }, [coachAdvice, voiceEnabled]);

  useEffect(() => {
    const loadCredits = async () => {
      const c = await storage.getCredits();
      setCredits(c);
    };
    loadCredits();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing') {
      interval = setInterval(async () => {
        const newTotal = await storage.addCredits(100);
        setCredits(newTotal);
      }, 5 * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!gameId || !canvasRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const loadGame = async () => {
      await gameCatalog.init();
      const gameData = gameCatalog.getGame(gameId);
      
      if (!gameData) {
        setGameState('error');
        setErrorMessage('Game not found in catalog.');
        return;
      }

      const initEmulator = async () => {
      if (!mountedRef.current) return;
      
      // Ensure previous audio is dead
      AudioEngine.stopAll();
      
      let currentCore = gameData.emulator_core;
      let retries = 0;
      const MAX_RETRIES = 2; // 3 attempts total

      let finalRomUrl = gameData.rom_url;
      if (finalRomUrl.startsWith('archive:')) {
        setLoadingStatus('Resolviendo enlace de ROM...');
        const identifier = finalRomUrl.replace('archive:', '');
        const resolvedUrl = await MetadataNormalizationEngine.resolveRomUrl(identifier, gameData.system_id);
        if (resolvedUrl) {
          finalRomUrl = resolvedUrl;
          // Update catalog with resolved URL
          gameData.rom_url = finalRomUrl;
          await gameCatalog.addGame(gameData);
        } else {
          if (!mountedRef.current) return;
          setGameState('error');
          setErrorMessage('No se pudo resolver el enlace de la ROM.');
          return;
        }
      }

      while (retries <= MAX_RETRIES) {
        if (!mountedRef.current) return;
        try {
          setLoadingStatus(`Inyectando Núcleo (${currentCore})...`);
          await emulator.initialize({
            gameId,
            core: currentCore,
            romUrl: finalRomUrl,
            canvas: canvasRef.current!,
            system: gameData.system_id
          }, (status) => {
            if (!mountedRef.current) return;
            setLoadingStatus(status);
            // Try to extract progress from status string if it contains percentage
            const match = status.match(/(\d+)%/);
            if (match) {
              setLoadingProgress(parseInt(match[1], 10));
            } else if (status.includes('Launching')) {
              setLoadingProgress(90);
            } else if (status.includes('BIOS')) {
              setLoadingStatus('Sincronizando BIOS...');
              setLoadingProgress(40);
            }
          });
          
          if (!mountedRef.current) return;
          setLoadingStatus('Estableciendo Enlace Táctico con IA...');
          setLoadingProgress(100);
          
          setTimeout(async () => {
            if (mountedRef.current) {
              setGameState('waiting');
              
              // Load Cloud Save if available
              if (user && gameId) {
                try {
                  const cloudSave = await saveService.downloadSave(user.id, gameId);
                  if (cloudSave) {
                    console.log('Cloud save found, preparing for injection...');
                    // We don't auto-load to avoid overwriting current session if user just restarted
                    // But we could notify or provide a "Restore" button
                  }
                } catch (err) {
                  console.error('Error checking cloud save:', err);
                }
              }
            }
          }, 800);

          if (gameData.compatibility_status !== 'compatible') {
            gameData.compatibility_status = 'compatible';
            await gameCatalog.addGame(gameData);
          }
          return;
        } catch (err) {
          console.error(`Failed to start emulator with core ${currentCore}:`, err);
          
          if (retries < MAX_RETRIES && mountedRef.current) {
            const altCore = getAlternativeCore(gameData.system, currentCore);
            if (altCore) {
              currentCore = altCore;
              retries++;
              setLoadingStatus(`Sector de Datos Dañado. Protocolo de recuperación ${retries}/${MAX_RETRIES}...`);
              // Wait 1.5s before hot-swap
              await new Promise(resolve => setTimeout(resolve, 1500));
              continue;
            }
          }
          
          if (mountedRef.current) {
            setGameState('error');
            setErrorMessage(`Sector de Datos Dañado. Fallo crítico tras ${MAX_RETRIES + 1} intentos.`);
            
            if (gameData.compatibility_status !== 'broken') {
              gameData.compatibility_status = 'broken';
              await gameCatalog.addGame(gameData);
            }
          }
          break;
        }
      }
    };

    const getAlternativeCore = (system: string, currentCore: string): string | null => {
      const alternatives: Record<string, string[]> = {
        'SNES': ['snes9x', 'snes9x2010', 'snes9x2005', 'snes9x_optimized'],
        'NES': ['fceumm', 'nestopia', 'quicknes', 'mesen'],
        'Genesis': ['genesis_plus_gx', 'picodrive', 'blastem'],
        'GBA': ['mgba', 'vba_next', 'gpsp'],
        'PS1': ['pcsx_rearmed', 'pcsx_rearmed_interpreter', 'duckstation', 'mednafen_psx_hw'],
        'Atari 2600': ['stella', 'stella2014'],
        'Atari 7800': ['prosystem', 'stella'],
        'N64': ['mupen64plus_next', 'parallel_n64']
      };
      const cores = alternatives[system] || alternatives[gameData.system_id] || [];
      if (!cores.length) return null;
      const currentIndex = cores.indexOf(currentCore);
      if (currentIndex !== -1 && currentIndex < cores.length - 1) {
        return cores[currentIndex + 1];
      }
      return null;
    };

    initEmulator();
    
    };

    loadGame();

    // Start Matchmaking instead of direct connect
    multiplayer.joinMatchmaking(
      gameId, 
      userId.current, 
      (roomId, opponentId, isHost) => {
        console.log(`Match found! Room: ${roomId}, Opponent: ${opponentId}, Host: ${isHost}`);
        setPlayers([opponentId]);
        setMatchmakingStatus('Opponent found! Connecting...');
      },
      (status) => {
        setMatchmakingStatus(`Matchmaking: ${status}...`);
      }
    );

    inputManager.start();
    const cleanupInput = inputManager.onInput((button: RetroButton, isPressed: boolean) => {
      if (gameStateRef.current === 'playing') {
        emulator.sendInput(button, isPressed);
        multiplayer.sendInput({ button, isPressed });
      }
    });

    multiplayer.onInput((input: { button: RetroButton, isPressed: boolean }) => {
      if (gameStateRef.current === 'playing') {
        emulator.sendInput(input.button, input.isPressed);
      }
    });

    multiplayer.onChatMessage((msg) => {
      if (msg.user === userId.current) return;
      const displayUser = `Player ${msg.user.slice(-4)}`;
      setMessages(prev => [...prev, { user: displayUser, text: msg.text }]);
    });

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      initializedRef.current = false;
      cleanupInput();
      inputManager.stop();
      emulator.stop();
      AudioEngine.stopAll();
      multiplayer.leaveMatchmaking();
      multiplayer.disconnect(); 
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [gameId]);

  // Automatic AI Coach interval removed to save tokens and prevent annoyance.
  // The coach now only activates when the user explicitly clicks the "Tactical AI" button.
  /* 
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && canvasRef.current) {
      interval = setInterval(() => {
        handleAskCoach();
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [gameState, isAnalyzing]);
  */

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        // Force landscape orientation if supported by the browser
        if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
          try {
            await (window.screen as any).orientation.lock('landscape');
          } catch (e) {
            console.warn('Orientation lock failed:', e);
          }
        }
      } else {
        if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.unlock) {
          (window.screen as any).orientation.unlock();
        }
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !gameId) return;

    const msg = { user: userId.current, text: newMessage };
    setMessages(prev => [...prev, { user: 'You', text: newMessage }]);
    multiplayer.sendChatMessage(gameId, msg);
    achievements.unlock('social_link');
    setNewMessage('');
  };

  const startGame = () => {
    setGameState('playing');
    if (gameId) {
      storage.addRecentGame(gameId);
      storage.incrementPlayCount(gameId);
    }
    achievements.unlock('first_match');
  };
  
  const handlePause = async () => {
    await emulator.pause();
    setGameState('paused');
  };

  const handleResume = async () => {
    await emulator.resume();
    setGameState('playing');
  };

  const handleExit = async () => {
    if (!user && !pendingExit) {
      await emulator.pause();
      setGameState('paused');
      setPendingExit(true);
      setShowGuestModal(true);
      return;
    }
    await emulator.stop();
    navigate('/');
  };

  const handleRecordClip = () => {
    if (!user) {
      setShowGuestModal(true);
      return;
    }
    setIsRecordingClip(true);
    setTimeout(() => {
      setIsRecordingClip(false);
      setShowClipModal(true);
    }, 2000); // Simulate processing
  };

  const handleToggleSavePanel = () => {
    if (!user) {
      setShowGuestModal(true);
      return;
    }
    setIsSavePanelOpen(!isSavePanelOpen);
  };

  const handleAskCoach = async () => {
    if (!canvasRef.current || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const advice = await aiCoach.analyzeFrame(canvasRef.current);
      setCoachAdvice(advice);
      achievements.unlock('ai_tactician');
      
      const newTotal = await storage.addCredits(50);
      setCredits(newTotal);

      if (newTotal >= 1000) {
        achievements.unlock('capitalist');
      }

      setTimeout(() => setCoachAdvice(null), 10000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInvite = () => {
    const url = new URL(window.location.origin);
    url.pathname = `/play/${gameId}`;
    url.searchParams.set('room', gameId || '');
    navigator.clipboard.writeText(url.toString());
    alert('Invite link copied to clipboard!');
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-carbon flex flex-col overflow-hidden z-50">
      {/* Loading Screen */}
      {gameState === 'loading' && (
        <LoadingScreen 
          status={loadingStatus} 
          progress={loadingProgress} 
          coverUrl={gameCatalog.getGame(gameId || '')?.cover_url}
          title={gameCatalog.getGame(gameId || '')?.title}
        />
      )}

      {/* Full Surface Canvas */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 
          ${crtEnabled && !isTouchDevice ? 'scale-105' : 'scale-100'} 
          ${(gameState === 'playing' || gameState === 'paused') ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600} 
          className={`w-full h-full object-contain max-w-[100vw] max-h-[100dvh] ${crtEnabled ? 'contrast-125 saturate-150 brightness-110' : ''}`}
          style={{ 
            imageRendering: (crtEnabled || bilinearEnabled) ? 'auto' : 'pixelated',
            filter: crtEnabled ? 'blur(0.5px)' : 'none'
          }}
        />
        <CRTFilter enabled={crtEnabled} />
      </div>

      {/* Tactical AI Overlay */}
      <TacticalOverlay advice={coachAdvice || ''} isVisible={!!coachAdvice} />

      {/* Floating Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center gap-2 md:gap-4 bg-carbon/60 backdrop-blur-xl border border-white/10 px-3 py-2 md:px-5 md:py-2.5 rounded-2xl shadow-2xl glass">
            <button onClick={handleExit} className="text-zinc-500 hover:text-rose-500 transition-colors">
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="w-px h-4 md:h-5 bg-white/10"></div>
            <h2 className="font-black text-white text-xs md:text-sm italic uppercase tracking-tighter hidden md:block">
              Dominion <span className="text-cyan-electric">OS</span>
            </h2>
            <span className="px-2 py-0.5 rounded-lg bg-cyan-electric/10 text-cyan-electric text-[10px] font-black border border-cyan-electric/20 uppercase">
              {players.length + 1} ACTIVOS
            </span>
          </div>
          
          <div className="pointer-events-auto bg-amber-500/10 backdrop-blur-md border border-amber-500/20 px-3 py-1 rounded-xl flex items-center gap-2 w-fit">
            <Coins className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{credits}</span>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="pointer-events-auto hidden lg:flex items-center gap-1 md:gap-2 bg-carbon/60 backdrop-blur-xl border border-white/10 p-1.5 md:p-2 rounded-2xl shadow-2xl glass">
          <button 
            onClick={gameState === 'playing' ? handlePause : handleResume}
            className={`p-2 rounded-xl transition-all ${gameState === 'paused' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
          >
            {gameState === 'playing' ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button 
            onClick={() => setCrtEnabled(!crtEnabled)}
            className={`p-2 rounded-xl transition-all ${crtEnabled ? 'bg-cyan-electric/20 text-cyan-electric' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
          >
            <MonitorPlay className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-all hidden lg:block"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-xl transition-all ${voiceEnabled ? 'bg-magenta-accent/20 text-magenta-accent' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
            title="Voice Chat"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button 
            onClick={handleRecordClip}
            className={`p-2 rounded-xl transition-all ${isRecordingClip ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-purple-500/20 text-zinc-400 hover:text-purple-400'}`}
            title="Grabar Clip (30s)"
            disabled={isRecordingClip}
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Mobile Controls */}
        <div className="pointer-events-auto lg:hidden flex items-center gap-2">
            <button 
              onClick={toggleFullscreen}
              className="p-3 rounded-xl bg-carbon/60 backdrop-blur-md border border-white/10 text-white shadow-2xl active:bg-white/10 transition-all"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-3 rounded-xl backdrop-blur-md border shadow-2xl transition-all ${isMobileMenuOpen ? 'bg-cyan-electric text-black border-cyan-electric' : 'bg-carbon/60 text-white border-white/10'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay (Bottom Sheet Style) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
             initial={{ opacity: 0, y: '100%' }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: '100%' }}
             className="fixed inset-0 z-[60] bg-black/95 flex flex-col lg:hidden"
          >
             <div className="flex items-center justify-between p-6 border-b border-white/10">
               <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                 <Menu className="w-6 h-6 text-cyan-electric" />
                 MENÚ TÁCTICO
               </h2>
               <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-full">
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Primary Actions */}
                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => {
                        if (gameState === 'playing') handlePause();
                        else handleResume();
                        setIsMobileMenuOpen(false);
                     }}
                     className={`p-4 rounded-xl flex flex-col items-center gap-2 border transition-all ${
                        gameState === 'paused' 
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' 
                          : 'bg-zinc-900 border-white/10 text-zinc-300'
                     }`}
                   >
                     {gameState === 'playing' ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                     <span className="text-xs font-black uppercase tracking-widest">
                        {gameState === 'playing' ? 'PAUSAR JUEGO' : 'REANUDAR'}
                     </span>
                   </button>

                   <button 
                     onClick={() => { handleAskCoach(); setIsMobileMenuOpen(false); }}
                     disabled={isAnalyzing}
                     className="p-4 rounded-xl flex flex-col items-center gap-2 bg-cyan-electric/10 border border-cyan-electric/50 text-cyan-electric"
                   >
                     {isAnalyzing ? <Loader2 className="w-8 h-8 animate-spin" /> : <BrainCircuit className="w-8 h-8" />}
                     <span className="text-xs font-black uppercase tracking-widest">ENTRENADOR IA</span>
                   </button>

                   <button 
                     onClick={() => { handleRecordClip(); setIsMobileMenuOpen(false); }}
                     disabled={isRecordingClip}
                     className={`p-4 rounded-xl flex flex-col items-center gap-2 border col-span-2 transition-all ${
                       isRecordingClip 
                         ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse' 
                         : 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                     }`}
                   >
                     <Video className="w-8 h-8" />
                     <span className="text-xs font-black uppercase tracking-widest">
                       {isRecordingClip ? 'GRABANDO...' : 'GRABAR CLIP (30S)'}
                     </span>
                   </button>
                </div>

                {/* System Toggles */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Ajustes de Sistema</h3>
                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 divide-y divide-white/5">
                    
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <MonitorPlay className="w-5 h-5 text-zinc-400" />
                        <span className="font-bold uppercase text-sm">Filtro CRT</span>
                      </div>
                      <button 
                        onClick={() => setCrtEnabled(!crtEnabled)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          crtEnabled ? 'bg-cyan-electric text-black' : 'bg-white/10 text-zinc-500'
                        }`}
                      >
                        {crtEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        {voiceEnabled ? <Volume2 className="w-5 h-5 text-magenta-accent" /> : <VolumeX className="w-5 h-5 text-zinc-400" />}
                        <span className="font-bold uppercase text-sm">Comunicaciones de Voz</span>
                      </div>
                      <button 
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          voiceEnabled ? 'bg-magenta-accent text-white' : 'bg-white/10 text-zinc-500'
                        }`}
                      >
                        {voiceEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        {isFullscreen ? <Minimize className="w-5 h-5 text-zinc-400" /> : <Maximize className="w-5 h-5 text-zinc-400" />}
                        <span className="font-bold uppercase text-sm">Pantalla Completa</span>
                      </div>
                      <button 
                        onClick={toggleFullscreen}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/10 text-zinc-300 hover:bg-white/20"
                      >
                        TOGGLE
                      </button>
                    </div>

                  </div>
                </div>

                {/* Tools */}
                <div className="space-y-3">
                   <button 
                      onClick={() => { setIsSavePanelOpen(true); setIsMobileMenuOpen(false); }}
                      className="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4 text-white hover:bg-white/10 transition-all"
                   >
                      <Save className="w-5 h-5 text-amber-500" />
                      <span className="font-bold uppercase text-sm">Guardar / Cargar Partida</span>
                   </button>
                   
                   <button 
                      onClick={() => { setIsChatOpen(true); setIsMobileMenuOpen(false); }}
                      className="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4 text-white hover:bg-white/10 transition-all"
                   >
                      <MessageSquare className="w-5 h-5 text-emerald-500" />
                      <span className="font-bold uppercase text-sm">Chat Multijugador</span>
                   </button>

                   <button 
                      onClick={handleExit}
                      className="w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4 text-rose-500 hover:bg-rose-500/20 transition-all mt-4"
                   >
                      <X className="w-5 h-5" />
                      <span className="font-bold uppercase text-sm">Salir del Juego</span>
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Bar (Desktop Only) */}
      <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-4 z-30 pointer-events-none bottom-8">
        <div className="pointer-events-auto flex items-center gap-2 md:gap-3 bg-carbon/60 backdrop-blur-xl border border-white/10 p-2 md:p-3 rounded-3xl shadow-2xl glass origin-top">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAskCoach}
            disabled={isAnalyzing || gameState !== 'playing'}
            className={`
              flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 md:py-4 rounded-2xl font-black italic uppercase tracking-tighter transition-all
              ${isAnalyzing 
                ? 'bg-cyan-electric/20 text-cyan-electric/50 cursor-wait' 
                : 'bg-cyan-electric text-black neon-glow-cyan'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 md:w-6 md:h-6 animate-spin" /> : <BrainCircuit className="w-4 h-4 md:w-6 md:h-6" />}
            <span className="text-[10px] md:text-base">{isAnalyzing ? 'Analizando...' : 'IA Táctica'}</span>
          </motion.button>

          <div className="w-px h-6 md:h-10 bg-white/10 mx-1 md:mx-2"></div>

          <button 
            onClick={() => setIsSavePanelOpen(true)}
            className="p-2 md:p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-transparent hover:border-white/10"
          >
            <Save className="w-4 h-4 md:w-6 md:h-6" />
          </button>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2 md:p-4 rounded-2xl transition-all border ${
              isChatOpen ? 'bg-cyan-electric/10 text-cyan-electric border-cyan-electric/20' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-transparent hover:border-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4 md:w-6 md:h-6" />
          </button>

          <button 
            onClick={() => setIsTipsPanelOpen(!isTipsPanelOpen)}
            className={`p-2 md:p-4 rounded-2xl transition-all border ${
              isTipsPanelOpen ? 'bg-magenta-accent/10 text-magenta-accent border-magenta-accent/20' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-transparent hover:border-white/10'
            }`}
            title="Intel DB (Tips & Cheats)"
          >
            <Users className="w-4 h-4 md:w-6 md:h-6" />
          </button>
        </div>
      </div>

      {/* Virtual Controller */}
      <VirtualController isVisible={isTouchDevice && gameState === 'playing'} />

      {/* Overlays */}
      <CommunityTipsPanel 
        isOpen={isTipsPanelOpen} 
        onClose={() => setIsTipsPanelOpen(false)} 
        gameId={gameId || 'Unknown'} 
      />

      {gameState === 'waiting' && (
        <LobbyView 
          gameId={gameId || 'Unknown'} 
          players={players}
          onStart={startGame}
          onInvite={handleInvite}
          status={matchmakingStatus || errorMessage}
        />
      )}

      {gameState === 'paused' && (
        <GameOverlay 
          isPaused={true}
          onPause={handlePause}
          onResume={handleResume}
          onExit={handleExit}
          onOpenSavePanel={() => setIsSavePanelOpen(true)}
        />
      )}

      {gameState === 'error' && (
        <div className="absolute inset-0 bg-carbon/95 z-[110] flex items-center justify-center crt-filter">
          <div className="bg-zinc-900 border border-rose-500/30 p-12 rounded-3xl max-w-md text-center glass">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-white mb-4 uppercase italic tracking-tighter">Fallo del Sistema</h2>
            <p className="text-zinc-500 mb-8 font-medium">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (gameId) {
                    storage.deleteCachedRom(gameId).then(() => {
                      window.location.reload();
                    });
                  }
                }}
                className="w-full bg-cyan-electric/10 hover:bg-cyan-electric/20 text-cyan-electric border border-cyan-electric/30 py-4 rounded-xl font-black uppercase tracking-widest transition-all"
              >
                Reparar Enlace (Limpieza Forzada)
              </button>
              <button 
                onClick={handleExit}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all"
              >
                Volver a la Base
              </button>
            </div>
          </div>
        </div>
      )}

      <SaveStatePanel 
        isOpen={isSavePanelOpen} 
        onClose={() => setIsSavePanelOpen(false)} 
      />

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            className="absolute top-0 right-0 bottom-0 w-96 bg-carbon/80 backdrop-blur-2xl border-l border-white/10 z-[60] flex flex-col shadow-2xl glass"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-black text-white flex items-center gap-3 text-sm uppercase tracking-widest italic">
                <MessageSquare className="w-5 h-5 text-cyan-electric" />
                Enlace de Comunicaciones
              </h3>
              <button onClick={() => setIsChatOpen(false)} className="p-2 text-zinc-500 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{m.user}</span>
                  <p className="text-sm text-zinc-300 bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5 italic">
                    {m.text}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-6 border-t border-white/10 bg-black/20">
              <div className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Transmitir mensaje..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-14 py-4 text-sm text-white focus:outline-none focus:border-cyan-electric/50 transition-all"
                />
                <button 
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-cyan-electric hover:bg-cyan-electric/10 rounded-xl transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clip Saved Modal */}
      <AnimatePresence>
        {showClipModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-black italic uppercase tracking-tight text-white mb-2">Clip Guardado</h3>
              <p className="text-zinc-400 text-sm mb-6">Tus últimos 30 segundos han sido guardados en tu perfil. ¡Compártelo para ganar 50 CR!</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { alert('Compartiendo en TikTok...'); setShowClipModal(false); }}
                  className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Compartir en TikTok
                </button>
                <button 
                  onClick={() => setShowClipModal(false)}
                  className="w-full py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest Upsell Modal */}
      <AnimatePresence>
        {showGuestModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mb-2 relative z-10">¡Únete a Retroverse!</h3>
              <p className="text-zinc-400 text-sm mb-6 relative z-10">
                Estás jugando como invitado. Regístrate gratis para guardar tu progreso, grabar clips virales, jugar torneos y ganar <strong className="text-emerald-400">500 CR</strong> de bienvenida.
              </p>
              <div className="flex flex-col gap-3 relative z-10">
                <button 
                  onClick={() => { navigate('/auth'); setShowGuestModal(false); }}
                  className="w-full py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  Crear Cuenta Gratis
                </button>
                <button 
                  onClick={() => {
                    setShowGuestModal(false);
                    if (pendingExit) {
                      handleExit();
                    }
                  }}
                  className="w-full py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                >
                  {pendingExit ? 'Salir sin guardar' : 'Seguir como Invitado'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
