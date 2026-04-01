import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export const PageLoader: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-6 min-h-[400px]">
      <div className="relative">
        {/* Outer Glow */}
        <div className="absolute inset-0 bg-cyan-electric/20 blur-2xl rounded-full animate-pulse" />
        
        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="relative z-10"
        >
          <Loader2 className="w-12 h-12 text-cyan-electric" />
        </motion.div>
      </div>
      
      {/* Text with Retro Vibe */}
      <div className="text-center space-y-2">
        <h3 className="text-white font-retro text-sm uppercase tracking-[0.3em] animate-pulse">
          Sincronizando_Datos...
        </h3>
        <p className="text-gray-500 font-retro text-[8px] uppercase tracking-widest">
          Cargando_Módulos_De_Sistema
        </p>
      </div>
      
      {/* Progress Bar Style Decoration */}
      <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-electric to-transparent"
        />
      </div>
    </div>
  );
};
