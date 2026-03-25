import React, { useEffect, useState, useRef } from 'react';
import { Cpu, Activity, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceHUDProps {
  isVisible: boolean;
}

export default function PerformanceHUD({ isVisible }: PerformanceHUDProps) {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const [memory, setMemory] = useState<number | null>(null);
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

        // Memory usage (if available)
        if ((performance as any).memory) {
          setMemory(Math.round((performance as any).memory.usedJSHeapSize / 1048576));
        }
      }

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

  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-none flex flex-col gap-2">
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 flex items-center gap-3"
      >
        <div className="flex items-center gap-2">
          <Activity className={`w-3 h-3 ${fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'}`} />
          <span className="text-[10px] font-mono font-bold text-white/90 uppercase tracking-widest">
            {fps} FPS
          </span>
        </div>
        
        <div className="w-px h-3 bg-white/10" />
        
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-mono font-bold text-white/90 uppercase tracking-widest">
            {frameTime}ms
          </span>
        </div>

        {memory && (
          <>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-mono font-bold text-white/90 uppercase tracking-widest">
                {memory}MB
              </span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
