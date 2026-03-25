import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, MessageSquare, Zap, Shield, Star } from 'lucide-react';
import { AudioEngine } from '../../services/audioEngine';

export interface Notification {
  id: string;
  type: 'achievement' | 'friend' | 'message' | 'system' | 'elite';
  title: string;
  message: string;
  icon?: any;
}

export default function ConsoleNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleNotification = (e: CustomEvent<Notification>) => {
      const newNotif = e.detail;
      setNotifications(prev => [...prev, newNotif]);
      AudioEngine.playNotificationSound();
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
      }, 5000);
    };

    window.addEventListener('console_notification' as any, handleNotification);
    return () => window.removeEventListener('console_notification' as any, handleNotification);
  }, []);

  return (
    <div className="fixed top-8 right-8 z-[300] flex flex-col gap-4 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="w-80 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-4 pointer-events-auto"
          >
            <div className={`p-2 rounded-xl shrink-0 ${getBgColor(notif.type)}`}>
              {getIcon(notif.type, notif.icon)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
                {notif.title}
              </h4>
              <p className="text-xs font-bold text-white leading-tight">
                {notif.message}
              </p>
            </div>
            <div className="absolute top-0 right-0 h-full w-1 bg-cyan-electric rounded-r-2xl" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getIcon(type: string, CustomIcon?: any) {
  if (CustomIcon) return <CustomIcon className="w-5 h-5 text-white" />;
  switch (type) {
    case 'achievement': return <Trophy className="w-5 h-5 text-amber-500" />;
    case 'friend': return <Users className="w-5 h-5 text-magenta-accent" />;
    case 'message': return <MessageSquare className="w-5 h-5 text-cyan-electric" />;
    case 'elite': return <Star className="w-5 h-5 text-cyan-electric" />;
    default: return <Zap className="w-5 h-5 text-emerald-500" />;
  }
}

function getBgColor(type: string) {
  switch (type) {
    case 'achievement': return 'bg-amber-500/10';
    case 'friend': return 'bg-magenta-accent/10';
    case 'message': return 'bg-cyan-electric/10';
    case 'elite': return 'bg-cyan-electric/20';
    default: return 'bg-emerald-500/10';
  }
}

// Helper to trigger notifications from anywhere
export const notify = (notif: Omit<Notification, 'id'>) => {
  const event = new CustomEvent('console_notification', {
    detail: { ...notif, id: Math.random().toString(36).substr(2, 9) }
  });
  window.dispatchEvent(event);
};
