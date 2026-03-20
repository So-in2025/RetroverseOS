import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Hexagon, Star, Crown, X, Zap, Trophy } from 'lucide-react';
import { haptics } from '../../services/haptics';
import { AudioEngine } from '../../services/audioEngine';

interface UnboxingModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxType: 'box-1' | 'box-2' | 'box-3';
  boxName: string;
  onReveal?: (item: any) => void;
}

export const UnboxingModal: React.FC<UnboxingModalProps> = ({ isOpen, onClose, boxType, boxName, onReveal }) => {
  const [step, setStep] = useState<'idle' | 'shaking' | 'reveal'>('idle');
  const [revealedItem, setRevealedItem] = useState<any>(null);

  const items = {
    'box-1': [
      { id: 'coins_500', type: 'coins', value: 500, name: '500 CR', icon: <Hexagon className="w-12 h-12 text-emerald-400" />, rarity: 'Common' },
      { id: 'boost_xp', type: 'boost', value: 'double_xp_1h', name: 'Double XP (1h)', icon: <Zap className="w-12 h-12 text-blue-400" />, rarity: 'Rare' },
      { id: 'sticker_retro', type: 'item', value: 'sticker_retro', name: 'Retro Sticker', icon: <Star className="w-12 h-12 text-zinc-400" />, rarity: 'Common' },
    ],
    'box-2': [
      { id: 'coins_2000', type: 'coins', value: 2000, name: '2000 CR', icon: <Hexagon className="w-12 h-12 text-emerald-400" />, rarity: 'Rare' },
      { id: 'avatar_glitch', type: 'item', value: 'avatar_glitch', name: 'Glitch Entity Avatar', icon: <Sparkles className="w-12 h-12 text-purple-400" />, rarity: 'Epic' },
      { id: 'bezel_arcade', type: 'item', value: 'bezel_arcade', name: 'Classic Arcade Bezel', icon: <Trophy className="w-12 h-12 text-yellow-400" />, rarity: 'Rare' },
    ],
    'box-3': [
      { id: 'coins_5000', type: 'coins', value: 5000, name: '5000 CR', icon: <Hexagon className="w-12 h-12 text-emerald-400" />, rarity: 'Epic' },
      { id: 'voice_zephyr', type: 'item', value: 'voice_zephyr', name: 'Tactical Voice: Zephyr', icon: <Crown className="w-12 h-12 text-yellow-400" />, rarity: 'Epic' },
      { id: 'theme_neon', type: 'item', value: 'theme_neon', name: 'Neon Cyberpunk Theme', icon: <Sparkles className="w-12 h-12 text-pink-500" />, rarity: 'Epic' },
    ]
  };

  useEffect(() => {
    if (isOpen) {
      setStep('shaking');
      AudioEngine.playSelectSound();
      haptics.medium();
      
      const timer = setTimeout(() => {
        const possibleItems = items[boxType];
        const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        setRevealedItem(randomItem);
        setStep('reveal');
        haptics.success();
        AudioEngine.playSelectSound();
        if (onReveal) {
          onReveal(randomItem);
        }
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setStep('idle');
      setRevealedItem(null);
    }
  }, [isOpen, boxType]);

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'Legendary': return 'text-yellow-400 shadow-yellow-500/50';
      case 'Epic': return 'text-purple-400 shadow-purple-500/50';
      case 'Rare': return 'text-blue-400 shadow-blue-500/50';
      default: return 'text-zinc-400 shadow-zinc-500/50';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        >
          <div className="relative w-full max-w-lg flex flex-col items-center">
            
            {/* Close Button (only after reveal) */}
            {step === 'reveal' && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                className="absolute -top-12 right-0 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </motion.button>
            )}

            {/* The Box / Reveal Animation */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              
              {/* Shaking Box */}
              {step === 'shaking' && (
                <motion.div
                  animate={{
                    rotate: [0, -5, 5, -5, 5, 0],
                    scale: [1, 1.1, 1],
                    y: [0, -10, 0]
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-2xl border-2 border-white/20
                    ${boxType === 'box-1' ? 'from-zinc-700 to-zinc-900' : 
                      boxType === 'box-2' ? 'from-blue-600 to-blue-900' : 
                      'from-purple-600 to-purple-900'}`}
                  >
                    <Sparkles className="w-12 h-12 text-white/50 animate-pulse" />
                  </div>
                  
                  {/* Energy Particles */}
                  <div className="absolute inset-0 -z-10">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [0, 1, 0],
                          x: [0, (i % 2 === 0 ? 50 : -50)],
                          y: [0, (i < 3 ? -50 : 50)],
                          opacity: [0, 1, 0]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-white/30"
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Reveal Burst */}
              {step === 'reveal' && revealedItem && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 100 }}
                  className="flex flex-col items-center"
                >
                  {/* Rays Effect */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 -z-10 flex items-center justify-center"
                  >
                    <div className={`w-96 h-96 rounded-full blur-3xl opacity-20 bg-current ${getRarityColor(revealedItem.rarity)}`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-full bg-gradient-to-t from-transparent via-white/20 to-transparent"
                          style={{ transform: `rotate(${i * 30}deg)` }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  {/* Item Icon */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={`p-8 rounded-3xl bg-black/40 border-2 border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] mb-6 ${getRarityColor(revealedItem.rarity)}`}
                  >
                    {revealedItem.icon}
                  </motion.div>

                  {/* Item Details */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <span className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 block ${getRarityColor(revealedItem.rarity)}`}>
                      {revealedItem.rarity}
                    </span>
                    <h2 className="text-4xl font-bold text-white mb-8 tracking-tight">
                      {revealedItem.name}
                    </h2>
                    
                    <button
                      onClick={onClose}
                      className="px-12 py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
                    >
                      RECLAMAR
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Ambient Text */}
            {step === 'shaking' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-12 text-zinc-500 font-mono text-sm tracking-widest uppercase animate-pulse"
              >
                Desencriptando contenido...
              </motion.p>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
