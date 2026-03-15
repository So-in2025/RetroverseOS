import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Users, Zap, Trophy, Clock, Star, ArrowRight, Flame, Globe, Swords } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { gameCatalog } from '../services/gameCatalog';
import { DynamicCover } from '../components/library/DynamicCover';
import { AudioEngine } from '../services/audioEngine';
import { haptics } from '../services/haptics';

export default function Home() {
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [featuredGame, setFeaturedGame] = useState<any>(null);
  const [popularGames, setPopularGames] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      await gameCatalog.init();
      const allGames = gameCatalog.getAllGames();
      
      // Load Recent
      const recent = await storage.getRecentGames(6);
      const recentWithData = recent.map(r => {
        const game = gameCatalog.getGame(r.gameId);
        return game ? { ...game, lastPlayed: r.timestamp } : null;
      }).filter(Boolean);
      setRecentGames(recentWithData);

      // Featured (Random or specific)
      if (allGames.length > 0) {
        setFeaturedGame(allGames[Math.floor(Math.random() * allGames.length)]);
        setPopularGames(allGames.slice(0, 10)); // Just a slice for now
      }
    };
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-electric/30 pb-20">
      
      {/* Hero Section - Featured Game */}
      {featuredGame && (
        <section className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
          <div className="absolute inset-0 z-0">
            <DynamicCover 
              src={featuredGame.cover_url || featuredGame.artwork_url} 
              alt="Hero" 
              title={featuredGame.title}
              system={featuredGame.system}
              className="w-full h-full object-cover opacity-40 blur-sm scale-105" 
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
                  to={`/play/${featuredGame.game_id}`}
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
        
        {/* Continue Playing Section */}
        {recentGames.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                <Clock className="w-6 h-6 text-cyan-electric" />
                Reanudar Rápido
              </h2>
              <Link to="/vault" className="text-xs font-black text-zinc-500 hover:text-cyan-electric transition-colors uppercase tracking-widest flex items-center gap-2">
                Ver Todo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
              {recentGames.map((game, i) => (
                <motion.div
                  key={game.game_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl"
                >
                  <DynamicCover 
                    src={game.cover_url || game.artwork_url} 
                    alt={game.title}
                    title={game.title}
                    system={game.system}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                  
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <p className="text-[10px] font-black text-cyan-electric uppercase tracking-widest mb-1">{game.system}</p>
                    <h3 className="text-sm font-black text-white uppercase italic leading-tight mb-3 line-clamp-2">{game.title}</h3>
                    <Link 
                      to={`/play/${game.game_id}`}
                      onClick={() => {
                        AudioEngine.playSelectSound();
                        haptics.light();
                      }}
                      className="w-full py-2 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest text-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
                    >
                      Reanudar
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Popular Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <Flame className="w-6 h-6 text-orange-500" />
              Tendencias en la Red
            </h2>
            <Link to="/vault" className="text-xs font-black text-zinc-500 hover:text-cyan-electric transition-colors uppercase tracking-widest flex items-center gap-2">
              Explorar Bóveda <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularGames.slice(0, 6).map((game, i) => (
              <Link 
                key={game.game_id}
                to={`/game/${game.game_id}`}
                className="group flex items-center gap-4 bg-zinc-900/50 border border-white/5 p-4 rounded-2xl hover:bg-zinc-900 hover:border-white/20 transition-all"
              >
                <div className="w-20 h-24 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                  <DynamicCover 
                    src={game.cover_url || game.artwork_url} 
                    alt={game.title}
                    title={game.title}
                    system={game.system}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{game.system}</span>
                  <h3 className="text-lg font-black text-white uppercase italic truncate mb-2">{game.title}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <Globe className="w-3 h-3" /> 1.2k Jugando
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                      <Star className="w-3 h-3 fill-current" /> 4.8
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

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

        {/* Features Grid (Restored from previous version) */}
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

