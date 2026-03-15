import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Shield, Swords, Target, Cpu } from 'lucide-react';

interface TacticalOverlayProps {
  advice: string;
  isVisible: boolean;
}

export default function TacticalOverlay({ advice, isVisible }: TacticalOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 20 }}
          className="absolute top-6 right-6 w-80 z-50 pointer-events-none"
        >
          {/* Glass Container */}
          <div className="relative p-6 bg-carbon/60 backdrop-blur-2xl border border-cyan-electric/30 rounded-2xl overflow-hidden neon-glow-cyan glass">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-2">
              <Cpu className="w-12 h-12 text-cyan-electric/10" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-electric/20 flex items-center justify-center border border-cyan-electric/30">
                <Zap className="w-5 h-5 text-cyan-electric animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest italic">Tactical AI</h4>
                <p className="text-[10px] font-bold text-cyan-electric/60 uppercase tracking-tighter">Strategist Link Active</p>
              </div>
            </div>

            {/* Advice Content */}
            <div className="relative">
              <div className="absolute -left-2 top-0 bottom-0 w-1 bg-cyan-electric/40 rounded-full" />
              <p className="text-sm font-bold text-white leading-relaxed italic pl-3">
                "{advice}"
              </p>
            </div>

            {/* Footer Stats */}
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex gap-3">
                <Shield className="w-4 h-4 text-zinc-600" />
                <Swords className="w-4 h-4 text-zinc-600" />
                <Target className="w-4 h-4 text-zinc-600" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Analysis: 98%</span>
            </div>

            {/* Corner Decorative Elements */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-electric" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-electric" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
