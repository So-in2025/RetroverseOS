import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Users, Zap, Trophy, Clock, Star, ArrowRight, Flame, Globe, Swords, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { gameCatalog } from '../services/gameCatalog';
import { GameCover } from '../components/library/GameCover';
import { AudioEngine } from '../services/audioEngine';
import { haptics } from '../services/haptics';
import GameSection from '../components/library/GameSection';
import { GameObject } from '../services/metadataNormalization';
import { recommendationService } from '../services/recommendationService';
import { useAuth } from '../services/AuthContext';
import { BYOKModal } from '../components/ai/BYOKModal';

export default function Home() {
  const { user } = useAuth();
  const [recentGames, setRecentGames] = useState<GameObject[]>([]);
  const [featuredGame, setFeaturedGame] = useState<GameObject | null>(null);
  const [popularGames, setPopularGames] = useState<GameObject[]>([]);
  const [newAdditions, setNewAdditions] = useState<GameObject[]>([]);
  const [recommendedGames, setRecommendedGames] = useState<GameObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBYOK, setHasBYOK] = useState(false);
  const [showBYOKModal, setShowBYOKModal] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      await gameCatalog.init();
      const allGames = gameCatalog.getAllGames();
      
      // Load Recent
      const recent = await storage.getRecentGames(10);
      const recentWithData = recent.map(r => {
        const game = gameCatalog.getGame(r.gameId);
        return game ? { ...game, lastPlayed: r.timestamp } : null;
      }).filter(Boolean) as GameObject[];
      setRecentGames(recentWithData);

      // AI Recommendations
      const recommended = await recommendationService.getRecommendedGames(user?.id, 15);
      setRecommendedGames(recommended);
      
      const apiKey = localStorage.getItem('retroos_gemini_key');
      setHasBYOK(!!apiKey && apiKey.startsWith('AIza'));

      // Featured (Random or specific)
      if (allGames.length > 0) {
        // Pick a random featured game, preferably a verified one
        const eliteGames = allGames.filter(g => g.compatibility_status === 'verified');
        const pool = eliteGames.length > 0 ? eliteGames : allGames;
        setFeaturedGame(pool[Math.floor(Math.random() * pool.length)]);
        
        // Popular: Use trending service
        const trending = await recommendationService.getTrendingGames(15);
        setPopularGames(trending);
        
        // New Additions: Sort by some criteria, or just another slice
        const shuffled = [...allGames].sort(() => 0.5 - Math.random());
        setNewAdditions(shuffled.slice(15, 30));
      }
      setIsLoading(false);
    };
    loadDashboard();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-electric/30 pb-20">
      
      {/* Hero Section - Featured Game */}
      {featuredGame && (
        <section className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
          <div className="absolute inset-0 z-0">
            <GameCover 
              key={featuredGame.game_id}
              gameId={featuredGame.game_id}
              primaryUrl={featuredGame.cover_url || featuredGame.artwork_url} 
              title={featuredGame.title}
              systemId={featuredGame.system_id}
              className="w-full h-full opacity-40 blur-sm scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>

          <div className="relative z-10 h-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-end pb-12 md:pb-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-lg bg-cyan-electric/20 text-cyan-electric text-[10px] font-black uppercase tracking-widest border border-cyan-electric/30 backdrop-blur-md">
                  Título Destacado
                </span>
                <span className="px-3 py-1 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                  {featuredGame.system}
                </span>
              </div>
              
              <h1 className="text-5xl md:text-8xl font-black mb-6 leading-tight tracking-tighter italic uppercase">
                {featuredGame.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4">
                <Link 
                  to={`/play/${featuredGame.game_id}?url=${encodeURIComponent(featuredGame.rom_url)}&system=${featuredGame.system_id}`}
                  onClick={() => {
                    AudioEngine.playSelectSound();
                    haptics.medium();
                  }}
                  className="px-8 py-4 bg-cyan-electric text-black rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(0,242,255,0.4)] hover:scale-105 flex items-center gap-3"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Iniciar Enlace
                </Link>
                <Link 
                  to={`/game/${featuredGame.game_id}`}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all border border-white/10 backdrop-blur-md flex items-center gap-3"
                >
                  Datos Tácticos
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-16 -mt-10 relative z-20">
        
        {/* Smart Carousels */}
        <div className="space-y-4">
          {recentGames.length > 0 && (
            <GameSection title="Reanudar Rápido" games={recentGames} variant="live" />
          )}

          {recommendedGames.length > 0 && (
            <div className="relative">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-cyan-electric/50 rounded-full blur-sm" />
              <GameSection 
                title={
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-electric" />
                      <span>Selecciones de la IA para ti</span>
                    </div>
                    {!hasBYOK && (
                      <button 
                        onClick={() => setShowBYOKModal(true)}
                        className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                      >
                        <Zap className="w-3 h-3" />
                        Mejorar con BYOK
                      </button>
                    )}
                  </div>
                } 
                games={recommendedGames} 
                variant="elite" 
              />
            </div>
          )}
          
          {popularGames.length > 0 && (
            <GameSection title="Tendencias en la Red" games={popularGames} variant="default" />
          )}

          {newAdditions.length > 0 && (
            <GameSection title="Nuevas Adiciones" games={newAdditions} variant="default" />
          )}
        </div>

        {/* Community & Tournaments Teaser */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="relative rounded-3xl overflow-hidden border border-white/10 group h-64">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800&h=400')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Torneos en Vivo</h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-sm">Únete al Campeonato de Invierno y compite por 50,000 CR.</p>
              <Link to="/community?tab=tournaments" className="w-fit px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all">
                Entrar a la Arena
              </Link>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-white/10 group h-64">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&q=80&w=800&h=400')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Clasificaciones Globales</h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-sm">Mira dónde te posicionas frente a los mejores tacticianos del mundo.</p>
              <Link to="/community?tab=leaderboards" className="w-fit px-6 py-3 bg-zinc-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all border border-white/10">
                Ver Clasificaciones
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-12 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-8 h-8 text-yellow-500" />}
              title="Juego Instantáneo"
              description="Sin descargas. Sin configuración. Haz clic y juega en segundos usando emulación WebAssembly avanzada."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="Netcode Multijugador"
              description="Juega juegos cooperativos locales en línea con amigos. Nuestro netcode sincroniza las entradas para una experiencia fluida."
            />
            <FeatureCard 
              icon={<Trophy className="w-8 h-8 text-purple-500" />}
              title="Torneos"
              description="Compite en desafíos diarios y torneos de temporada para ganar insignias y escalar en las clasificaciones."
            />
          </div>
        </section>

      </div>

      <BYOKModal 
        isOpen={showBYOKModal}
        onClose={() => setShowBYOKModal(false)}
        onSuccess={() => {
          setHasBYOK(true);
          // Reload recommendations
          recommendationService.getRecommendedGames(user?.id, 15).then(setRecommendedGames);
        }}
      />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 hover:border-cyan-electric/50 transition-colors group">
      <div className="mb-4 p-3 bg-zinc-800 rounded-lg w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 text-white">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

