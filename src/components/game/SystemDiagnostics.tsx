import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Zap, Activity, Shield, Database, Globe, Signal } from 'lucide-react';

export default function SystemDiagnostics({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [stats, setStats] = useState({
    cpu: 0,
    memory: 0,
    latency: 0,
    uptime: 0,
    requests: 0
  });

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const memory = (window.performance as any)?.memory?.usedJSHeapSize;
      setStats({
        cpu: Math.floor(Math.random() * 15) + 5,
        memory: memory ? Math.floor(memory / 1024 / 1024) : 0,
        latency: Math.floor(Math.random() * 20) + 10,
        uptime: Math.floor(performance.now() / 1000),
        requests: Math.floor(Math.random() * 100)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed bottom-24 right-8 z-[100] w-80 bg-black/90 backdrop-blur-2xl border border-cyan-electric/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,242,255,0.15)]"
      >
        <div className="bg-cyan-electric/10 px-4 py-3 border-b border-cyan-electric/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-electric" />
            <span className="text-[10px] font-black text-cyan-electric uppercase tracking-widest">SYSTEM DIAGNOSTICS</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-bold text-emerald-500">STABLE</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatItem icon={Cpu} label="CPU LOAD" value={`${stats.cpu}%`} color="text-cyan-electric" />
            <StatItem icon={Database} label="MEM USAGE" value={`${stats.memory}MB`} color="text-magenta-accent" />
            <StatItem icon={Signal} label="LATENCY" value={`${stats.latency}ms`} color="text-emerald-500" />
            <StatItem icon={Globe} label="UPTIME" value={`${stats.uptime}s`} color="text-amber-500" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest">
              <span>CORE INTEGRITY</span>
              <span className="text-emerald-500">99.9%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: '99.9%' }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-[8px] font-mono text-zinc-400">
              <Shield className="w-3 h-3 text-cyan-electric" />
              <span>SENTINEL PROTOCOL ACTIVE</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatItem({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-sm font-black italic ${color}`}>{value}</div>
    </div>
  );
}
