import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, BrainCircuit, Swords, Coins, ShoppingBag, MessageSquare, Power, X, Moon, History, Gamepad2, Crown } from 'lucide-react';
import { achievements, Achievement } from '../services/achievements';
import { haptics } from '../services/haptics';
import { AudioEngine } from '../services/audioEngine';

const iconMap: Record<string, any> = {
  Trophy,
  BrainCircuit,
  Swords,
  Coins,
  ShoppingBag,
  MessageSquare,
  Power,
  Moon,
  History,
  Gamepad2,
  Crown
};

const rarityConfig = {
  bronze: {
    color: 'text-amber-600',
    bg: 'bg-amber-600/10',
    border: 'border-amber-600/30',
    glow: 'bg-amber-600/20',
    bar: 'bg-amber-600/50',
    label: 'Bronze Trophy'
  },
  silver: {
    color: 'text-slate-300',
    bg: 'bg-slate-300/10',
    border: 'border-slate-300/30',
    glow: 'bg-slate-300/20',
    bar: 'bg-slate-300/50',
    label: 'Silver Trophy'
  },
  gold: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
    glow: 'bg-yellow-400/20',
    bar: 'bg-yellow-400/50',
    label: 'Gold Trophy'
  },
  platinum: {
    color: 'text-cyan-300',
    bg: 'bg-cyan-300/10',
    border: 'border-cyan-300/30',
    glow: 'bg-cyan-300/20',
    bar: 'bg-cyan-300/50',
    label: 'Platinum Trophy'
  }
};

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<(Achievement & { key: number })[]>([]);

  useEffect(() => {
    const cleanup = achievements.onUnlock((achievement) => {
      const key = Date.now();
      
      // Play sound and haptics based on rarity
      if (achievement.rarity === 'platinum' || achievement.rarity === 'gold') {
        haptics.heavy();
        AudioEngine.playSelectSound(); // Ideally a special achievement sound
      } else {
        haptics.medium();
        AudioEngine.playSelectSound();
      }

      setNotifications(prev => [...prev, { ...achievement, key }]);
      
      // Auto-remove after 6 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.key !== key));
      }, 6000);
    });

    return () => {
      cleanup();
    };
  }, []);

  const removeNotification = (key: number) => {
    setNotifications(prev => prev.filter(n => n.key !== key));
  };

  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-4 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => {
          const Icon = iconMap[n.icon] || Trophy;
          const config = rarityConfig[n.rarity] || rarityConfig.bronze;

          return (
            <motion.div
              key={n.key}
              initial={{ opacity: 0, x: 50, scale: 0.9, rotateX: 20 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20, transition: { duration: 0.2 } }}
              className={`pointer-events-auto w-80 sm:w-96 bg-zinc-950/95 backdrop-blur-3xl border ${config.border} rounded-2xl p-4 shadow-2xl flex items-start gap-4 relative overflow-hidden group`}
              style={{ transformPerspective: 1000 }}
            >
              {/* Progress Bar */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-1 ${config.bar}`}
              />

              {/* Icon Container */}
              <div className={`w-14 h-14 rounded-xl ${config.bg} flex items-center justify-center shrink-0 border ${config.border} relative z-10`}>
                <Icon className={`w-7 h-7 ${config.color}`} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Trophy className={`w-3 h-3 ${config.color}`} />
                    <span className={`text-[9px] font-black ${config.color} uppercase tracking-[0.2em]`}>
                      {config.label}
                    </span>
                  </div>
                  {n.reward > 0 && (
                    <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20 flex items-center gap-1">
                      +{n.reward} <Coins className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{n.title}</h4>
                <p className="text-[11px] text-zinc-400 leading-snug mt-1 line-clamp-2">{n.description}</p>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => removeNotification(n.key)}
                className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-20"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Decorative Glow */}
              <div className={`absolute -right-8 -top-8 w-32 h-32 ${config.glow} blur-3xl rounded-full pointer-events-none`} />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
