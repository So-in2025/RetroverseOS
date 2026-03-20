import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Circle, MessageSquare, Gamepad2, ChevronRight, ChevronLeft, Trophy, Swords, Eye, Play } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { haptics } from '../../services/haptics';
import TournamentBracket from '../community/TournamentBracket';

const friends = [
  { name: 'CyberKai', status: 'online', game: 'Street Fighter II', system: 'SNES', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
  { name: 'PixelQueen', status: 'away', game: 'Tetris', system: 'GB', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { name: 'GlitchRunner', status: 'online', game: 'Sonic The Hedgehog 2', system: 'GENESIS', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
  { name: 'RetroKing', status: 'offline', game: null, system: null, avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=100&h=100&fit=crop' },
];

const activeTournaments = [
  { id: 1, name: 'KOF \'98 World Cup', players: 128, status: 'En curso', prize: '5000 CR', game: 'The King of Fighters \'98' },
  { id: 2, name: 'Mario Kart 64 League', players: 32, status: 'Inscripción', prize: '1000 CR', game: 'Mario Kart 64' }
];

export default function SocialPanel() {
  const { socialPanelOpen, toggleSocialPanel } = useUIStore();
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);

  return (
    <>
      <AnimatePresence>
        {socialPanelOpen && (
          <>
            {/* Mobile Overlay Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSocialPanel}
              className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
            />

            <motion.div 
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.5 }}
              onDragEnd={(e, info) => {
                if (info.offset.x > 100) {
                  toggleSocialPanel();
                }
              }}
              className="fixed right-0 top-0 h-full w-80 xl:w-80 flex flex-col bg-zinc-950/95 xl:bg-zinc-950/80 backdrop-blur-3xl border-l border-white/5 z-[60] xl:z-40 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Nexo Social
                </h3>
                <button 
                  onClick={toggleSocialPanel}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-500 hover:text-white"
                  title="Cerrar Panel"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8 pb-24">
                
                {/* Tournaments Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Trophy className="w-3 h-3" />
                      Torneos Activos
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-black">
                      {activeTournaments.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {activeTournaments.map(t => (
                      <motion.div 
                        key={t.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          haptics.light();
                          setSelectedTournament(t.name);
                        }}
                        className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 cursor-pointer group hover:border-yellow-500/30 transition-all relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-yellow-500/10 transition-colors" />
                        
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors tracking-tight">{t.name}</h5>
                          </div>
                          <p className="text-[10px] font-bold text-zinc-400 mb-3 truncate">{t.game}</p>
                          
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="flex items-center gap-1.5 text-zinc-300 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                              <Users className="w-3 h-3 text-cyan-400" /> {t.players}
                            </span>
                            <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                              {t.prize}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Friends Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Swords className="w-3 h-3" />
                      Neural Links
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black">
                      {friends.filter(f => f.status === 'online').length} LIVE
                    </span>
                  </div>
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <motion.div 
                        key={friend.name}
                        whileHover={{ x: -4 }}
                        onClick={() => haptics.light()}
                        className="group cursor-pointer p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img 
                              src={friend.avatar} 
                              className={`w-12 h-12 rounded-xl object-cover border border-white/10 ${friend.status === 'offline' ? 'grayscale opacity-40' : ''}`} 
                              alt={friend.name}
                            />
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-zinc-950 ${
                              friend.status === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 
                              friend.status === 'away' ? 'bg-amber-500' : 'bg-zinc-700'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-black uppercase tracking-tight truncate ${friend.status === 'offline' ? 'text-zinc-500' : 'text-zinc-100'}`}>
                                {friend.name}
                              </p>
                              {friend.status === 'online' && (
                                <button className="opacity-0 group-hover:opacity-100 p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500 hover:text-black transition-all">
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            
                            {friend.game ? (
                              <div className="mt-1">
                                <p className="text-[10px] font-bold text-cyan-400 truncate flex items-center gap-1.5">
                                  <Gamepad2 className="w-3 h-3" /> {friend.game}
                                </p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-0.5 ml-4">{friend.system}</p>
                              </div>
                            ) : (
                              <p className="text-[10px] font-mono text-zinc-600 mt-1">Desconectado</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-12">
                <button 
                  onClick={() => haptics.medium()}
                  className="w-full py-3.5 bg-cyan-500 text-black rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat Global
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Desktop Toggle Button */}
        {!socialPanelOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={toggleSocialPanel}
            className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl z-40 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all group shadow-2xl overflow-hidden"
            title="Abrir Nexo Social"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform relative z-10" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTournament && (
          <TournamentBracket 
            tournamentTitle={selectedTournament} 
            onClose={() => setSelectedTournament(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
