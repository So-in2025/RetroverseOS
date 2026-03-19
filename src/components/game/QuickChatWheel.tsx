import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';

interface QuickChatWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
  options: string[];
}

const QuickChatWheel: React.FC<QuickChatWheelProps> = ({ isOpen, onClose, onSelect, options }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Wheel Container */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
            className="relative w-80 h-80 pointer-events-auto"
          >
            {/* Center Button */}
            <div className="absolute inset-0 m-auto w-20 h-20 bg-zinc-900 border-2 border-cyan-electric rounded-full flex items-center justify-center z-10 shadow-[0_0_30px_rgba(0,255,242,0.3)]">
              <MessageSquare className="w-8 h-8 text-cyan-electric" />
            </div>

            {/* Options */}
            {options.map((opt, i) => {
              const angle = (i * 360) / options.length;
              const radius = 110;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: 0, y: 0 }}
                  animate={{ opacity: 1, x, y }}
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 255, 242, 0.2)' }}
                  onClick={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  className="absolute inset-0 m-auto w-28 h-12 bg-zinc-900/80 border border-white/10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-tighter text-white hover:border-cyan-electric/50 transition-colors shadow-xl"
                >
                  {opt}
                </motion.button>
              );
            })}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-4 -right-4 w-10 h-10 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickChatWheel;
