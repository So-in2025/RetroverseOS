import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Sparkles, Zap, Shield, Crown, Star, Search, Filter, Hexagon, Cpu, Check, Gift, Heart, Monitor } from 'lucide-react';
import { DynamicCover } from '../components/library/DynamicCover';
import { UnboxingModal } from '../components/marketplace/UnboxingModal';
import { haptics } from '../services/haptics';
import { useEconomy } from '../hooks/useEconomy';
import { useCustomization } from '../hooks/useCustomization';
import { STORE_ITEMS, ItemCategory, customization } from '../services/customization';
import { economy } from '../services/economy';

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'featured'>('featured');
  const { balance } = useEconomy();
  const { ownedItems, equippedTheme, equippedBezel, equippedAvatar, equippedVoice, buyItem, equipItem } = useCustomization();
  
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  // Unboxing state
  const [isUnboxingOpen, setIsUnboxingOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<{ id: string, name: string, price: number } | null>(null);

  const categories: { id: ItemCategory | 'featured', label: string, icon: any }[] = [
    { id: 'featured', label: 'Destacado', icon: Star },
    { id: 'pack', label: 'Premium Packs', icon: ShoppingCart },
    { id: 'theme', label: 'Temas UI', icon: Sparkles },
    { id: 'bezel', label: 'Marcos (Bezels)', icon: Monitor },
    { id: 'avatar', label: 'Avatares', icon: Shield },
    { id: 'voice', label: 'Voces IA', icon: Cpu },
  ];

  const handleBuy = async (item: typeof STORE_ITEMS[0]) => {
    if (balance < item.price) {
      haptics.error();
      alert("¡No tienes suficientes RetroCoins!");
      return;
    }

    setIsProcessing(item.id);
    try {
      const success = await buyItem(item.id);
      if (success) {
        haptics.success();
      } else {
        haptics.error();
        alert("Error en la transacción.");
      }
    } catch (e) {
      console.error("Purchase failed", e);
      alert("Error en la transacción.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleEquip = (item: typeof STORE_ITEMS[0]) => {
    haptics.light();
    // If already equipped, unequip it
    const isEquipped = getIsEquipped(item);
    if (isEquipped) {
      equipItem(item.category, null);
    } else {
      equipItem(item.category, item.id);
    }
  };

  const getIsEquipped = (item: typeof STORE_ITEMS[0]) => {
    switch (item.category) {
      case 'theme': return equippedTheme === item.id;
      case 'bezel': return equippedBezel === item.id;
      case 'avatar': return equippedAvatar === item.id;
      case 'voice': return equippedVoice === item.id;
      default: return false;
    }
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    setTimeout(() => {
      alert("¡Bienvenido al Retro Pass!");
      setIsSubscribing(false);
    }, 1500);
  };

  const handleOpenBox = async (box: { id: string, name: string, price: number }) => {
    if (balance < box.price) {
      haptics.error();
      alert("Créditos insuficientes para esta caja.");
      return;
    }
    
    const success = await economy.spendCoins(box.price, `Compró ${box.name}`);
    if (!success) {
      haptics.error();
      alert("Error al procesar la compra.");
      return;
    }

    setSelectedBox(box);
    setIsUnboxingOpen(true);
    haptics.medium();
  };

  const handleReveal = async (item: any) => {
    if (item.type === 'coins') {
      await economy.addCoins(item.value, `Recompensa de ${selectedBox?.name}`);
    } else if (item.type === 'item') {
      // Find the item in STORE_ITEMS by its value or id
      const storeItem = STORE_ITEMS.find(i => i.value === item.value || i.id === item.value);
      if (storeItem) {
        await customization.grantItem(storeItem.id);
      }
    }
  };

  const filteredItems = activeCategory === 'featured' 
    ? STORE_ITEMS.slice(0, 4) 
    : STORE_ITEMS.filter(item => item.category === activeCategory);

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'Legendary': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'Epic': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
      case 'Rare': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      default: return 'text-zinc-400 border-zinc-400/30 bg-zinc-400/10';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch(rarity) {
      case 'Legendary': return 'Legendario';
      case 'Epic': return 'Épico';
      case 'Rare': return 'Raro';
      default: return 'Común';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 font-sans">
      
      {/* Header & Balance */}
      <div className="border-b border-white/10 bg-zinc-900/50 sticky top-0 md:top-16 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row justify-between items-center gap-3 md:gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Mercado</h1>
          </div>
          
          <div className="flex items-center justify-between w-full sm:w-auto gap-3 md:gap-4 bg-black/40 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 border-r border-white/10 pr-3">
              <span className="text-[10px] md:text-sm text-zinc-400 font-medium uppercase tracking-wider">Tickets:</span>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-yellow-400/20" />
                <span className="text-lg md:text-xl font-mono font-bold text-white">2</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] md:text-sm text-zinc-400 font-medium uppercase tracking-wider">Balance:</span>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Hexagon className="w-3 h-3 md:w-4 md:h-4 text-emerald-400 fill-emerald-400/20" />
                <span className="text-lg md:text-xl font-mono font-bold text-white">{balance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-8 space-y-6 md:space-y-12">
        
        {/* Retro Pass Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-emerald-500/30 group"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1920&h=600')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-emerald-900/20" />
          
          <div className="relative z-10 p-6 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-4 md:mb-6">
                <Crown className="w-3 h-3 md:w-4 md:h-4" /> Suscripción Premium
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 leading-tight text-white">Retro Pass<br/><span className="text-emerald-400">Acceso Total</span></h2>
              <p className="text-zinc-300 text-sm md:text-base mb-6 md:mb-8 leading-relaxed">
                Cloud Saves ilimitados, cero anuncios, servidores VIP sin lag y entrada gratuita a 2 torneos premium al mes. La experiencia definitiva.
              </p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button 
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm md:text-base transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  {isSubscribing ? 'Procesando...' : 'Suscribirse por $2.99/mes'}
                </button>
                <span className="text-zinc-400 text-xs md:text-sm font-medium">Cancela cuando quieras.</span>
              </div>
            </div>

            {/* Benefits List */}
            <div className="w-full md:w-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Beneficios Exclusivos</h3>
              <ul className="space-y-3">
                {[
                  'Servidores Multiplayer VIP (Sin Lag)',
                  'Cloud Saves Ilimitados',
                  'Cero Anuncios',
                  '2 Entradas a Torneos Premium/mes',
                  'Insignia de Fundador'
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Store Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 pb-4">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  haptics.light();
                  setActiveCategory(category.id);
                }}
                className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all whitespace-nowrap ${
                  activeCategory === category.id 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                }`}
              >
                <category.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 md:py-2.5 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button className="p-2 md:p-2.5 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors">
              <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        {/* Item Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => {
              const isOwned = ownedItems.includes(item.id);
              const isEquipped = getIsEquipped(item);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden group hover:border-white/20 transition-all flex flex-col"
                >
                  {/* Item Image */}
                  <div className="relative aspect-square overflow-hidden bg-zinc-800">
                    <DynamicCover 
                      src={item.image} 
                      alt={item.name} 
                      title={item.name}
                      system={item.category}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                    
                    {/* Rarity Badge */}
                    <div className={`absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${getRarityColor(item.rarity)}`}>
                      {getRarityLabel(item.rarity)}
                    </div>

                    {isOwned && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1">
                        <Check className="w-3 h-3" /> Poseído
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{item.name}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">{item.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                      {!isOwned ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Hexagon className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                            <span className="text-lg font-mono font-bold text-white">{item.price}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleBuy(item)}
                              disabled={isProcessing === item.id || balance < item.price}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                balance >= item.price
                                  ? 'bg-white/5 hover:bg-emerald-500 hover:text-white text-zinc-300'
                                  : 'bg-red-500/10 text-red-400 cursor-not-allowed'
                              }`}
                            >
                              {isProcessing === item.id ? 'Procesando...' : 'Comprar'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full flex justify-end">
                          {item.category !== 'pack' ? (
                            <button 
                              onClick={() => handleEquip(item)}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors w-full ${
                                isEquipped
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-white/10 hover:bg-white/20 text-white'
                              }`}
                            >
                              {isEquipped ? 'Equipado' : 'Equipar'}
                            </button>
                          ) : (
                            <button disabled className="px-4 py-2 rounded-lg text-sm font-bold bg-zinc-800 text-zinc-500 w-full cursor-not-allowed">
                              Desbloqueado
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Mystery Box Section */}
        <div className="mb-8 pt-8 border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Cajas Sorpresa
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'box-1', name: 'Caja Básica', price: 100, color: 'from-zinc-800 to-zinc-900', border: 'border-zinc-700', icon: <Hexagon className="w-8 h-8 text-zinc-400" /> },
              { id: 'box-2', name: 'Caja Rara', price: 500, color: 'from-blue-900/40 to-blue-950/50', border: 'border-blue-500/30', icon: <Star className="w-8 h-8 text-blue-400" /> },
              { id: 'box-3', name: 'Caja Épica', price: 1500, color: 'from-purple-900/40 to-purple-950/50', border: 'border-purple-500/30', icon: <Crown className="w-8 h-8 text-purple-400" /> },
            ].map((box) => (
              <div key={box.id} className={`bg-gradient-to-br ${box.color} border ${box.border} rounded-2xl p-6 flex flex-col items-center justify-center text-center group cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden`}>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=400')] bg-cover opacity-5 group-hover:opacity-10 transition-opacity" />
                <div className="relative z-10 mb-4 transform group-hover:-translate-y-2 transition-transform duration-300">
                  {box.icon}
                </div>
                <h4 className="font-bold text-white mb-1 relative z-10">{box.name}</h4>
                <p className="text-xs text-zinc-400 mb-4 relative z-10">Contiene 1 ítem aleatorio.</p>
                <button 
                  onClick={() => handleOpenBox(box as any)}
                  className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors relative z-10 flex items-center gap-2"
                >
                  <Hexagon className="w-3 h-3 fill-emerald-400/20 text-emerald-400" />
                  {box.price}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      <UnboxingModal
        isOpen={isUnboxingOpen}
        onClose={() => setIsUnboxingOpen(false)}
        boxType={selectedBox?.id as 'box-1' | 'box-2' | 'box-3' || 'box-1'}
        boxName={selectedBox?.name || ''}
        onReveal={handleReveal}
      />
    </div>
  );
}
