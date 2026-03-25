import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Home, Settings, Users, Volume2, LogOut, Gamepad2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AudioEngine } from '../../services/audioEngine';
import { haptics } from '../../services/haptics';

export default function SystemOverlay({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const navigate = useNavigate();

  const handleAction = (action: () => void) => {
    AudioEngine.playSelectSound();
    haptics.medium();
    action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-electric/10 rounded-xl">
                  <Gamepad2 className="w-6 h-6 text-cyan-electric" />
                </div>
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter">QUICK ACCESS</h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SYSTEM OVERLAY V2.5</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-zinc-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <OverlayButton 
                icon={Home} 
                label="HOME" 
                onClick={() => handleAction(() => navigate('/'))} 
                color="text-cyan-electric"
              />
              <OverlayButton 
                icon={Settings} 
                label="SETTINGS" 
                onClick={() => handleAction(() => {})} 
                color="text-zinc-400"
              />
              <OverlayButton 
                icon={Users} 
                label="FRIENDS" 
                onClick={() => handleAction(() => {})} 
                color="text-magenta-accent"
              />
              <OverlayButton 
                icon={Volume2} 
                label="AUDIO" 
                onClick={() => handleAction(() => {})} 
                color="text-emerald-500"
              />
            </div>

            <div className="pt-4 border-t border-white/5">
              <button
                onClick={() => handleAction(() => navigate('/'))}
                className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl flex items-center justify-center gap-3 transition-all group"
              >
                <LogOut className="w-5 h-5 text-rose-500 group-hover:translate-x-1 transition-transform" />
                <span className="text-xs font-black text-rose-500 uppercase tracking-widest">EXIT TO LIBRARY</span>
              </button>
            </div>
          </div>

          <div className="bg-black/40 px-8 py-4 flex items-center justify-between border-t border-white/5">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-cyan-electric" />
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">SENTINEL PROTOCOL: ACTIVE</span>
            </div>
            <span className="text-[8px] font-mono text-zinc-600">BUILD 03.25.26</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function OverlayButton({ icon: Icon, label, onClick, color }: any) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
    >
      <Icon className={`w-8 h-8 ${color} group-hover:scale-110 transition-transform`} />
      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}
