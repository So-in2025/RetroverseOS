import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Sparkles, Zap, Shield, Crown, Star, Search, Filter, Hexagon, Cpu, Check, Gift, Heart } from 'lucide-react';
import { DynamicCover } from '../components/library/DynamicCover';
import { UnboxingModal } from '../components/marketplace/UnboxingModal';
import { storage } from '../services/storage';
import { achievements } from '../services/achievements';
import { haptics } from '../services/haptics';
import { economyService } from '../services/economyService';
import { AudioEngine } from '../services/audioEngine';
import { useAuth } from '../services/AuthContext';

export default function Marketplace() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('featured');
  const [credits, setCredits] = useState(0);
  const [purchasedItems, setPurchasedItems] = useState<number[]>([]);
  const [equippedVoice, setEquippedVoice] = useState<string>('Kore');
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  // Unboxing state
  const [isUnboxingOpen, setIsUnboxingOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<{ id: string, name: string, price: number } | null>(null);

  useEffect(() => {
    const loadEconomy = async () => {
      const currentCredits = await economyService.getCredits(user?.id);
      setCredits(currentCredits);
      
      const purchased = await economyService.getPurchasedItems(user?.id);
      setPurchasedItems(purchased);

      const voice = await economyService.getCoachVoice(user?.id);
      setEquippedVoice(voice);
    };
    loadEconomy();
  }, [user]);

  const categories = [
    { id: 'featured', label: 'Destacado', icon: Star },
    { id: 'game-packs', label: 'Premium Packs', icon: ShoppingCart },
    { id: 'cosmetics', label: 'Cosméticos', icon: Sparkles },
    { id: 'ai-voices', label: 'Voces de Entrenador IA', icon: Cpu },
    { id: 'boosts', label: 'Potenciadores', icon: Zap },
  ];

  const storeItems = [
    {
      id: 7,
      name: "Fighting Classics Pack",
      category: "game-packs",
      rarity: "Epic",
      price: 2500,
      image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=400&h=400",
      description: "Colección definitiva: Mortal Kombat 1-3 y Street Fighter II. Propiedad de por vida."
    },
    {
      id: 8,
      name: "JRPG Golden Era Pack",
      category: "game-packs",
      rarity: "Legendary",
      price: 3500,
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400&h=400",
      description: "Horas de aventura: Chrono Trigger, Final Fantasy VI y EarthBound."
    },
    {
      id: 9,
      name: "Sega Sonic Collection",
      category: "game-packs",
      rarity: "Rare",
      price: 1800,
      image: "https://images.unsplash.com/photo-1580234811497-9df715cb10b4?auto=format&fit=crop&q=80&w=400&h=400",
      description: "La trilogía original de Sonic the Hedgehog + Sonic & Knuckles."
    },
    {
      id: 1,
      name: "Cyber-Ronin Avatar Frame",
      category: "cosmetics",
      rarity: "Legendary",
      price: 1200,
      image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400&h=400",
      description: "Animated neon frame with particle effects."
    },
    {
      id: 2,
      name: "Tactical Commander AI (Zephyr)",
      category: "ai-voices",
      voiceId: "Zephyr",
      rarity: "Epic",
      price: 850,
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=400",
      description: "Replaces default AI Coach voice with a stern, tactical commander."
    },
    {
      id: 3,
      name: "Double XP Token (24h)",
      category: "boosts",
      rarity: "Rare",
      price: 300,
      image: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&q=80&w=400&h=400",
      description: "Earn double account XP for 24 hours."
    },
    {
      id: 4,
      name: "Neon Slums Profile Banner",
      category: "cosmetics",
      rarity: "Epic",
      price: 600,
      image: "https://images.unsplash.com/photo-1605142859862-978be7eba909?auto=format&fit=crop&q=80&w=400&h=400",
      description: "Dynamic profile background featuring a rainy cyberpunk city."
    },
    {
      id: 5,
      name: "Glitch Emote Pack",
      category: "cosmetics",
      rarity: "Rare",
      price: 450,
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400&h=400",
      description: "Set of 5 animated glitch emotes for the lobby chat."
    },
    {
      id: 6,
      name: "Zenith AI Personality (Fenrir)",
      category: "ai-voices",
      voiceId: "Fenrir",
      rarity: "Legendary",
      price: 1500,
      image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=400",
      description: "A calm, analytical AI that focuses on macro-strategy and mental fortitude."
    }
  ];

  const handleBuy = async (item: any) => {
    if (credits < item.price) {
      alert("Not enough credits!");
      return;
    }

    setIsProcessing(item.id);

    try {
      if (item.category === 'game-packs') {
        const success = await economyService.buyPack(user?.id, item.id.toString(), item.price);
        if (success) {
          const newBalance = await economyService.getCredits(user?.id);
          setCredits(newBalance);
          setPurchasedItems([...purchasedItems, item.id]);
          achievements.unlock('collector');
        } else {
          alert("Transaction failed.");
        }
      } else {
        // Deduct credits
        const newBalance = await economyService.addCredits(user?.id, -item.price);
        setCredits(newBalance);

        // Add to purchased items
        const newPurchased = [...purchasedItems, item.id];
        await economyService.savePurchasedItems(user?.id, newPurchased);
        setPurchasedItems(newPurchased);
        achievements.unlock('collector');

        // If it's a voice, auto-equip it
        if (item.category === 'ai-voices' && item.voiceId) {
          await economyService.saveCoachVoice(user?.id, item.voiceId);
          setEquippedVoice(item.voiceId);
        }
      }
    } catch (e) {
      console.error("Purchase failed", e);
      alert("Transaction failed.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const success = await economyService.subscribeRetroPass(user?.id);
      if (success) {
        alert("¡Bienvenido al Retro Pass!");
        // Update local state if needed
      } else {
        alert("Error al suscribirse.");
      }
    } catch (e) {
      console.error("Subscription failed", e);
      alert("Transaction failed.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleEquipVoice = async (voiceId: string) => {
    await economyService.saveCoachVoice(user?.id, voiceId);
    setEquippedVoice(voiceId);
  };

  const handleOpenBox = async (box: { id: string, name: string, price: number }) => {
    if (credits < box.price) {
      haptics.error();
      alert("Créditos insuficientes para esta caja.");
      return;
    }

    // Deduct credits
    const newBalance = await economyService.addCredits(user?.id, -box.price);
    setCredits(newBalance);
    
    setSelectedBox(box);
    setIsUnboxingOpen(true);
    haptics.medium();
  };

  const filteredItems = activeCategory === 'featured' 
    ? storeItems.slice(0, 4) 
    : storeItems.filter(item => item.category === activeCategory);

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
                <span className="text-lg md:text-xl font-mono font-bold text-white">{credits.toLocaleString()}</span>
              </div>
              <button 
                onClick={() => { storage.addCredits(1000).then(setCredits) }}
                className="ml-1 md:ml-2 px-2 md:px-3 py-0.5 md:py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors rounded text-[9px] md:text-xs font-bold uppercase tracking-wider border border-emerald-500/30"
              >
                +1K
              </button>
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

        {/* Daily Deals Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Ofertas Diarias
            </h3>
            <span className="text-xs text-zinc-400 font-mono bg-zinc-900 px-3 py-1 rounded-full border border-white/5">Termina en 04:23:11</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-purple-900/40 to-zinc-900/50 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer hover:border-purple-500/50 transition-colors">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
                <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=200&h=200" alt="Neon Nights Pack" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">-50%</div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm md:text-base text-white mb-1">Neon Nights Theme Pack</h4>
                <p className="text-xs text-zinc-400 mb-2 line-clamp-1">Fondos dinámicos y música synthwave para tu lobby.</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 line-through">1200</span>
                  <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-sm">
                    <Hexagon className="w-3 h-3 fill-emerald-400/20" />
                    600
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-900/40 to-zinc-900/50 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer hover:border-blue-500/50 transition-colors">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
                <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200&h=200" alt="XP Boost" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">-30%</div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm md:text-base text-white mb-1">XP Boost x2 (24h)</h4>
                <p className="text-xs text-zinc-400 mb-2 line-clamp-1">Doble experiencia en todas las partidas rankeadas.</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 line-through">500</span>
                  <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-sm">
                    <Hexagon className="w-3 h-3 fill-emerald-400/20" />
                    350
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mystery Box Section */}
        <div className="mb-8">
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
              const isOwned = purchasedItems.includes(item.id);
              const isEquipped = item.category === 'ai-voices' && equippedVoice === item.voiceId;

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
                              onClick={() => alert('Añadido a la lista de deseos')}
                              className="p-2 rounded-lg bg-white/5 hover:bg-pink-500 hover:text-white text-zinc-400 transition-colors tooltip-trigger"
                              title="Añadir a lista de deseos"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => alert('Función de regalo en desarrollo')}
                              className="p-2 rounded-lg bg-white/5 hover:bg-purple-500 hover:text-white text-zinc-400 transition-colors tooltip-trigger"
                              title="Regalar a un amigo"
                            >
                              <Gift className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleBuy(item)}
                              disabled={isProcessing === item.id || credits < item.price}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                credits >= item.price
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
                          {item.category === 'ai-voices' ? (
                            <button 
                              onClick={() => handleEquipVoice(item.voiceId!)}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors w-full ${
                                isEquipped
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-white/10 hover:bg-white/20 text-white'
                              }`}
                            >
                              {isEquipped ? 'Equipada' : 'Equipar Voz'}
                            </button>
                          ) : (
                            <button disabled className="px-4 py-2 rounded-lg text-sm font-bold bg-zinc-800 text-zinc-500 w-full cursor-not-allowed">
                              En Inventario
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

        {/* Battle Pass Teaser */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 bg-gradient-to-r from-emerald-900/40 to-zinc-900 border border-emerald-500/20 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
          <div className="absolute -right-20 -top-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              Temporada 4 Activa
            </div>
            <h3 className="text-3xl font-bold mb-3">Pase de Batalla Dominion</h3>
            <p className="text-zinc-400 mb-6">Desbloquea 100 niveles de recompensas exclusivas, incluyendo el aspecto mítico 'Voidwalker', voces de IA premium y suficientes créditos para comprar el próximo pase.</p>
            <button className="px-6 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-colors shadow-lg">
              Ver Recompensas
            </button>
          </div>

          <div className="relative z-10 w-full md:w-auto flex-1 max-w-md">
            <div className="bg-black/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-zinc-300">Nivel Actual</span>
                <span className="text-2xl font-mono font-bold text-emerald-400">42 <span className="text-sm text-zinc-500">/ 100</span></span>
              </div>
              <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-emerald-500 w-[42%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
              <p className="text-xs text-zinc-500 text-center">8,450 XP to next tier</p>
            </div>
          </div>
        </motion.div>

      </div>

      <UnboxingModal
        isOpen={isUnboxingOpen}
        onClose={() => setIsUnboxingOpen(false)}
        boxType={(selectedBox?.id as any) || 'box-1'}
        boxName={selectedBox?.name || ''}
      />
    </div>
  );
}
