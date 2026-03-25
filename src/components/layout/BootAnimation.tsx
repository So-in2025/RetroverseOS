import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { AudioEngine } from '../../services/audioEngine';

export default function BootAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    AudioEngine.playBootSound();
  }, []);

  console.log('📦 [BootAnimation] Rendering');
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 2.5, duration: 0.8 }}
      onAnimationComplete={() => {
        console.log('🚀 [BootAnimation] Animation complete');
        onComplete();
      }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
    >
      {/* Console-like boot effect */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-24 h-24 bg-cyan-electric rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(0,242,255,0.4)]">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 21V3H14C17.3137 3 20 5.68629 20 9C20 11.4533 18.5285 13.5634 16.4253 14.5352L21 21H17.5L13.5 15H9V21H5ZM9 11H14C15.1046 11 16 10.1046 16 9C16 7.89543 15.1046 7 14 7H9V11Z" fill="black"/>
          </svg>
        </div>
        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Retroverse</h1>
        <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-cyan-electric"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
