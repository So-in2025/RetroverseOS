import React, { useState } from 'react';
import { GAMES } from '../constants';
import { Game } from '../types';
import { useStore } from '../store';
import { Play, Search, Filter, Star, Clock, Gamepad2, Info, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Library: React.FC = () => {
  const { setGame, setPlaying } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | 'all'>('all');
  const [hoveredGame, setHoveredGame] = useState<Game | null>(null);

  const filteredGames = GAMES.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || game.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  const platforms = ['all', 'psx', 'n64', 'snes', 'nes', 'gba'];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-300 font-sans">
      {/* Top Navigation / Search */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Gamepad2 className="w-6 h-6 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight leading-none">RETROVERSE</span>
              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.2em] leading-none mt-1">OS v2.4.0</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
            {platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all duration-200 ${
                  selectedPlatform === platform
                    ? 'bg-white text-black shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="SEARCH THE VAULT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs font-mono tracking-wider focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all w-64 uppercase"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Game Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredGames.map((game) => (
                <motion.div
                  key={game.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onMouseEnter={() => setHoveredGame(game)}
                  onMouseLeave={() => setHoveredGame(null)}
                  className="group relative flex flex-col bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer"
                  onClick={() => {
                    setGame(game);
                    setPlaying(true);
                  }}
                >
                  {/* Cover Image */}
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img
                      src={game.coverUrl}
                      alt={game.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    
                    {/* Platform Badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md border border-white/10">
                      <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">{game.platform}</span>
                    </div>

                    {/* Play Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
                      <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-8 h-8 text-black fill-black ml-1" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{game.title}</h3>
                      <div className="flex items-center gap-1 text-emerald-500">
                        <Star className="w-3 h-3 fill-emerald-500" />
                        <span className="text-[10px] font-bold">{game.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{game.releaseYear}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-zinc-800" />
                      <span>ACTION / RPG</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <AnimatePresence>
          {hoveredGame && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-96 bg-zinc-900/80 backdrop-blur-xl border-l border-white/5 p-8 flex flex-col gap-8 hidden xl:flex"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Info className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Tactical Intel</span>
                </div>
                <h2 className="text-3xl font-bold text-white leading-tight">{hoveredGame.title}</h2>
                <p className="text-sm text-zinc-400 leading-relaxed italic">
                  "{hoveredGame.description}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Platform</span>
                  <span className="text-sm font-bold text-white uppercase">{hoveredGame.platform}</span>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Release</span>
                  <span className="text-sm font-bold text-white">{hoveredGame.releaseYear}</span>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Rating</span>
                  <span className="text-sm font-bold text-emerald-500">{hoveredGame.rating}/5.0</span>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Status</span>
                  <span className="text-sm font-bold text-blue-400 uppercase">Verified</span>
                </div>
              </div>

              <div className="mt-auto p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">READY TO DEPLOY</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <button
                  onClick={() => {
                    setGame(hoveredGame);
                    setPlaying(true);
                  }}
                  className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors shadow-xl shadow-emerald-500/20"
                >
                  LAUNCH MISSION <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Status Bar */}
      <div className="h-10 bg-black border-t border-white/5 px-6 flex items-center justify-between text-[10px] font-mono text-zinc-600">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>CORE ENGINE: STABLE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>NETWORK: ENCRYPTED</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span>LATENCY: 12ms</span>
          <span>UPTIME: 99.9%</span>
          <span className="text-zinc-400">© 2026 RETROVERSE OS</span>
        </div>
      </div>
    </div>
  );
};
