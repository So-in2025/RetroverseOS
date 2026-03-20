import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X, Lock, Coins, Target } from 'lucide-react';
import { achievements, Achievement } from '../../services/achievements';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const rarityConfig = {
  bronze: {
    color: 'text-amber-600',
    bg: 'bg-amber-600/10',
    border: 'border-amber-600/30',
    glow: 'bg-amber-600/20',
    label: 'Bronze'
  },
  silver: {
    color: 'text-slate-300',
    bg: 'bg-slate-300/10',
    border: 'border-slate-300/30',
    glow: 'bg-slate-300/20',
    label: 'Silver'
  },
  gold: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
    glow: 'bg-yellow-400/20',
    label: 'Gold'
  },
  platinum: {
    color: 'text-cyan-300',
    bg: 'bg-cyan-300/10',
    border: 'border-cyan-300/30',
    glow: 'bg-cyan-300/20',
    label: 'Platinum'
  }
};

export default function AchievementsModal({ isOpen, onClose }: AchievementsModalProps) {
  if (!isOpen) return null;

  const allAchievements = achievements.getAllAchievements();
  const unlockedCount = achievements.getUnlockedCount();
  const totalCount = achievements.getTotalCount();
  const progressPercentage = Math.round((unlockedCount / totalCount) * 100) || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Trophy className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Trophy Room</h2>
                  <p className="text-sm text-zinc-400">Your legacy in the Nexo universe</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Overall Progress */}
            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Completion</span>
                </div>
                <span className="text-sm font-black text-white">{unlockedCount} / {totalCount}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Achievements List */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allAchievements.map((achievement) => {
                const isUnlocked = achievements.isUnlocked(achievement.id);
                const config = rarityConfig[achievement.rarity];

                return (
                  <div 
                    key={achievement.id}
                    className={`relative p-4 rounded-2xl border transition-all duration-300 ${
                      isUnlocked 
                        ? `bg-zinc-900/80 ${config.border} hover:bg-zinc-800/80` 
                        : 'bg-zinc-950/50 border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-xl shrink-0 flex items-center justify-center border relative ${
                        isUnlocked ? `${config.bg} ${config.border}` : 'bg-zinc-900 border-white/10'
                      }`}>
                        {isUnlocked ? (
                          <Trophy className={`w-6 h-6 ${config.color}`} />
                        ) : (
                          <Lock className="w-6 h-6 text-zinc-600" />
                        )}
                        {isUnlocked && (
                          <div className={`absolute inset-0 ${config.glow} blur-xl rounded-xl pointer-events-none`} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            isUnlocked ? config.color : 'text-zinc-500'
                          }`}>
                            {config.label}
                          </span>
                          {achievement.reward > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              isUnlocked ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' : 'text-zinc-500 bg-zinc-800 border border-zinc-700'
                            }`}>
                              +{achievement.reward} <Coins className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-black uppercase tracking-tight truncate ${
                          isUnlocked ? 'text-white' : 'text-zinc-400'
                        }`}>
                          {achievement.title}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-snug">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
