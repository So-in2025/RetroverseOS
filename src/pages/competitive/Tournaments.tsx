import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Calendar, Users, Zap, Shield, ArrowLeft, ExternalLink, Timer, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TOURNAMENTS = [
  {
    id: 'retro-clash-1',
    title: 'Retro Clash: Street Fighter II',
    game: 'Street Fighter II Turbo',
    date: '2026-04-05T18:00:00Z',
    prize: '5,000 COINS',
    participants: 32,
    maxParticipants: 64,
    status: 'open',
    tier: 'Gold'
  },
  {
    id: 'kart-mayhem',
    title: 'Super Kart Mayhem',
    game: 'Super Mario Kart',
    date: '2026-04-12T20:00:00Z',
    prize: '2,500 COINS',
    participants: 16,
    maxParticipants: 32,
    status: 'open',
    tier: 'Silver'
  },
  {
    id: 'tetris-masters',
    title: 'Tetris Masters Invitational',
    game: 'Tetris',
    date: '2026-04-19T15:00:00Z',
    prize: '10,000 COINS',
    participants: 8,
    maxParticipants: 8,
    status: 'full',
    tier: 'Platinum'
  }
];

export default function Tournaments() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-carbon text-white pb-20 selection:bg-cyan-electric/30">
      {/* Header Section */}
      <div className="relative h-64 w-full overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1920&h=400')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/80 to-transparent" />
        
        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-end pb-10">
          <button 
            onClick={() => navigate('/competitive')}
            className="flex items-center gap-2 text-zinc-500 hover:text-cyan-electric transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-retro uppercase tracking-widest">Volver</span>
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-magenta-accent/20 rounded-xl border border-magenta-accent/30 shadow-[0_0_20px_rgba(255,0,255,0.2)]">
              <Trophy className="w-8 h-8 text-magenta-accent animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-retro uppercase tracking-tighter text-white">Torneos</h1>
              <p className="text-zinc-400 max-w-2xl text-sm md:text-base mt-2 font-retro uppercase tracking-widest">
                Demuestra tu habilidad en competiciones oficiales y gana premios exclusivos.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Featured Tournament */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 border border-white/10 mb-12 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6">
            <div className="px-4 py-1.5 rounded-full bg-magenta-accent/20 border border-magenta-accent/30 flex items-center gap-2">
              <Zap className="w-3 h-3 text-magenta-accent animate-pulse" />
              <span className="text-[10px] font-retro text-magenta-accent uppercase tracking-widest">Evento Destacado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-retro uppercase tracking-tighter text-white mb-4">Retroverse World Series</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed font-retro text-xs uppercase tracking-widest">
                El evento más grande del año. Los mejores jugadores de todo el mundo compitiendo en una selección de 10 clásicos. Clasificatorias abiertas ahora.
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <Medal className="w-5 h-5 text-cyan-electric" />
                  </div>
                  <div>
                    <p className="text-[8px] text-zinc-500 uppercase font-retro tracking-widest">Premio</p>
                    <p className="text-sm font-retro text-white uppercase tracking-tighter">50,000 COINS</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <Calendar className="w-5 h-5 text-cyan-electric" />
                  </div>
                  <div>
                    <p className="text-[8px] text-zinc-500 uppercase font-retro tracking-widest">Fecha</p>
                    <p className="text-sm font-retro text-white uppercase tracking-tighter">15 MAY 2026</p>
                  </div>
                </div>
              </div>

              <button className="w-full md:w-auto px-8 py-4 bg-magenta-accent text-white rounded-xl font-retro text-xs uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(255,0,255,0.3)] hover:scale-105 active:scale-95">
                Inscribirse Ahora
              </button>
            </div>
            
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10">
              <img 
                src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800" 
                alt="Tournament" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-carbon to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-carbon" />
                    ))}
                    <div className="w-8 h-8 rounded-full bg-magenta-accent border-2 border-carbon flex items-center justify-center text-[10px] font-retro">
                      +120
                    </div>
                  </div>
                  <span className="text-[10px] font-retro text-zinc-400 uppercase tracking-widest">128/256 Jugadores</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tournament List */}
        <h3 className="text-xl font-retro uppercase tracking-tighter text-white mb-8 flex items-center gap-3">
          <Zap className="w-5 h-5 text-cyan-electric" />
          Próximos Eventos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOURNAMENTS.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass rounded-2xl p-6 border border-white/5 hover:border-cyan-electric/30 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`px-2 py-1 rounded text-[8px] font-retro uppercase tracking-widest ${
                  t.tier === 'Gold' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                  t.tier === 'Platinum' ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' :
                  'bg-zinc-400/20 text-zinc-400 border border-zinc-400/30'
                }`}>
                  Tier {t.tier}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-zinc-500" />
                  <span className="text-[10px] font-retro text-zinc-500 uppercase tracking-widest">{t.participants}/{t.maxParticipants}</span>
                </div>
              </div>

              <h4 className="text-lg font-retro uppercase tracking-tighter text-white mb-2 group-hover:text-cyan-electric transition-colors">
                {t.title}
              </h4>
              <p className="text-[10px] text-zinc-500 uppercase font-retro tracking-widest mb-6">{t.game}</p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500 uppercase tracking-widest font-retro">Premio</span>
                  <span className="text-cyan-electric font-retro uppercase tracking-tighter">{t.prize}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500 uppercase tracking-widest font-retro">Inicia</span>
                  <span className="text-white font-retro uppercase tracking-tighter">{new Date(t.date).toLocaleDateString()}</span>
                </div>
              </div>

              <button 
                disabled={t.status === 'full'}
                className={`w-full py-3 rounded-xl font-retro text-[10px] uppercase tracking-widest transition-all ${
                  t.status === 'full' 
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-cyan-electric hover:scale-105 active:scale-95'
                }`}
              >
                {t.status === 'full' ? 'Cerrado' : 'Unirse'}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
            <Shield className="w-8 h-8 text-cyan-electric mx-auto mb-4" />
            <h5 className="text-sm font-retro uppercase tracking-widest text-white mb-2">Fair Play</h5>
            <p className="text-[10px] text-zinc-500 leading-relaxed font-retro uppercase tracking-widest">Sistema anti-trampas activo en todos los torneos oficiales.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
            <Zap className="w-8 h-8 text-magenta-accent mx-auto mb-4" />
            <h5 className="text-sm font-retro uppercase tracking-widest text-white mb-2">Premios Instantáneos</h5>
            <p className="text-[10px] text-zinc-500 leading-relaxed font-retro uppercase tracking-widest">Las recompensas se acreditan automáticamente al finalizar el evento.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
            <Users className="w-8 h-8 text-cyan-electric mx-auto mb-4" />
            <h5 className="text-sm font-retro uppercase tracking-widest text-white mb-2">Comunidad</h5>
            <p className="text-[10px] text-zinc-500 leading-relaxed font-retro uppercase tracking-widest">Únete a miles de jugadores y forja nuevas rivalidades.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
