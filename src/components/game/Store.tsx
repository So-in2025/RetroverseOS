import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Check, Coins, Sparkles, Palette, Monitor } from 'lucide-react';
import { STORE_ITEMS, StoreItem } from '../../constants/storeItems';
import { economy } from '../../services/economy';
import { useEconomy } from '../../hooks/useEconomy';

interface StoreProps {
  isOpen: boolean;
  onClose: () => void;
  purchasedItems: string[];
  onPurchase: (item: StoreItem) => void;
  activeFilter: string;
  activeSkin: string;
  onSelect: (item: StoreItem) => void;
}

export default function Store({ 
  isOpen, 
  onClose, 
  purchasedItems, 
  onPurchase,
  activeFilter,
  activeSkin,
  onSelect
}: StoreProps) {
  const { balance } = useEconomy();
  const [category, setCategory] = useState<StoreItem['category']>('filter');

  const filteredItems = STORE_ITEMS.filter(item => item.category === category);

  if (!isOpen) return null;

  const handlePurchase = async (item: StoreItem) => {
    if (balance < item.price) return;
    
    const success = await economy.spendCoins(item.price, `Purchased ${item.name}`);
    if (success) {
      onPurchase(item);
    }
  };

  const isPurchased = (id: string) => purchasedItems.includes(id);
  const isActive = (item: StoreItem) => {
    if (item.category === 'filter') return activeFilter === item.value;
    if (item.category === 'skin') return activeSkin === item.value;
    return false;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl">
                <ShoppingBag className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Retro Store</h2>
                <p className="text-sm text-zinc-400">Customize your experience</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-yellow-500">{balance}</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex p-2 gap-2 bg-black/20">
            <button
              onClick={() => setCategory('filter')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                category === 'filter' ? 'bg-white/10 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Filters</span>
            </button>
            <button
              onClick={() => setCategory('skin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                category === 'skin' ? 'bg-white/10 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Skins</span>
            </button>
            <button
              onClick={() => setCategory('effect')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                category === 'effect' ? 'bg-white/10 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Effects</span>
            </button>
          </div>

          {/* Items Grid */}
          <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                className={`group relative p-4 rounded-2xl border transition-all ${
                  isActive(item) 
                    ? 'bg-indigo-500/10 border-indigo-500/50' 
                    : 'bg-white/5 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {item.name}
                  </h3>
                  {isPurchased(item.id) ? (
                    <div className="p-1 bg-emerald-500/20 rounded-full">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                      <Coins className="w-3 h-3" />
                      {item.price}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-zinc-400 mb-4 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex gap-2">
                  {isPurchased(item.id) ? (
                    <button
                      onClick={() => onSelect(item)}
                      disabled={isActive(item)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                        isActive(item)
                          ? 'bg-indigo-500 text-white cursor-default'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isActive(item) ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={balance < item.price}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                        balance >= item.price
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      Purchase
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 bg-black/40 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
              Retro Coins are earned by playing games and completing achievements
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
