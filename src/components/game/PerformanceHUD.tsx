import React, { useEffect, useState, useRef } from 'react';
import { Cpu, Activity, Zap, Gamepad2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { inputManager } from '../../services/inputManager';

interface PerformanceHUDProps {
  isVisible: boolean;
  coreName?: string;
}

export default function PerformanceHUD({ isVisible, coreName }: PerformanceHUDProps) {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const [memory, setMemory] = useState<number | null>(null);
  const [activeButtons, setActiveButtons] = useState<Set<string>>(new Set());
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      frameCount.current++;
      const delta = time - lastTime.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        setFrameTime(Math.round(delta / frameCount.current));
        frameCount.current = 0;
        lastTime.current = time;

        if ((performance as any).memory) {
          setMemory(Math.round((performance as any).memory.usedJSHeapSize / 1048576));
        }
      }

      // Update active buttons for visualizer
      const currentButtons = new Set<string>();
      const state = inputManager.getButtonStates();
      Object.entries(state).forEach(([btn, isPressed]) => {
        if (isPressed) currentButtons.add(btn);
      });
      setActiveButtons(currentButtons);

      requestRef.current = requestAnimationFrame(animate);
    };

    if (isVisible) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const buttons = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'l', 'r', 'start', 'select'];

  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-none flex flex-col gap-2">
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex flex-col gap-3 shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className={`w-3.5 h-3.5 ${fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'}`} />
            <span className="text-[11px] font-mono font-black text-white uppercase tracking-widest">
              {fps} FPS
            </span>
          </div>
          
          <div className="w-px h-4 bg-white/10" />
          
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono font-black text-white uppercase tracking-widest">
              {frameTime}ms
            </span>
          </div>

          {memory && (
            <>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-mono font-black text-white uppercase tracking-widest">
                  {memory}MB
                </span>
              </div>
            </>
          )}
        </div>

        {coreName && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <Info className="w-3 h-3 text-zinc-500" />
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
              Core: {coreName}
            </span>
          </div>
        )}

        {/* Input Visualizer */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 className="w-3 h-3 text-zinc-500" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Input Monitor</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {buttons.map(btn => (
              <div 
                key={btn}
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-black uppercase transition-all border ${
                  activeButtons.has(btn)
                    ? 'bg-cyan-electric border-cyan-electric text-black shadow-[0_0_10px_rgba(0,255,242,0.5)]'
                    : 'bg-white/5 border-white/10 text-zinc-600'
                }`}
              >
                {btn === 'start' ? 'ST' : btn === 'select' ? 'SL' : btn.substring(0, 2)}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
