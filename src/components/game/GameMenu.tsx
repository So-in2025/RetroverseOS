import React from 'react';
import { Pause, Play, MonitorPlay, Maximize, Minimize, Bot, Volume2, VolumeX, Share2, Video, X, Coins, Wifi, WifiOff } from 'lucide-react';
import { NetplayStatus } from '../../services/multiplayer';

interface GameMenuProps {
  gameState: 'loading' | 'waiting' | 'playing' | 'paused' | 'error';
  crtEnabled: boolean;
  isFullscreen: boolean;
  voiceEnabled: boolean;
  isRecordingClip: boolean;
  netplayStatus?: NetplayStatus;
  netplayLatency?: number;
  onExit: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleCrt: () => void;
  onToggleFullscreen: () => void;
  onToggleVoice: () => void;
  onRecordClip: () => void;
  onTacticalAdvice: () => void;
  onShare: () => void;
  onToggleUi: () => void;
}

export default function GameMenu({
  gameState, crtEnabled, isFullscreen, voiceEnabled, isRecordingClip, netplayStatus, netplayLatency,
  onExit, onPause, onResume, onToggleCrt, onToggleFullscreen, onToggleVoice, onRecordClip, onTacticalAdvice,  onShare, onToggleUi
}: GameMenuProps) {
  
  const getLatencyColor = (ms: number) => {
    if (ms < 50) return 'text-emerald-400';
    if (ms < 100) return 'text-amber-400';
    return 'text-rose-500';
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-30 pointer-events-none">
      <div className="flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center gap-2 md:gap-4 bg-carbon/60 backdrop-blur-xl border border-white/10 px-3 py-2 md:px-5 md:py-2.5 rounded-2xl shadow-2xl glass">
          <button onClick={onExit} className="text-zinc-500 hover:text-rose-500 transition-colors">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div className="w-px h-4 md:h-5 bg-white/10"></div>
          <h2 className="font-black text-white text-xs md:text-sm italic uppercase tracking-tighter hidden md:block">
            Retroverse
          </h2>
          
          {/* Netplay Status Indicator */}
          {netplayStatus && netplayStatus !== 'disconnected' && (
            <>
              <div className="w-px h-4 md:h-5 bg-white/10 hidden md:block"></div>
              <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                {netplayStatus === 'connected' ? (
                  <Wifi className={`w-3 h-3 md:w-4 md:h-4 ${getLatencyColor(netplayLatency || 0)}`} />
                ) : (
                  <WifiOff className="w-3 h-3 md:w-4 md:h-4 text-zinc-500 animate-pulse" />
                )}
                <span className="text-[10px] md:text-xs font-mono font-bold text-zinc-300">
                  {netplayStatus === 'connected' ? `${netplayLatency}ms` : netplayStatus.toUpperCase()}
                </span>
              </div>
            </>
          )}
        </div>
        
        <button 
          onClick={onToggleUi}
          className="pointer-events-auto mt-2 bg-zinc-500/20 hover:bg-zinc-500/40 backdrop-blur-md border border-zinc-500/30 px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-zinc-500/10"
        >
          <X className="w-4 h-4 text-zinc-400" />
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ocultar UI</span>
        </button>
      </div>

      <div className="pointer-events-auto flex items-center gap-1 md:gap-2 bg-carbon/60 backdrop-blur-xl border border-white/10 p-1.5 md:p-2 rounded-2xl shadow-2xl glass">
        <button 
          onClick={gameState === 'playing' ? onPause : onResume}
          className={`p-2 rounded-xl transition-all ${gameState === 'paused' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
        >
          {gameState === 'playing' ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
        <button 
          onClick={onToggleCrt}
          className={`p-2 rounded-xl transition-all ${crtEnabled ? 'bg-cyan-electric/20 text-cyan-electric' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
        >
          <MonitorPlay className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button 
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-all hidden lg:block"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
        <button 
          onClick={onTacticalAdvice}
          className="p-2 rounded-xl hover:bg-cyan-electric/20 text-zinc-400 hover:text-cyan-electric transition-all"
          title="Tactical AI"
        >
          <Bot className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button 
          onClick={onToggleVoice}
          className={`p-2 rounded-xl transition-all ${voiceEnabled ? 'bg-magenta-accent/20 text-magenta-accent' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
          title="Voice Chat"
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
        <button 
          onClick={onShare}
          className="p-2 rounded-xl hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-all"
          title="Compartir Sala"
        >
          <Share2 className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button 
          onClick={onRecordClip}
          className={`p-2 rounded-xl transition-all ${isRecordingClip ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-purple-500/20 text-zinc-400 hover:text-purple-400'}`}
          title="Grabar Clip (30s)"
          disabled={isRecordingClip}
        >
          <Video className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  );
}
