import { motion } from 'motion/react';

export default function BootAnimation({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 2.5, duration: 0.8 }}
      onAnimationComplete={onComplete}
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
          <span className="text-black font-black text-4xl">R</span>
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
