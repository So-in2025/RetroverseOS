import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, BrainCircuit, Swords, Coins, ShoppingBag, MessageSquare, Power, X } from 'lucide-react';
import { achievements, Achievement } from '../services/achievements';

const iconMap: Record<string, any> = {
  Trophy,
  BrainCircuit,
  Swords,
  Coins,
  ShoppingBag,
  MessageSquare,
  Power
};

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<(Achievement & { key: number })[]>([]);

  useEffect(() => {
    const cleanup = achievements.onUnlock((achievement) => {
      const key = Date.now();
      setNotifications(prev => [...prev, { ...achievement, key }]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.key !== key));
      }, 5000);
    });

    return () => {
      cleanup();
    };
  }, []);

  const removeNotification = (key: number) => {
    setNotifications(prev => prev.filter(n => n.key !== key));
  };

  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => {
          const Icon = iconMap[n.icon] || Trophy;
          return (
            <motion.div
              key={n.key}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className="pointer-events-auto w-80 bg-zinc-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl flex items-start gap-4 relative overflow-hidden group"
            >
              {/* Progress Bar */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-emerald-500/50"
              />

              {/* Icon Container */}
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Icon className="w-6 h-6 text-emerald-400" />
              </div>

              {/* Text */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Achievement Unlocked</span>
                </div>
                <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">{n.title}</h4>
                <p className="text-xs text-zinc-400 leading-tight mt-1">{n.description}</p>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => removeNotification(n.key)}
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Decorative Glow */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
