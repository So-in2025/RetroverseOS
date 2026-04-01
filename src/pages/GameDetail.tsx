import { useParams, Link } from 'react-router-dom';
import { Play, Share2, Heart, Trophy, Users, ArrowLeft, BrainCircuit, Loader2, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { gameCatalog } from '../services/gameCatalog';
import { useEffect, useState, useMemo } from 'react';
import { CoverService } from '../services/coverService';
import { GameCover } from '../components/library/GameCover';
import { aiCoach } from '../services/aiCoaching';
import ReactMarkdown from 'react-markdown';
import { BYOKModal } from '../components/ai/BYOKModal';
import { statsService } from '../competitive/statsService';

export default function GameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState<any>(null);
  const [coverIndex, setCoverIndex] = useState(0);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBYOKModal, setShowBYOKModal] = useState(false);
  const [activePlayers, setActivePlayers] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await statsService.getCompetitiveStats();
      setActivePlayers(data.activePlayers);
    };
    fetchStats();
  }, []);

  const handleRequestBriefing = async () => {
    if (!game) return;
    setIsModalOpen(true);
    if (aiBriefing) return; // Already loaded

    setIsBriefingLoading(true);
    try {
      const briefing = await aiCoach.getGameTips(game.game_id, game.title);
      
      if (briefing === "El Coach Neural requiere que configures tu propia API Key (BYOK) en el Marketplace.") {
        setShowBYOKModal(true);
      }
      
      setAiBriefing(briefing);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const coverCandidates = useMemo(() => {
    if (!game) return [];
    return CoverService.getCoverCandidates(
      game.title,
      game.system,
      game.archive_id || game.game_id
    );
  }, [game]);

  useEffect(() => {
    if (gameId) {
      const foundGame = gameCatalog.getGame(gameId);
      setGame(foundGame);
    }
  }, [gameId]);

  if (!game) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-retro mb-4 uppercase tracking-widest">Juego no encontrado</h1>
          <Link to="/" className="text-emerald-400 hover:text-emerald-300 font-retro text-xs uppercase tracking-widest">Volver al Sistema</Link>
        </div>
      </div>
    );
  }

  const handleImageError = () => {
    if (coverIndex < coverCandidates.length - 1) {
      setCoverIndex(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      {/* Hero Background */}
      <div className="absolute inset-0 z-0">
        <GameCover 
          key={game.game_id}
          gameId={game.game_id}
          archiveId={game.archive_id}
          primaryUrl={game.artwork_url || game.cover_url} 
          title={game.title}
          systemId={game.system_id}
          className="w-full h-full opacity-30 blur-sm" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-cyan-electric mb-8 transition-colors font-mono text-xs uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Volver a la Bóveda
        </Link>

        <div className="flex flex-col md:flex-row gap-12 items-end">
          {/* Cover Art */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-64 md:w-80 shrink-0 rounded-lg shadow-2xl shadow-black/50 overflow-hidden border border-white/10"
          >
            <GameCover 
              key={game.game_id}
              gameId={game.game_id}
              archiveId={game.archive_id}
              primaryUrl={game.artwork_url || game.cover_url} 
              title={game.title}
              systemId={game.system_id}
              className="w-full h-full" 
            />
          </motion.div>

          {/* Game Info */}
          <div className="flex-1 pb-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded bg-white/10 text-sm font-retro tracking-widest uppercase border border-white/10">{game.system}</span>
                {game.year && (
                  <span className="px-3 py-1 rounded bg-white/5 text-sm text-gray-400 border border-white/5 font-retro tracking-widest">{game.year}</span>
                )}
                {game.genre && (
                  <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 text-sm font-retro tracking-widest border border-emerald-500/30 uppercase">{game.genre}</span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-5xl font-retro mb-6 leading-tight tracking-tighter uppercase italic">{game.title}</h1>
              
              <p className="text-base text-gray-300 max-w-2xl mb-8 leading-relaxed">
                {game.description || 'No hay descripción disponible.'}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-4 mb-10">
                {game.playable !== false ? (
                  <Link 
                    to={`/play/${gameId}`}
                    className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-retro text-base transition-all shadow-lg shadow-emerald-900/50 hover:scale-105 uppercase tracking-widest"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    Jugar Ahora
                  </Link>
                ) : (
                  <button 
                    disabled
                    className="flex items-center gap-3 px-8 py-4 bg-zinc-700 text-zinc-400 rounded-xl font-retro text-base cursor-not-allowed opacity-75 uppercase tracking-widest"
                    title="Este título es parte de la red en la nube y requiere una licencia."
                  >
                    <Play className="w-6 h-6 fill-current" />
                    Solo Sistema
                  </button>
                )}
                
                <button className="px-6 py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition-colors font-retro text-xs uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Invitar Amigos
                </button>
                
                <button className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors" title="Añadir a Favoritos">
                  <Heart className="w-6 h-6" />
                </button>
                
                <button className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors" title="Compartir">
                  <Share2 className="w-6 h-6" />
                </button>
              </div>

              {/* Stats / Meta */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-8 mb-12">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1 font-retro">Editor</p>
                  <p className="font-retro text-zinc-200 uppercase tracking-widest text-sm">{game.publisher || 'Desconocido'}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1 font-retro">Jugadores Activos</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="font-retro text-emerald-400 text-sm">
                      {activePlayers !== null ? activePlayers.toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1 font-retro">Rango de Comunidad</p>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <p className="font-retro text-white text-sm">#42</p>
                  </div>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1 font-retro">Temporada Competitiva</p>
                  <p className="font-retro text-white text-sm uppercase tracking-widest">Temporada 4</p>
                </div>
              </div>

              {/* Intel & Strategy Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* AI Intel Panel */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-retro italic uppercase tracking-tighter flex items-center gap-3">
                      <BrainCircuit className="w-6 h-6 text-emerald-500" />
                      Base de Datos de IA de Inteligencia
                    </h3>
                    <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-retro text-emerald-500 uppercase tracking-widest">
                      Datos Verificados
                    </div>
                  </div>
                  
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="text-zinc-400 leading-relaxed space-y-4">
                      <p>
                        <span className="text-white font-retro block mb-1 uppercase tracking-widest text-xs">📜 Historia e Impacto:</span>
                        {game.description || 'Cargando archivos históricos...'}
                      </p>
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl italic text-xs text-emerald-400/80 font-retro uppercase tracking-widest">
                        "Este título redefinió el panorama del {game.genre || 'género'} tras su lanzamiento en {game.year || 'su época'}, estableciendo mecánicas que todavía se utilizan en el juego competitivo moderno."
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleRequestBriefing}
                    className="mt-8 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-retro uppercase tracking-widest transition-all text-zinc-400 hover:text-white"
                  >
                    Solicitar Informe Táctico Completo
                  </button>
                </div>

                {/* Community & Leaderboard */}
                <div className="space-y-8">
                  <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-retro text-lg flex items-center gap-2 uppercase tracking-widest">
                        <Trophy className="w-5 h-5 text-emerald-500" />
                        Mejores Jugadores
                      </h3>
                      <Link to="/community" className="text-xs text-emerald-400 hover:text-emerald-300 font-retro uppercase tracking-widest">Ver Clasificaciones Completas</Link>
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((rank) => (
                        <div key={rank} className="flex items-center justify-between p-3 bg-black/20 rounded-lg hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-retro ${rank === 1 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-zinc-800 text-zinc-500'}`}>
                              {rank}
                            </span>
                            <span className="font-retro text-zinc-200 text-xs uppercase tracking-widest">JugadorPro_{rank}</span>
                          </div>
                          <span className="font-retro text-emerald-400 text-xs uppercase tracking-widest">{3000 - (rank * 50)} MMR</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-retro text-lg flex items-center gap-2 uppercase tracking-widest">
                        <Users className="w-5 h-5 text-cyan-electric" />
                        Salas Activas
                      </h3>
                      <span className="text-[10px] font-retro text-zinc-500 uppercase tracking-widest">12 SESIONES EN VIVO</span>
                    </div>
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] font-retro">
                          J{i}
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-cyan-electric/20 text-cyan-electric flex items-center justify-center text-[10px] font-retro">
                        +7
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* AI Intel Modal */}
      <AnimatePresence mode="popLayout">
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-retro italic uppercase tracking-tighter flex items-center gap-3">
                  <BrainCircuit className="w-6 h-6 text-emerald-500" />
                  Informe <span className="text-emerald-500">Táctico</span>
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
                {isBriefingLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                    <p className="font-retro text-[10px] uppercase tracking-widest text-zinc-500">Generando datos tácticos desde la red neuronal...</p>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-emerald max-w-none">
                    <ReactMarkdown>{aiBriefing || 'No hay informe disponible.'}</ReactMarkdown>
                    {aiBriefing?.includes('BYOK') && (
                      <button 
                        onClick={() => setShowBYOKModal(true)}
                        className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-retro text-xs uppercase tracking-widest transition-all w-full flex items-center justify-center gap-2"
                      >
                        <Zap className="w-5 h-5" />
                        Configurar BYOK
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <BYOKModal 
        isOpen={showBYOKModal}
        onClose={() => setShowBYOKModal(false)}
        onSuccess={() => {
          setAiBriefing(null);
          handleRequestBriefing();
        }}
      />
    </div>
  );
}
