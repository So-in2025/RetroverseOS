import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Shield, Zap, Target, Crown, Lock, Unlock, ArrowLeft, Power, Swords, Moon, History, BrainCircuit, Coins, ShoppingBag, MessageSquare, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACHIEVEMENTS, Achievement } from '../services/achievements';
import { useAuth } from '../services/AuthContext';
import { AudioEngine } from '../services/audioEngine';

export default function Achievements() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    setAllAchievements(ACHIEVEMENTS);
    
    // Simulate fetching unlocked IDs from user profile
    setUnlockedIds(['first_boot', 'first_match']);
  }, []);

  const filteredAchievements = allAchievements.filter(ach => {
    const isUnlocked = unlockedIds.includes(ach.id);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'platinum': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      case 'gold': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'silver': return 'text-zinc-300 border-zinc-300/30 bg-zinc-300/10';
      case 'bronze': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      default: return 'text-zinc-400 border-zinc-400/30 bg-zinc-400/10';
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Power': return <Power className="w-6 h-6" />;
      case 'Swords': return <Swords className="w-6 h-6" />;
      case 'Moon': return <Moon className="w-6 h-6" />;
      case 'History': return <History className="w-6 h-6" />;
      case 'BrainCircuit': return <BrainCircuit className="w-6 h-6" />;
      case 'Coins': return <Coins className="w-6 h-6" />;
      case 'ShoppingBag': return <ShoppingBag className="w-6 h-6" />;
      case 'MessageSquare': return <MessageSquare className="w-6 h-6" />;
      case 'Gamepad2': return <Gamepad2 className="w-6 h-6" />;
      default: return <Trophy className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-cyan-electric/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                AudioEngine.playMoveSound();
                navigate(-1);
              }}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-400" />
                Sala de Trofeos
              </h1>
              <p className="text-zinc-400 font-mono text-sm mt-1">
                {unlockedIds.length} de {allAchievements.length} Logros Desbloqueados
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                AudioEngine.playMoveSound();
                setFilter(f);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                filter === f 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'unlocked' ? 'Desbloqueados' : 'Bloqueados'}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((ach, index) => {
            const isUnlocked = unlockedIds.includes(ach.id);
            const rarityStyle = getRarityColor(ach.rarity);

            return (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative p-6 rounded-2xl border transition-all ${
                  isUnlocked 
                    ? `bg-zinc-900 border-white/10 hover:border-white/30` 
                    : 'bg-zinc-950/50 border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-xl border ${isUnlocked ? rarityStyle : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                    {isUnlocked ? getIcon(ach.icon) : <Lock className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{ach.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-3">{ach.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isUnlocked ? rarityStyle : 'bg-zinc-800 text-zinc-500'}`}>
                        {ach.rarity}
                      </span>
                      <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        +{ach.reward} RC
                      </span>
                    </div>
                  </div>
                </div>
                {isUnlocked && (
                  <div className="absolute top-4 right-4">
                    <Unlock className="w-4 h-4 text-emerald-500/50" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
