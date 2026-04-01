import { useState, useEffect } from 'react';
import { useMatchmaking } from '../../competitive/useMatchmaking';
import { gameCatalog } from '../../services/gameCatalog';
import { rankingService } from '../../competitive/rankingService';
import { useAuth } from '../../services/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, X, Search, AlertCircle, CheckCircle2, Loader2, Trophy, Gamepad2, Users } from 'lucide-react';

function GameCard({ game, isSelected, onSelect, isCurated }: { 
  game: any, 
  isSelected: boolean, 
  onSelect: () => void,
  isCurated?: boolean
}) {
  const [imgSrc, setImgSrc] = useState(game.cover_url);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (imgSrc === game.cover_url && game.artwork_url) {
      setImgSrc(game.artwork_url);
    } else if (!hasError) {
      // If both cover and artwork fail, show a generic placeholder or keep it empty
      // but don't use a generated photo.
      setHasError(true);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative aspect-[4/5] rounded-xl overflow-hidden border transition-all group ${
        isSelected 
          ? 'border-cyan-electric shadow-[0_0_20px_rgba(0,255,255,0.2)] z-10' 
          : 'border-white/5 hover:border-white/20 bg-carbon/40'
      }`}
    >
      <img 
        src={imgSrc} 
        alt={game.title}
        onError={handleError}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/40 to-transparent opacity-90" />
      
      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[6px] font-mono text-cyan-electric uppercase tracking-[0.1em] px-1 py-0.5 bg-cyan-electric/5 rounded-sm border border-cyan-electric/10">
            {game.system}
          </span>
          {isCurated && (
            <span className="text-[6px] font-mono text-magenta-accent uppercase tracking-[0.1em] px-1 py-0.5 bg-magenta-accent/5 rounded-sm border border-magenta-accent/10">
              ARENA
            </span>
          )}
        </div>
        <p className="text-[9px] font-mono text-white/90 uppercase tracking-tight leading-tight line-clamp-1 group-hover:text-cyan-electric transition-colors">
          {game.title}
        </p>
      </div>

      {isSelected && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 bg-cyan-electric rounded-full flex items-center justify-center shadow-lg"
        >
          <Sword className="w-3 h-3 text-carbon" />
        </motion.div>
      )}
    </motion.button>
  );
}

export default function Matchmaking() {
  const { user } = useAuth();
  const { status, foundMatch, error, startSearch, cancelSearch } = useMatchmaking();
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();

  const [selectedSystem, setSelectedSystem] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadGames = async () => {
      const allGames = await gameCatalog.getAllGames();
      const playable = allGames.filter(g => g.playable);
      
      // Sort: Curated first, then alphabetical
      const sorted = playable.sort((a, b) => {
        if (a.is_arena && !b.is_arena) return -1;
        if (!a.is_arena && b.is_arena) return 1;
        return a.title.localeCompare(b.title);
      });
      
      setGames(sorted);
    };
    loadGames();
  }, []);

  const systems = ['ALL', ...Array.from(new Set(games.map(g => g.system)))].sort();

  const filteredGames = games.filter(g => {
    const matchesSearch = g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         g.system.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSystem = selectedSystem === 'ALL' || g.system === selectedSystem;
    return matchesSearch && matchesSystem;
  });

  const curatedGames = filteredGames.filter(g => g.is_arena);
  const selectedGame = games.find(g => g.game_id === selectedGameId);

  useEffect(() => {
    if (status === 'found' && foundMatch) {
      const timer = setTimeout(() => {
        navigate(`/play/${foundMatch.room.game_id}?roomId=${foundMatch.room.id}&opponentId=${foundMatch.opponentId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, foundMatch, navigate]);

  const handleStartSearch = async () => {
    if (selectedGameId && user) {
      setIsStarting(true);
      try {
        const rank = await rankingService.getPlayerRank(user.id);
        const currentMmr = rank ? rank.mmr : 1000;
        await startSearch(selectedGameId, currentMmr);
      } catch (err) {
        console.error("Failed to start search:", err);
      } finally {
        setIsStarting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-carbon text-white font-sans selection:bg-cyan-electric/30">
      {/* Header HUD - More compact and technical */}
      <header className="sticky top-0 z-50 bg-carbon/80 backdrop-blur-md border-b border-white/5 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-electric animate-pulse" />
                <h1 className="text-xs font-mono uppercase tracking-[0.3em] text-cyan-electric">Arena_Competitiva</h1>
              </div>
              <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest mt-0.5">Protocolo_V2.5 // Enlace_Neural_Activo</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-[8px] font-mono uppercase tracking-widest text-white/40">
              <div className="flex flex-col items-end">
                <span>Latencia_Global</span>
                <span className="text-cyan-electric">0.02ms</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col items-end">
                <span>Usuarios_Online</span>
                <span className="text-magenta-accent">1,429</span>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/competitive')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
            >
              <X className="w-4 h-4 text-white/40 group-hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div 
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8"
            >
              {/* Main Content Area */}
              <div className="space-y-8">
                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text"
                      placeholder="BUSCAR_DESAFÍO..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-carbon/50 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-[10px] font-mono uppercase tracking-widest focus:outline-none focus:border-cyan-electric/50 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {['ALL', 'NES', 'SNES', 'N64', 'PSX', 'Arcade'].map((sys) => (
                      <button
                        key={sys}
                        onClick={() => setSelectedSystem(sys)}
                        className={`px-4 py-2 rounded-xl text-[8px] font-mono uppercase tracking-widest border transition-all whitespace-nowrap ${
                          selectedSystem === sys
                            ? 'bg-cyan-electric text-carbon border-cyan-electric'
                            : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {sys}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Game Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40">Catálogo_Oficial_Arena</h2>
                    <span className="text-[8px] font-mono text-cyan-electric/60 uppercase tracking-widest">{curatedGames.length} Módulos_Detectados</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    {curatedGames.map((game) => (
                      <GameCard 
                        key={game.game_id}
                        game={game}
                        isSelected={selectedGameId === game.game_id}
                        onSelect={() => setSelectedGameId(game.game_id)}
                        isCurated
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Info & Action */}
              <div className="space-y-6">
                <div className="glass p-6 rounded-2xl border border-white/5 space-y-6 sticky top-24">
                  <div className="space-y-2">
                    <h3 className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/40">Estado_del_Jugador</h3>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-electric/10 flex items-center justify-center border border-cyan-electric/20">
                          <Trophy className="w-4 h-4 text-cyan-electric" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-white uppercase tracking-tighter">{user?.user_metadata?.name || user?.email?.split('@')[0] || 'USUARIO'}</span>
                          <span className="text-[7px] font-mono text-cyan-electric uppercase tracking-widest">Nivel_Elite</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-magenta-accent uppercase tracking-tighter">1,150 MMR</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/40">Módulo_Seleccionado</h3>
                    {selectedGame ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="aspect-video rounded-xl overflow-hidden border border-white/10 relative group">
                          <img 
                            src={selectedGame.artwork_url || selectedGame.cover_url} 
                            alt={selectedGame.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-carbon/40 backdrop-blur-[2px]" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Gamepad2 className="w-8 h-8 text-cyan-electric/50" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-mono text-white uppercase tracking-tight leading-tight line-clamp-1">{selectedGame.title}</p>
                          <p className="text-[7px] font-mono text-white/40 uppercase tracking-widest">{selectedGame.system} // {selectedGame.year}</p>
                        </div>
                        
                        <button 
                          onClick={handleStartSearch}
                          disabled={isStarting}
                          className="w-full group relative overflow-hidden p-4 bg-cyan-electric text-carbon rounded-xl font-mono text-[10px] uppercase tracking-[0.2em] font-bold hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] transition-all disabled:opacity-50"
                        >
                          <div className="relative z-10 flex items-center justify-center gap-2">
                            {isStarting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sword className="w-4 h-4" />
                            )}
                            <span>Iniciar_Búsqueda</span>
                          </div>
                          <motion.div 
                            className="absolute inset-0 bg-white/20"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.5 }}
                          />
                        </button>
                      </motion.div>
                    ) : (
                      <div className="aspect-video rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-white/20">
                        <Gamepad2 className="w-8 h-8 opacity-20" />
                        <span className="text-[7px] font-mono uppercase tracking-widest">Seleccione_un_Módulo</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[7px] font-mono text-white/30 uppercase tracking-widest">
                      <Users className="w-3 h-3" />
                      <span>12 Jugadores en cola para este sector</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'searching' && (
            <motion.div 
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-12"
            >
              <div className="relative">
                <div className="w-48 h-48 rounded-full border-2 border-cyan-electric/20 flex items-center justify-center relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-t-2 border-cyan-electric"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-32 h-32 rounded-full bg-cyan-electric/10 flex items-center justify-center"
                  >
                    <Search className="w-12 h-12 text-cyan-electric" />
                  </motion.div>
                </div>
                
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute left-[-20%] right-[-20%] h-[1px] bg-cyan-electric/50 shadow-[0_0_10px_cyan]"
                />
              </div>

              <div className="text-center space-y-4">
                <h2 className="text-2xl font-mono text-white animate-pulse uppercase tracking-[0.2em] italic">
                  Buscando_Oponente
                </h2>
                <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest">
                  Expandiendo radio de búsqueda... Rango MMR: ±150
                </p>
              </div>

              <button 
                className="flex items-center gap-2 px-8 py-4 glass border border-red-500/30 text-red-500 rounded-xl font-mono text-[10px] uppercase hover:bg-red-500/10 transition-colors"
                onClick={cancelSearch}
              >
                <X className="w-4 h-4" />
                Abortar Búsqueda
              </button>
            </motion.div>
          )}

          {status === 'found' && (
            <motion.div 
              key="found"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
            >
              <div className="w-32 h-32 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-mono text-green-500 uppercase tracking-tighter italic">PARTIDA_CONFIRMADA</h2>
                <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest">Sincronizando enlace neural...</p>
              </div>
            </motion.div>
          )}

          {status === 'timeout' && (
            <motion.div 
              key="timeout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-12 rounded-3xl border border-yellow-500/30 text-center space-y-8 max-w-md mx-auto"
            >
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-mono text-yellow-500 uppercase tracking-tighter italic">Tiempo Agotado</h2>
                <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest">
                  No se detectaron adversarios compatibles en el sector actual.
                </p>
              </div>
              <button 
                className="w-full p-4 bg-yellow-500 text-carbon rounded-xl font-mono text-[10px] uppercase"
                onClick={() => cancelSearch()}
              >
                Reiniciar Búsqueda
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-12 rounded-3xl border border-red-500/30 text-center space-y-8 max-w-md mx-auto"
            >
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-mono text-red-500 uppercase tracking-tighter italic">Error del Sistema</h2>
                <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest">
                  {error}
                </p>
              </div>
              <button 
                className="w-full p-4 glass border border-white/10 rounded-xl font-mono text-[10px] uppercase"
                onClick={() => cancelSearch()}
              >
                Volver a la Base
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
