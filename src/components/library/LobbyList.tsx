import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Play, Plus, Loader2, Globe, ShieldCheck } from 'lucide-react';
import { multiplayerService, GameSession } from '../../services/supabase';
import { useAuth } from '../../services/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

export const LobbyList: React.FC = () => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchSessions = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    if (!supabase) return;

    // Subscribe to changes
    const channel = supabase
      .channel('public:game_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleJoin = async (session: GameSession) => {
    if (!user) return;
    try {
      await multiplayerService.joinSession(session.id, user.id);
      navigate(`/play/${session.game_id}?session=${session.id}`);
    } catch (err) {
      console.error('Error joining session:', err);
    }
  };

  return (
    <div className="mb-12 px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3 italic">
          <span className="w-1.5 h-8 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
          LOBBIES MULTIJUGADOR
          <span className="text-[10px] font-black bg-emerald-500 text-black px-2 py-0.5 rounded ml-2">EN LÍNEA</span>
        </h2>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <Globe className="w-3 h-3" /> {sessions.length} Salas Disponibles
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4 bg-zinc-900/30 border border-white/5 rounded-2xl">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sincronizando con la Red...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4 bg-zinc-900/30 border border-white/5 rounded-2xl border-dashed">
            <Users className="w-12 h-12 text-zinc-700" />
            <div className="text-center">
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No hay salas activas</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Sé el primero en desafiar a la comunidad</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-zinc-900/50 border border-white/10 rounded-2xl p-4 hover:border-emerald-500/50 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-emerald-500">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-tight truncate w-32">
                        SALA DE {session.game_id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </h3>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Host: {session.host_id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                    WAITING
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center">
                      <User className="w-3 h-3 text-zinc-500" />
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-zinc-900/50 flex items-center justify-center border-dashed">
                      <Plus className="w-3 h-3 text-zinc-700" />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">1/2 Jugadores</span>
                </div>

                <button
                  onClick={() => handleJoin(session)}
                  className="w-full py-2.5 bg-emerald-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3 h-3 fill-current" /> UNIRSE AL DUELO
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

const User = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
