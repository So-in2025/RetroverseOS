import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Play, Globe, Search, Plus, Zap, Shield, Trophy, Activity, ArrowRight, Gamepad2 } from 'lucide-react';
import { netplayService, NetplayRoom } from '../services/netplayService';
import { useAuth } from '../services/AuthContext';
import { gameCatalog } from '../services/gameCatalog';
import { haptics } from '../services/haptics';
import { AudioEngine } from '../services/audioEngine';
import { useNavigate } from 'react-router-dom';

export default function NetplayLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<NetplayRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadRooms = async () => {
      setIsLoading(true);
      const activeRooms = await netplayService.getActiveRooms();
      setRooms(activeRooms);
      setIsLoading(false);
    };
    loadRooms();

    const unsubscribe = netplayService.subscribeToRooms((updatedRooms) => {
      setRooms(updatedRooms);
    });

    return unsubscribe;
  }, []);

  const handleCreateRoom = async (game: any) => {
    if (!user) return;
    haptics.medium();
    const room = await netplayService.createRoom(user, game);
    if (room) {
      setShowCreateModal(false);
      // Navigate to the game with netplay params
      navigate(`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}&netplay=host&roomId=${room.id}`);
    }
  };

  const handleJoinRoom = async (room: NetplayRoom) => {
    if (!user) return;
    haptics.success();
    const success = await netplayService.joinRoom(room.id, user.id);
    if (success) {
      const game = gameCatalog.getGame(room.game_id);
      if (game) {
        navigate(`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}&netplay=client&roomId=${room.id}`);
      }
    }
  };

  const filteredRooms = rooms.filter(r => 
    r.game_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.host_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 selection:bg-cyan-electric/30">
      
      {/* Hero Header */}
      <div className="relative h-64 w-full overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1920&h=400')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        
        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-end pb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-electric/20 rounded-xl border border-cyan-electric/30">
              <Globe className="w-6 h-6 text-cyan-electric animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">Lobby Global de Netplay</h1>
          </div>
          <p className="text-zinc-400 max-w-2xl text-sm md:text-base">
            Conéctate con otros jugadores en tiempo real. Juega clásicos cooperativos o compite en duelos 1v1 con latencia ultra-baja.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar por juego o jugador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm outline-none focus:border-cyan-electric/50 transition-all backdrop-blur-md"
            />
          </div>
          <button 
            onClick={() => {
              haptics.medium();
              setShowCreateModal(true);
            }}
            className="px-8 py-4 bg-cyan-electric text-black rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(0,242,255,0.3)] hover:scale-105 flex items-center justify-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Crear Sala
          </button>
        </div>

        {/* Rooms Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-zinc-900/50 rounded-3xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <Users className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-zinc-400 mb-2">No hay salas activas</h3>
            <p className="text-zinc-600 text-sm max-w-xs">Sé el primero en crear una sala y espera a que alguien se una a la batalla.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredRooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:border-cyan-electric/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{room.status}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-[10px] font-black text-cyan-electric uppercase tracking-widest mb-1 block">{room.system_id}</span>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white group-hover:text-cyan-electric transition-colors line-clamp-1">{room.game_title}</h3>
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Host</p>
                      <p className="text-sm font-bold text-white">{room.host_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[...Array(room.players_count)].map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-cyan-electric border-2 border-zinc-900" />
                        ))}
                        {[...Array(room.max_players - room.players_count)].map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900" />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {room.players_count}/{room.max_players} Jugadores
                      </span>
                    </div>
                    <button 
                      onClick={() => handleJoinRoom(room)}
                      disabled={room.players_count >= room.max_players}
                      className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        room.players_count >= room.max_players 
                          ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                          : 'bg-white text-black hover:bg-cyan-electric hover:scale-105'
                      }`}
                    >
                      Unirse
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Crear Nueva Sala</h2>
                <p className="text-zinc-500 text-sm">Selecciona un juego de tu biblioteca para iniciar una sesión de Netplay.</p>
              </div>
              
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gameCatalog.getAllGames().filter(g => g.compatibility_status === 'verified').map(game => (
                    <button
                      key={game.game_id}
                      onClick={() => handleCreateRoom(game)}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-electric/50 hover:bg-cyan-electric/5 transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                        <img src={game.cover_url || undefined} alt={game.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">{game.system}</p>
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-electric transition-colors">{game.title}</h4>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-cyan-electric group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-black/40 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 text-zinc-500 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
