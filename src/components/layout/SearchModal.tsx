import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Gamepad2, Users, Trophy, ArrowRight, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { gameCatalog } from '../../services/gameCatalog';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const games = gameCatalog.getAllGames().filter(g => 
      g.title.toLowerCase().includes(query.toLowerCase()) ||
      g.system.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    setResults(games);
  }, [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/5 flex items-center gap-4">
              <Search className="w-5 h-5 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar juegos, jugadores o sistemas..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-600 text-lg font-medium"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded text-[10px] font-black text-zinc-500 border border-white/5">
                <Command className="w-3 h-3" />
                <span>ESC</span>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
              {query.trim() === '' ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <Search className="w-6 h-6 text-zinc-500" />
                  </div>
                  <p className="text-zinc-400 font-medium">Comienza a escribir para buscar en la red Dominion</p>
                  <p className="text-zinc-600 text-xs mt-2">Encuentra juegos, torneos u otros ronins</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Juegos Encontrados</div>
                  {results.map((game) => (
                    <button
                      key={game.game_id}
                      onClick={() => handleSelect(`/game/${game.game_id}`)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 border border-white/10 flex-shrink-0">
                        <img src={game.cover_url} alt={game.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{game.title}</h4>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{game.system}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-zinc-500 font-medium">No se encontraron resultados para "{query}"</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-950/50 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  <Users className="w-3 h-3" />
                  <span>Buscar Jugadores</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  <Trophy className="w-3 h-3" />
                  <span>Buscar Eventos</span>
                </div>
              </div>
              <div className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest italic">
                Dominion OS v2.4.0
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
