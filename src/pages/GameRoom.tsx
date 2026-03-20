import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Share2, Users, MessageSquare, Send, Loader2, Volume2, VolumeX, Save, X, Maximize, Minimize, MonitorPlay, Play, Pause, Coins, AlertTriangle, Menu, Video, Bot, Cloud, Zap, Target, Shield, Cpu } from 'lucide-react';
import { emulator } from '../services/emulator';
import { multiplayer } from '../services/multiplayer';
import { inputManager, RetroButton } from '../services/inputManager';
import { gameCatalog } from '../services/gameCatalog';
import { storage } from '../services/storage';
import { achievements } from '../services/achievements';
import { economy } from '../services/economy';
import { useEconomy } from '../hooks/useEconomy';
import { AudioEngine } from '../services/audioEngine';
import { MetadataNormalizationEngine } from '../services/metadataNormalization';
import { haptics } from '../services/haptics';
import GameOverlay from '../components/game/GameOverlay';
import LobbyView from '../components/game/LobbyView';
import SaveStatePanel from '../components/game/SaveStatePanel';
import VirtualController from '../components/game/VirtualController';
import CRTFilter from '../components/game/CRTFilter';
import LoadingScreen from '../components/game/LoadingScreen';
import CommunityTipsPanel from '../components/game/CommunityTipsPanel';
import QuickChatWheel from '../components/game/QuickChatWheel';
import TacticalOverlay from '../components/game/TacticalOverlay';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

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
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false);
  const [isTipsPanelOpen, setIsTipsPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [bilinearEnabled, setBilinearEnabled] = useState(false);
  const { balance } = useEconomy();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [showClipModal, setShowClipModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showHypeNotification, setShowHypeNotification] = useState(false);
  const [isHost, setIsHost] = useState(true);
  const [showCloudSaveToast, setShowCloudSaveToast] = useState(false);
  const [isOpponentDisconnected, setIsOpponentDisconnected] = useState(false);
  const [tacticalAdvice, setTacticalAdvice] = useState('');
  const [isTacticalLoading, setIsTacticalLoading] = useState(false);
  const [isTacticalVisible, setIsTacticalVisible] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userId = useRef('user-' + Math.random().toString(36).substr(2, 9));
  const mountedRef = useRef(false);

  const [pendingExit, setPendingExit] = useState(false);

  // Simulate AI Hype Detection
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const hypeInterval = setInterval(() => {
      // 10% chance every 30 seconds to detect a "hype moment"
      if (Math.random() < 0.1) {
        setShowHypeNotification(true);
        AudioEngine.playSelectSound();
        haptics.success();
        
        setTimeout(() => {
          setShowHypeNotification(false);
        }, 4000);
      }
    }, 30000);
    
    return () => clearInterval(hypeInterval);
  }, [gameState]);

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
    if (voiceEnabled) {
      // Voice chat logic would go here
    }
  }, [voiceEnabled]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing') {
      interval = setInterval(async () => {
        await economy.addCoins(100, 'Playtime Reward');
        
        const currentPlaytime = (await storage.getSetting('total_playtime_minutes')) || 0;
        const newPlaytime = currentPlaytime + 5;
        await storage.saveSetting('total_playtime_minutes', newPlaytime);
        
        if (newPlaytime >= 600) { // 10 hours = 600 minutes
          achievements.unlock('arcade_master');
        }
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
                    setShowCloudSaveToast(true);
                    setTimeout(() => setShowCloudSaveToast(false), 6000);
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
      (roomId, opponentId, isHostValue) => {
        console.log(`Match found! Room: ${roomId}, Opponent: ${opponentId}, Host: ${isHostValue}`);
        setPlayers([opponentId]);
        setMatchmakingStatus('Opponent found! Connecting...');
        setIsHost(isHostValue);
      },
      (status) => {
        setMatchmakingStatus(`Matchmaking: ${status}...`);
      }
    );

    inputManager.start();
    const cleanupInput = inputManager.onInput((button: RetroButton, isPressed: boolean) => {
      if (gameStateRef.current === 'playing') {
        const playerIndex = isHost ? 0 : 1;
        emulator.sendInput(button, isPressed, playerIndex);
        multiplayer.sendInput({ button, isPressed, playerIndex });
      }
    });

    multiplayer.onInput((input: { button: RetroButton, isPressed: boolean, playerIndex: number }) => {
      if (gameStateRef.current === 'playing') {
        const remotePlayerIndex = isHost ? 1 : 0;
        emulator.sendInput(input.button, input.isPressed, remotePlayerIndex);
      }
    });

    multiplayer.onChatMessage((msg) => {
      if (msg.user === userId.current) return;
      const displayUser = `Player ${msg.user.slice(-4)}`;
      setMessages(prev => [...prev, { user: displayUser, text: msg.text }]);
    });

    multiplayer.onDisconnect(() => {
      console.log('Opponent disconnected');
      setIsOpponentDisconnected(true);
      setTimeout(() => setIsOpponentDisconnected(false), 5000);
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

  const requestTacticalAdvice = async () => {
    if (isTacticalLoading || gameState !== 'playing') return;
    
    setIsTacticalLoading(true);
    haptics.impact();
    AudioEngine.playSelectSound();

    try {
      const screenshot = emulator.captureScreenshot();
      if (!screenshot) throw new Error('No screenshot captured');

      const base64Data = screenshot.split(',')[1];
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Eres una IA táctica de combate. Analiza esta captura de pantalla de un videojuego retro y da un consejo estratégico corto (máximo 15 palabras) para el jugador. Sé directo, técnico y un poco futurista. Responde en español." },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }
        ]
      });

      const advice = response.text || "ANÁLISIS FALLIDO. REINTENTAR ENLACE.";
      setTacticalAdvice(advice);
      setIsTacticalVisible(true);
      
      // Auto-hide after 8 seconds
      setTimeout(() => setIsTacticalVisible(false), 8000);
    } catch (error) {
      console.error('Tactical AI Error:', error);
      setTacticalAdvice("ERROR DE ENLACE NEURONAL. INTERFERENCIA DETECTADA.");
      setIsTacticalVisible(true);
      setTimeout(() => setIsTacticalVisible(false), 5000);
    } finally {
      setIsTacticalLoading(false);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !gameId) return;
    handleSendText(newMessage);
    setNewMessage('');
  };

  const handleSendText = (text: string) => {
    if (!text.trim() || !gameId) return;
    const msg = { user: userId.current, text };
    setMessages(prev => [...prev, { user: 'You', text }]);
    multiplayer.sendChatMessage(gameId, msg);
    achievements.unlock('social_link');
    haptics.light();
  };

  const quickChatOptions = [
    "¡Buena partida!",
    "¡GG WP!",
    "¿Revancha?",
    "¡Qué suerte!",
    "¡Impresionante!",
    "Necesito ayuda...",
    "¡A por ellos!",
    "¡LOL!"
  ];

  const startGame = async () => {
    setGameState('playing');
    if (gameId) {
      storage.addRecentGame(gameId);
      storage.incrementPlayCount(gameId);
      
      const recentGames = await storage.getRecentGames();
      if (recentGames.length >= 10) {
        achievements.unlock('arcade_master');
      }
    }
    achievements.unlock('first_match');
    
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
      achievements.unlock('night_owl');
    }
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

  const handleToggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled) {
      haptics.success();
      setIsVoiceActive(true);
      setTimeout(() => setIsVoiceActive(false), 2000); // Simulate initial activity
    } else {
      haptics.light();
      setIsVoiceActive(false);
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

      {/* Quick Chat Wheel */}
      <QuickChatWheel
        isOpen={showQuickChat}
        onClose={() => setShowQuickChat(false)}
        onSelect={handleSendText}
        options={quickChatOptions}
      />

      {/* Voice Activity Overlay */}
      <AnimatePresence>
        {voiceEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-black/80 border border-cyan-electric/30 rounded-full backdrop-blur-md"
          >
            <div className="flex gap-1 items-center h-4">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: isVoiceActive ? [4, 16, 4] : 4,
                    opacity: isVoiceActive ? 1 : 0.3
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.5, 
                    delay: i * 0.1 
                  }}
                  className="w-1 bg-cyan-electric rounded-full"
                />
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-electric">Voz Activa</span>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Floating Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center gap-2 md:gap-4 bg-carbon/60 backdrop-blur-xl border border-white/10 px-3 py-2 md:px-5 md:py-2.5 rounded-2xl shadow-2xl glass">
            <button onClick={handleExit} className="text-zinc-500 hover:text-rose-500 transition-colors">
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="w-px h-4 md:h-5 bg-white/10"></div>
            <h2 className="font-black text-white text-xs md:text-sm italic uppercase tracking-tighter hidden md:block">
              Retroverse
            </h2>
            <span className="px-2 py-0.5 rounded-lg bg-cyan-electric/10 text-cyan-electric text-[10px] font-black border border-cyan-electric/20 uppercase">
              {players.length + 1} ACTIVOS
            </span>
          </div>
          
          <div className="pointer-events-auto bg-amber-500/10 backdrop-blur-md border border-amber-500/20 px-3 py-1 rounded-xl flex items-center gap-2 w-fit">
            <Coins className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{balance}</span>
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
            onClick={() => {
              achievements.unlock('ai_tactician');
              alert('AI Coach is analyzing your gameplay... (Simulation)');
            }}
            className="p-2 rounded-xl hover:bg-cyan-electric/20 text-zinc-400 hover:text-cyan-electric transition-all"
            title="Tactical AI"
          >
            <Bot className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={handleToggleVoice}
            className={`p-2 rounded-xl transition-all ${voiceEnabled ? 'bg-magenta-accent/20 text-magenta-accent' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
            title="Voice Chat"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`https://retroverse.app/play/${gameId}?room=xyz123`);
              alert('¡Enlace de la sala copiado al portapapeles!');
            }}
            className="p-2 rounded-xl hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-all"
            title="Compartir Sala"
          >
            <Share2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={handleRecordClip}
            className={`p-2 rounded-xl transition-all ${isRecordingClip ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-purple-500/20 text-zinc-400 hover:text-purple-400'}`}
            title="Grabar Clip (30s)"
            disabled={isRecordingClip}
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={() => alert('¡Reporte enviado!')}
            className="p-2 rounded-xl hover:bg-amber-500/20 text-zinc-400 hover:text-amber-500 transition-all"
            title="Reportar Problema"
          >
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
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
                     onClick={() => { setShowQuickChat(true); setIsMobileMenuOpen(false); }}
                     className="p-4 rounded-xl flex flex-col items-center gap-2 bg-white/5 border border-white/10 text-zinc-300"
                   >
                     <MessageSquare className="w-8 h-8 text-cyan-electric" />
                     <span className="text-xs font-black uppercase tracking-widest text-center">QUICK CHAT</span>
                   </button>



                   <button 
                     onClick={() => { handleRecordClip(); setIsMobileMenuOpen(false); }}
                     disabled={isRecordingClip}
                     className={`p-4 rounded-xl flex flex-col items-center gap-2 border transition-all ${
                       isRecordingClip 
                         ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse' 
                         : 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                     }`}
                   >
                     <Video className="w-8 h-8" />
                     <span className="text-xs font-black uppercase tracking-widest text-center">
                       {isRecordingClip ? 'GRABANDO...' : 'GRABAR CLIP'}
                     </span>
                   </button>

                   <button 
                     onClick={() => { 
                       navigator.clipboard.writeText(`https://retroverse.app/play/${gameId}?room=xyz123`);
                       alert('¡Enlace copiado!');
                       setIsMobileMenuOpen(false); 
                     }}
                     className="p-4 rounded-xl flex flex-col items-center gap-2 bg-emerald-500/10 border border-emerald-500/50 text-emerald-500"
                   >
                     <Share2 className="w-8 h-8" />
                     <span className="text-xs font-black uppercase tracking-widest text-center">COMPARTIR</span>
                   </button>
                   
                   <button 
                     onClick={() => { 
                       achievements.unlock('ai_tactician');
                       alert('AI Coach is analyzing your gameplay... (Simulation)');
                       setIsMobileMenuOpen(false); 
                     }}
                     className="p-4 rounded-xl flex flex-col items-center gap-2 bg-cyan-electric/10 border border-cyan-electric/50 text-cyan-electric col-span-2"
                   >
                     <Bot className="w-8 h-8" />
                     <span className="text-xs font-black uppercase tracking-widest text-center">TACTICAL AI COACH</span>
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
                        onClick={handleToggleVoice}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          voiceEnabled ? 'bg-magenta-accent text-white' : 'bg-white/10 text-zinc-500'
                        }`}
                      >
                        {voiceEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <span className="font-bold uppercase text-sm text-amber-500">Reportar Problema</span>
                      </div>
                      <button 
                        onClick={() => { alert('¡Reporte enviado!'); setIsMobileMenuOpen(false); }}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                      >
                        ENVIAR
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

      {/* AI Tactical Link Button */}
      {gameState === 'playing' && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={requestTacticalAdvice}
          disabled={isTacticalLoading}
          className={`fixed top-6 left-6 z-50 p-3 rounded-xl border backdrop-blur-md transition-all flex items-center gap-3 group
            ${isTacticalLoading 
              ? 'bg-cyan-electric/20 border-cyan-electric/30 cursor-wait' 
              : 'bg-black/40 border-white/10 hover:border-cyan-electric/50 hover:bg-black/60 active:scale-95'
            }`}
        >
          <div className={`relative ${isTacticalLoading ? 'animate-spin' : ''}`}>
            <Cpu className={`w-5 h-5 ${isTacticalLoading ? 'text-cyan-electric' : 'text-zinc-400 group-hover:text-cyan-electric'}`} />
            {isTacticalLoading && (
              <div className="absolute inset-0 bg-cyan-electric blur-sm opacity-50 animate-pulse" />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Tactical Link</span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter leading-none">
              {isTacticalLoading ? 'Analyzing...' : 'Ready for Sync'}
            </span>
          </div>
        </motion.button>
      )}

      <AnimatePresence>
        {showHypeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-purple-600/90 via-fuchsia-500/90 to-purple-600/90 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.5)] flex items-center gap-3">
              <Video className="w-5 h-5 text-white animate-pulse" />
              <span className="text-white font-black italic uppercase tracking-widest text-sm md:text-base drop-shadow-md">
                ¡Momento Épico Detectado!
              </span>
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cloud Save Notification */}
      <AnimatePresence>
        {showCloudSaveToast && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-24 right-6 z-[100] pointer-events-none"
          >
            <div className="bg-cyan-electric/90 backdrop-blur-md text-black px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl border border-white/20 flex items-center gap-4">
              <Cloud className="w-6 h-6 animate-pulse" />
              <div>
                <p>Nube Sincronizada</p>
                <p className="text-[8px] opacity-60">Se encontró un punto de control</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Opponent Disconnected Notification */}
      <AnimatePresence>
        {isOpponentDisconnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none p-6"
          >
            <div className="bg-rose-500/90 backdrop-blur-xl text-white px-8 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] shadow-[0_0_50px_rgba(244,63,94,0.4)] border border-white/20 flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="w-12 h-12 animate-pulse" />
              <p>ENLACE TÁCTICO PERDIDO</p>
              <p className="text-[10px] opacity-70 tracking-widest">El oponente se ha desconectado</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TacticalOverlay 
        advice={tacticalAdvice} 
        isVisible={isTacticalVisible} 
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
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                  <MessageSquare className="w-12 h-12 mb-4" />
                  <p className="text-xs font-mono uppercase tracking-widest">Sin transmisiones activas</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col gap-2 ${m.user === 'You' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{m.user}</span>
                  <p className={`text-sm p-4 rounded-2xl border italic max-w-[80%] ${
                    m.user === 'You' 
                      ? 'bg-cyan-electric/10 border-cyan-electric/20 text-cyan-electric rounded-tr-none' 
                      : 'bg-white/5 border-white/5 text-zinc-300 rounded-tl-none'
                  }`}>
                    {m.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-6 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {quickChatOptions.slice(0, 4).map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendText(opt)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  {opt}
                </button>
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
