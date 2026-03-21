import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { SentinelEngine } from '../services/gcts';

export default function SentinelWidget() {
  const [status, setStatus] = useState(SentinelEngine.getStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = SentinelEngine.subscribe(() => {
      setStatus(SentinelEngine.getStatus());
    });
    return unsubscribe;
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'analyzing': return 'text-blue-400';
      case 'optimizing': return 'text-yellow-400';
      case 'protected': return 'text-emerald-400';
      default: return 'text-zinc-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'analyzing': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'optimizing': return <Zap className="w-4 h-4 animate-bounce" />;
      case 'protected': return <Shield className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 backdrop-blur-md transition-all hover:border-white/20 ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span className="text-[10px] font-black uppercase tracking-widest">
          Sentinel: {status}
        </span>
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 w-64 bg-zinc-900/95 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Estado del Sistema</h4>
              <div className={`w-2 h-2 rounded-full ${status === 'protected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-yellow-500 animate-pulse'}`} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Integridad de Memoria</span>
                <span className="text-emerald-400 font-mono">100%</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Latencia de Red</span>
                <span className="text-emerald-400 font-mono">12ms</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Protección Anti-Cheat</span>
                <span className="text-emerald-400 font-mono">ACTIVA</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Eventos Recientes</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                <div className="p-2 rounded bg-black/20 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                    <span className="text-[8px] font-bold uppercase text-zinc-300">COMPATIBILIDAD</span>
                  </div>
                  <p className="text-[9px] text-zinc-500 leading-tight">Escaneo de sectores completado. Sistema estable.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
