import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, Loader2, Trash2, Coins, Trophy, Play, Star, Disc, Gamepad2, Volume2, VolumeX, Heart, Zap, User, Users, Radio, Download } from 'lucide-react';
import { gameCatalog } from '../services/gameCatalog';
import { storage } from '../services/storage';
import { GameObject, ELITE_TOP_20 } from '../services/metadataNormalization';
import { DynamicCover } from '../components/library/DynamicCover';
import { DownloadButton } from '../components/library/DownloadButton';
import { AudioEngine } from '../services/audioEngine';
import { haptics } from '../services/haptics';
import GameSection from '../components/library/GameSection';
import { ExpandableTopList } from '../components/library/ExpandableTopList';
import { LiveRoomsList } from '../components/library/LiveRoomsList';
import { io } from 'socket.io-client';

const SYSTEM_FILTERS = [
  { id: 'All', name: 'TODAS', systems: [] },
  { id: 'nes', name: 'NINTENDO (NES)', systems: ['nes'] },
  { id: 'snes', name: 'SUPER NINTENDO', systems: ['snes'] },
  { id: 'n64', name: 'NINTENDO 64', systems: ['n64'] },
  { id: 'gameboy', name: 'GAME BOY', systems: ['gb', 'gbc', 'gba'] },
  { id: 'sega', name: 'SEGA', systems: ['sega_genesis', 'mastersystem', 'gamegear'] },
  { id: 'playstation', name: 'PLAYSTATION', systems: ['psx'] },
  { id: 'atari', name: 'ATARI', systems: ['atari_2600', 'atari_7800', 'lynx'] },
  { id: 'otras', name: 'OTRAS CONSOLAS', systems: ['pcengine', 'wonderswan', 'ngp'] },
];

import { LobbyList } from '../components/library/LobbyList';

export default function GameLibrary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<GameObject[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [playersFilter, setPlayersFilter] = useState<string>('All');
  const [credits, setCredits] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'discover' | 'carousel' | 'grid' | 'systems'>('discover');
  const [mobileTab, setMobileTab] = useState<'library' | 'search' | 'favorites' | 'downloaded'>('library');
  const [isIngesting, setIsIngesting] = useState(false);
  const [prevGameCount, setPrevGameCount] = useState(0);
  const [visibleMobileCount, setVisibleMobileCount] = useState(24);
  const [eliteTop20, setEliteTop20] = useState<GameObject[]>([]);
  const [specialFilter, setSpecialFilter] = useState<null | 'elite' | 'online'>(null);
  const [liveGames, setLiveGames] = useState<{ gameId: string, userId: string, timestamp: number }[]>([]);
  const [cachedGameIds, setCachedGameIds] = useState<Set<string>>(new Set());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const deferredGames = React.useDeferredValue(games);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Elite Top 20
  useEffect(() => {
    const elite = gameCatalog.getEliteTop20(); // This function returns 20 games
    setEliteTop20(elite);
  }, [deferredGames]);

  // Initialize Socket for Live Games
  useEffect(() => {
    const socket = io(window.location.origin);
    
    socket.on('live-games-update', (games) => {
      setLiveGames(games);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Sync mobileTab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'search' || tab === 'favorites') {
      setMobileTab(tab);
    } else {
      setMobileTab('library');
    }
    // Reset visible count when tab changes
    setVisibleMobileCount(24);
  }, [searchParams]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Carousel State
  const [selectedIndex, setSelectedIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const filteredGames = useMemo(() => {
    let result = deferredGames;

    // 0. Special Filters (Elite / Online)
    if (specialFilter === 'elite') {
      return gameCatalog.getEliteTop20();
    } else if (specialFilter === 'online') {
      // For now, simulate online games with a stable subset
      return deferredGames.filter((_, i) => (i * 7) % 10 > 7);
    }

    // 1. Filter by Tab (Mobile)
    if (mobileTab === 'favorites') {
      result = result.filter(g => gameCatalog.isFavorite(g.game_id));
    } else if (mobileTab === 'downloaded') {
      result = result.filter(g => cachedGameIds.has(g.game_id));
    }

    // 2. Filter by System
    if (selectedSystem === 'downloaded') {
      result = result.filter(g => cachedGameIds.has(g.game_id));
    } else if (selectedSystem !== 'All') {
      const filter = SYSTEM_FILTERS.find(f => f.id === selectedSystem);
      if (filter && filter.systems.length > 0) {
        result = result.filter(g => filter.systems.includes(g.system_id));
      } else {
        result = result.filter(g => g.system_id === selectedSystem);
      }
    }

    // 3. Filter by Search
    if (searchQuery) {
      result = result.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 4. Filter by Year
    if (yearFilter !== 'All') {
      result = result.filter(g => g.year && g.year.toString().startsWith(yearFilter));
    }

    // 5. Filter by Players
    if (playersFilter !== 'All') {
      if (playersFilter === '1') {
        result = result.filter(g => g.players === 1);
      } else if (playersFilter === '2+') {
        result = result.filter(g => g.players >= 2);
      }
    }

    return result;
  }, [games, selectedSystem, searchQuery, mobileTab, yearFilter, playersFilter, specialFilter]);

  // Optimized games by system grouping
  const gamesBySystem = useMemo(() => {
    if (!filteredGames.length) return {};
    
    const grouped: Record<string, GameObject[]> = {};
    for (let i = 0; i < filteredGames.length; i++) {
      const game = filteredGames[i];
      const sysName = game.system || 'OTRAS';
      if (!grouped[sysName]) grouped[sysName] = [];
      grouped[sysName].push(game);
    }
    return grouped;
  }, [filteredGames]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredGames.length === 0) return;
      
      if (e.key === 'ArrowRight') {
        setSelectedIndex(prev => {
          const next = Math.min(prev + 1, filteredGames.length - 1);
          if (next !== prev) {
            AudioEngine.playMoveSound();
            haptics.light();
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => {
          const next = Math.max(prev - 1, 0);
          if (next !== prev) {
            AudioEngine.playMoveSound();
            haptics.light();
          }
          return next;
        });
      } else if (e.key === 'Enter') {
        const game = filteredGames[selectedIndex];
        if (game) {
          AudioEngine.playSelectSound();
          if (viewMode === 'carousel') {
            navigate(`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredGames, viewMode, selectedIndex, navigate]);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'fetch_failed') {
      setErrorMsg('CONNECTION ERROR: Archive.org uplink failed.');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      setSearchParams(newParams);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadData = async () => {
      const c = await storage.getCredits();
      setCredits(c);

      await gameCatalog.init();
      const allGames = gameCatalog.getAllGames();
      setGames(allGames);
      setIsBgmPlaying(AudioEngine.getIsPlayingBGM());

      // Load cached ROMs metadata
      const cachedRoms = await storage.getAllCachedRomsMetadata();
      setCachedGameIds(new Set(cachedRoms.map(r => r.gameId)));
    };
    loadData();

    // Subscribe to real-time updates from the Mass Ingestion Protocol
    const unsubscribe = gameCatalog.subscribe((updatedGames) => {
      setGames(prev => {
        if (updatedGames.length > prev.length) {
          // Schedule side effect outside the render phase
          queueMicrotask(() => {
            setIsIngesting(true);
            setTimeout(() => setIsIngesting(false), 2000);
          });
        }
        setPrevGameCount(updatedGames.length);
        return updatedGames;
      });
    });

    return () => {
      unsubscribe();
      AudioEngine.stopBGM();
    };
  }, []);

  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [collapsedSystems, setCollapsedSystems] = useState<Set<string>>(new Set());

  const toggleSystem = (system: string) => {
    const next = new Set(collapsedSystems);
    if (next.has(system)) {
      next.delete(system);
    } else {
      next.add(system);
    }
    setCollapsedSystems(next);
  };

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIndex(0);
    setVisibleCounts({}); // Reset expanded state on filter change
    setCollapsedSystems(new Set()); // Reset collapsed state on filter change
    setVisibleMobileCount(24); // Reset mobile pagination
  }, [selectedSystem, searchQuery, mobileTab, specialFilter]);

  const heroGame = filteredGames[selectedIndex] || null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    try {
      const results = await gameCatalog.search(searchQuery, selectedSystem);
      await gameCatalog.addGames(results);
      setGames(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Error searching library:", error);
      setErrorMsg(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSearching(false);
    }
  };

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairResult, setRepairResult] = useState<string | null>(null);

  const handleClearCatalog = async () => {
    setShowPurgeModal(true);
  };

  const executePurge = async () => {
    await storage.clearCatalog();
    await storage.clearAllRoms();
    window.location.reload();
  };

  const handleForceRepair = async () => {
    setShowRepairModal(true);
  };

  const executeRepair = async () => {
    const games = await gameCatalog.getAllGames();
    let repaired = 0;
    for (const game of games) {
      if (game.compatibility_status === 'broken') {
        game.compatibility_status = 'untested';
        await gameCatalog.addGame(game);
        repaired++;
      }
    }
    setRepairResult(`Reparación completada. Se han restablecido ${repaired} juegos.`);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const toggleBgm = () => {
    const isPlaying = AudioEngine.toggleBGM();
    setIsBgmPlaying(isPlaying);
  };

  const handleGameClick = (index: number) => {
    if (index !== selectedIndex) {
      AudioEngine.playMoveSound();
      setSelectedIndex(index);
    } else {
      AudioEngine.playSelectSound();
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-black text-white overflow-hidden flex flex-col relative selection:bg-cyan-electric selection:text-black">
      {/* Dynamic Background based on Hero Game */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <AnimatePresence mode="wait">
          {heroGame && (heroGame.artwork_url || heroGame.cover_url) && (
            <motion.div
              key={heroGame.game_id}
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1.05 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: `url("${heroGame.artwork_url || heroGame.cover_url}")`,
                filter: 'blur(3px) brightness(0.8) saturate(1.2)'
              }}
            />
          )}
        </AnimatePresence>
        
        {/* Cinematic Gradient Overlays - Adjusted for MAXIMUM visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/10 to-transparent z-10" />
        
        {/* Noise Texture - Reduced Opacity */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay z-20" />
      </div>

      {/* Desktop Header */}
      <header className="hidden lg:flex relative z-20 px-8 py-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-12">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                <Gamepad2 className="w-8 h-8 text-cyan-electric" />
                RETROVERSE <span className="text-cyan-electric">OS</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl backdrop-blur-md border border-white/10">
              <button
                onClick={() => {
                  setViewMode('discover');
                  setSpecialFilter(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'discover' && !specialFilter
                    ? 'bg-cyan-electric text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/10'
                }`}
              >
                DESCUBRIR
              </button>
              <button
                onClick={() => {
                  setViewMode('carousel');
                  setSpecialFilter(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'carousel' 
                    ? 'bg-cyan-electric text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/10'
                }`}
              >
                PORTADAS
              </button>
              <button
                onClick={() => {
                  setViewMode('systems');
                  setSpecialFilter(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'systems' 
                    ? 'bg-cyan-electric text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/10'
                }`}
              >
                CONSOLAS
              </button>
            </div>
            
            {isOffline && (
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-lg animate-pulse">
                <Radio className="w-3 h-3 text-rose-500" />
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">MODO OFFLINE</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 justify-end">
          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/40 border rounded-xl transition-all duration-500 ${isIngesting ? 'border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.5)]' : 'border-white/10'}`}>
            <Gamepad2 className={`w-4 h-4 ${isIngesting ? 'text-cyan-electric animate-pulse' : 'text-cyan-electric'}`} />
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
              <span className={`font-bold transition-colors duration-300 ${isIngesting ? 'text-cyan-electric' : 'text-white'}`}>
                {games.length}
              </span> 
              TÍTULOS
              {isIngesting && (
                <motion.span 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[9px] text-cyan-electric ml-1"
                >
                  +NUEVO
                </motion.span>
              )}
            </span>
          </div>

          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-electric transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="BUSCAR..."
              className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 w-64 text-xs font-mono text-white focus:outline-none focus:border-cyan-electric/50 focus:w-80 transition-all"
            />
          </form>

          <div className="flex items-center gap-2">
             <button onClick={toggleBgm} className="p-2 text-zinc-400 hover:text-cyan-electric transition-colors" title="Toggle BGM">
               {isBgmPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
             </button>
             
             <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
               <Coins className="w-4 h-4 text-amber-500" />
               <span className="font-black text-amber-500 text-xs">{credits} CR</span>
             </div>
             
             <button onClick={handleClearCatalog} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors" title="Purge Cache">
               <Trash2 className="w-5 h-5" />
             </button>
             
             <button onClick={handleForceRepair} className="p-2 text-zinc-600 hover:text-cyan-electric transition-colors" title="Forzar Reparación Global">
               <Zap className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>
    </header>

      {/* Main Content Area */}
      <div className={`relative z-10 flex-1 flex flex-col overflow-hidden px-0 lg:px-8 max-w-7xl mx-auto w-full`}>
        
        {/* Desktop Category Selection - Compact Dropdown */}
        <div className="hidden lg:flex items-center justify-center py-4 z-30 shrink-0">
          <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 text-zinc-500">
              <Disc className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">SISTEMA:</span>
            </div>
            <select
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
              className="bg-transparent text-cyan-electric text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer hover:text-white transition-colors"
            >
              <option value="All" className="bg-zinc-900 text-white">TODAS LAS CONSOLAS</option>
              <option value="downloaded" className="bg-zinc-900 text-cyan-electric font-bold italic">★ BAJADOS (LOCAL)</option>
              {SYSTEM_FILTERS.filter(f => f.id !== 'All').map(sys => (
                <option key={sys.id} value={sys.id} className="bg-zinc-900 text-white">
                  {sys.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Hero Info */}
        <div className="hidden lg:flex flex-col items-center justify-center mb-4 z-20 pointer-events-none h-[160px] w-full shrink-0">
          <AnimatePresence mode="wait">
            {heroGame ? (
              <motion.div 
                key={heroGame.game_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center space-y-2 w-full px-8"
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                    {heroGame.system}
                  </span>
                  <span className="px-3 py-1 bg-cyan-electric/10 border border-cyan-electric/20 rounded text-[10px] font-black uppercase tracking-widest text-cyan-electric shadow-lg">
                    {heroGame.year || 'UNKNOWN'}
                  </span>
                  {heroGame.players > 1 && (
                    <span className="px-3 py-1 bg-magenta-accent/10 border border-magenta-accent/20 rounded text-[10px] font-black uppercase tracking-widest text-magenta-accent shadow-lg">
                      MULTIPLAYER
                    </span>
                  )}
                </div>

                <div className="h-24 flex items-center justify-center w-full">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] max-w-6xl mx-auto line-clamp-2 text-center px-4 w-full">
                    {heroGame.title}
                  </h2>
                </div>
              </motion.div>
            ) : (
              <div className="h-24 flex items-center text-zinc-500 font-mono text-sm uppercase tracking-widest">
                {isSearching ? "ESCANER ARCHIVOS..." : "SELECCIONA UN CARTUCHO"}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Main View Title Overlay - Removed as requested */}

        {/* Desktop View: Carousel or Systems Grid */}
        <div className="w-full flex-1 relative flex flex-col overflow-hidden min-h-0">
            
            <div className="w-full h-full relative min-h-0">
              {isSearching ? (
                <div className="flex items-center gap-4 text-cyan-electric animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="font-black uppercase tracking-widest">Decrypting Data...</span>
                </div>
              ) : filteredGames.length > 0 ? (
                <>
                {/* Mobile List View - Optimized with Pagination */}
                <div className="lg:hidden w-full h-full pb-32 px-4 overflow-y-auto hide-scrollbar pt-4 overscroll-contain">
                  {/* Mobile System Filter (Native-like Pill Scroll) */}
                  <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide shrink-0">
                    <button
                      onClick={() => {
                        haptics.light();
                        setSelectedSystem('All');
                        setMobileTab('library');
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                        selectedSystem === 'All' && mobileTab === 'library'
                          ? 'bg-cyan-electric text-black border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                          : 'bg-zinc-900 text-zinc-500 border-white/5'
                      }`}
                    >
                      TODOS
                    </button>
                    <button
                      onClick={() => {
                        haptics.light();
                        setSelectedSystem('downloaded');
                        setMobileTab('downloaded');
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                        selectedSystem === 'downloaded' || mobileTab === 'downloaded'
                          ? 'bg-cyan-electric text-black border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                          : 'bg-zinc-900 text-cyan-electric/60 border-cyan-electric/20'
                      }`}
                    >
                      ★ BAJADOS
                    </button>
                    {SYSTEM_FILTERS.filter(f => f.id !== 'All').map(sys => (
                      <button
                        key={sys.id}
                        onClick={() => {
                          haptics.light();
                          setSelectedSystem(sys.id);
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                          selectedSystem === sys.id
                            ? 'bg-cyan-electric text-black border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                            : 'bg-zinc-900 text-zinc-500 border-white/5'
                        }`}
                      >
                        {sys.name}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredGames.slice(0, visibleMobileCount).map((game) => (
                      <div 
                        key={game.game_id}
                        className="flex flex-col gap-3 bg-zinc-900/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-lg relative group"
                      >
                        <div className="flex items-start gap-4">
                          <Link 
                            to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}
                            onClick={() => AudioEngine.playSelectSound()}
                            className="w-20 h-28 flex-shrink-0 bg-black rounded-xl overflow-hidden border border-white/10 shadow-lg relative"
                          >
                             <DynamicCover 
                                game_id={game.game_id}
                                src={game.cover_url || game.artwork_url} 
                                alt={game.title}
                                title={game.title}
                                system={game.system}
                                className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          </Link>
                          
                          <div className="flex-1 min-w-0 flex flex-col h-full py-1">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black bg-white/10 text-cyan-electric px-2 py-0.5 rounded-md uppercase tracking-wider border border-white/5 shadow-sm">
                                  {game.system}
                                </span>
                                {game.year && (
                                  <span className="text-[10px] font-mono text-zinc-500">
                                    {game.year}
                                  </span>
                                )}
                              </div>
                              <DownloadButton 
                                gameId={game.game_id} 
                                romUrl={game.rom_url} 
                                systemId={game.system_id}
                                onStatusChange={(isCached) => {
                                  if (isCached) {
                                    setCachedGameIds(prev => new Set([...prev, game.game_id]));
                                  } else {
                                    setCachedGameIds(prev => {
                                      const next = new Set(prev);
                                      next.delete(game.game_id);
                                      return next;
                                    });
                                  }
                                }}
                              />
                            </div>
                            <h3 className="text-white font-black text-base leading-tight line-clamp-2 mb-1 tracking-tight italic">
                              {game.title}
                            </h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                              {game.developer || game.publisher || 'Unknown'}
                            </p>
                          </div>
                        </div>

                        {/* Mobile Action Buttons */}
                        <div className="flex items-center gap-3 mt-1">
                          <Link 
                            to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}
                            onClick={() => AudioEngine.playSelectSound()}
                            className="flex-1 py-2 bg-cyan-electric text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 active:scale-95"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            JUGAR
                          </Link>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add favorite logic
                            }}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center active:scale-95"
                          >
                            <Heart className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load More Button for Mobile */}
                  {filteredGames.length > visibleMobileCount && (
                    <div className="flex justify-center pt-4 pb-8">
                      <button 
                        onClick={() => setVisibleMobileCount(prev => prev + 24)}
                        className="px-8 py-3 bg-zinc-900 border border-white/10 text-cyan-electric rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        DESCIFRAR MÁS TÍTULOS
                      </button>
                    </div>
                  )}
                </div>

                {/* Desktop: Discover View */}
                {viewMode === 'discover' && (
                  <div className="hidden md:flex flex-col w-full h-full overflow-y-auto hide-scrollbar pb-32 pt-4 px-4 md:px-8 space-y-12 pointer-events-auto">
                    
                    {/* Elite Top 20 Section - FORCED UPDATE */}
                    <ExpandableTopList 
                      title={`ELITE TOP 20: SELECCIÓN MAESTRA`} 
                      games={eliteTop20} 
                    />

                    <div className="h-px w-full bg-white/5" />

                    {/* Live Matchmaking Section */}
                    {liveGames.length > 0 && (
                      <GameSection 
                        title="EMPAREJAMIENTO EN VIVO" 
                        games={liveGames.map(lg => games.find(g => g.game_id === lg.gameId)).filter(Boolean) as GameObject[]} 
                        variant="live"
                      />
                    )}

                    {/* Multiplayer Lobbies Section */}
                    <LobbyList />

                    <div className="h-px w-full bg-white/5" />

                    {/* Online Now / Spectate Section */}
                    <LiveRoomsList 
                      title="EN LÍNEA AHORA" 
                      games={deferredGames} 
                    />
                  </div>
                )}

                {/* Desktop: Carousel View (PORTADAS) */}
                {viewMode === 'carousel' && (
                  <div className="hidden md:flex flex-col w-full h-full relative overflow-hidden">
                    <div 
                      ref={carouselRef}
                      className="flex-1 flex items-center justify-center relative perspective-[1200px] transform-style-3d"
                    >
                      <div className="relative w-full h-full flex items-center justify-center">
                        {filteredGames.slice(Math.max(0, selectedIndex - 4), selectedIndex + 5).map((game, i) => {
                          const actualIndex = Math.max(0, selectedIndex - 4) + i;
                          const isSelected = actualIndex === selectedIndex;
                          const distance = Math.abs(actualIndex - selectedIndex);
                          
                          return (
                            <motion.div
                              key={game.game_id}
                              initial={false}
                              animate={{
                                scale: isSelected ? 1.2 : 0.85 - (distance * 0.1),
                                x: (actualIndex - selectedIndex) * 260,
                                z: isSelected ? 100 : -300 - (distance * 150),
                                rotateY: (actualIndex - selectedIndex) * -25,
                                opacity: Math.max(0, 1 - (distance * 0.25)),
                                filter: isSelected ? 'brightness(1.1)' : `brightness(${0.5 - (distance * 0.1)})`,
                              }}
                              transition={{ 
                                type: 'spring', 
                                stiffness: 800, 
                                damping: 50,
                                mass: 0.4
                              }}
                              onClick={() => handleGameClick(actualIndex)}
                              className={`absolute w-60 aspect-[2/3] shrink-0 cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-500 ${
                                isSelected 
                                  ? 'border-cyan-electric shadow-[0_0_60px_rgba(0,242,255,0.6),inset_0_0_20px_rgba(0,242,255,0.2)] z-50' 
                                  : 'border-white/5 z-0'
                              }`}
                            >
                              <DynamicCover 
                                game_id={game.game_id}
                                src={game.cover_url || game.artwork_url} 
                                alt={game.title}
                                title={game.title}
                                system={game.system}
                                className="w-full h-full object-cover"
                              />
                              
                              {/* Reflection Effect */}
                              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                              
                              {isSelected && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-8"
                                >
                                  <div className="mb-4">
                                    <span className="text-[10px] font-black text-cyan-electric uppercase tracking-[0.2em] mb-1 block drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]">
                                      {game.system}
                                    </span>
                                    <h3 className="text-2xl font-black text-white uppercase italic leading-tight tracking-tighter line-clamp-2">
                                      {game.title}
                                    </h3>
                                  </div>
                                  <Link 
                                    to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}
                                    className="w-full py-4 bg-cyan-electric text-black rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,242,255,0.5)] hover:scale-105 active:scale-95 transition-all"
                                  >
                                    <Play className="w-5 h-5 fill-current" /> INICIAR ENLACE
                                  </Link>
                                </motion.div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Carousel Navigation Hints & Buttons */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 z-30">
                      <button 
                        onClick={() => {
                          setSelectedIndex(prev => {
                            const next = Math.max(0, prev - 1);
                            if (next !== prev) {
                              AudioEngine.playMoveSound();
                              haptics.light();
                            }
                            return next;
                          });
                        }}
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all active:scale-90"
                      >
                        <span className="text-xl">←</span>
                      </button>

                      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">USAR</span>
                        <div className="flex gap-1">
                          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-mono text-white">←</span>
                          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-mono text-white">→</span>
                        </div>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">PARA NAVEGAR</span>
                      </div>

                      <button 
                        onClick={() => {
                          setSelectedIndex(prev => {
                            const next = Math.min(filteredGames.length - 1, prev + 1);
                            if (next !== prev) {
                              AudioEngine.playMoveSound();
                              haptics.light();
                            }
                            return next;
                          });
                        }}
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all active:scale-90"
                      >
                        <span className="text-xl">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Desktop: Systems Grid View */}
                {viewMode === 'systems' && (
                  <div className="hidden md:flex flex-col w-full h-full min-h-0">
                    {/* Systems Filters & Stats */}
                    <div className="flex items-center justify-between py-6 shrink-0 border-b border-white/5 px-4 lg:px-0">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">
                            BASE DE DATOS <span className="text-cyan-electric">DE SISTEMA</span>
                          </h2>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                            {filteredGames.length} TÍTULOS ASEGURADOS EN EL SECTOR
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <select 
                          className="bg-zinc-900 border border-white/10 text-white text-[10px] font-mono px-4 py-2 rounded-xl focus:outline-none focus:border-cyan-electric transition-all hover:border-white/30"
                          value={playersFilter}
                          onChange={(e) => setPlayersFilter(e.target.value)}
                        >
                          <option value="All">TODOS LOS JUGADORES</option>
                          <option value="1">1 JUGADOR</option>
                          <option value="2+">MULTIJUGADOR</option>
                        </select>
                        <select 
                          className="bg-zinc-900 border border-white/10 text-white text-[10px] font-mono px-4 py-2 rounded-xl focus:outline-none focus:border-cyan-electric transition-all hover:border-white/30"
                          value={yearFilter}
                          onChange={(e) => setYearFilter(e.target.value)}
                        >
                          <option value="All">TODOS LOS AÑOS</option>
                          <option value="198">AÑOS 80</option>
                          <option value="199">AÑOS 90</option>
                          <option value="200">AÑOS 2000</option>
                        </select>
                      </div>
                    </div>

                    {/* Grid Content */}
                    <div className="flex-1 overflow-y-auto pb-32 pt-6 px-4 lg:px-0 hide-scrollbar min-h-0">
                      {(() => {
                        return (
                          <div className="space-y-12">
                            {SYSTEM_FILTERS.filter(f => f.id !== 'All').map(filter => {
                              const sysGames = filteredGames.filter(game => 
                                filter.systems.length === 0 ? true : filter.systems.includes(game.system_id)
                              );
                              
                              if (sysGames.length === 0) return null;

                              const sysName = filter.name;
                              const visibleCount = visibleCounts[filter.id] || 48;
                              const visibleGames = sysGames.slice(0, visibleCount);
                              const hasMore = sysGames.length > visibleCount;

                              return (
                                <div key={filter.id} className="space-y-6 animate-in fade-in duration-500">
                                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 cursor-pointer" onClick={() => toggleSystem(filter.id)}>
                                    <div className="flex items-center gap-4">
                                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-cyan-electric">
                                        {sysName} BASE DE DATOS
                                      </h3>
                                      <span className="text-xs font-mono text-zinc-500 bg-white/5 px-2 py-1 rounded">
                                        {sysGames.length} TÍTULOS ASEGURADOS
                                      </span>
                                    </div>
                                    <button className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-cyan-electric transition-colors">
                                      {collapsedSystems.has(filter.id) ? 'EXPANDIR' : 'CONTRAER'}
                                    </button>
                                  </div>
                                  
                                  {!collapsedSystems.has(filter.id) && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 lg:gap-6">
                                      {visibleGames.map((game) => (
                                        <Link 
                                          key={game.game_id}
                                          to={`/play/${game.game_id}?url=${encodeURIComponent(game.rom_url)}&system=${game.system_id}`}
                                          onClick={() => AudioEngine.playSelectSound()}
                                          className="group relative aspect-[2/3] bg-zinc-900 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-electric hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all"
                                        >
                                          <DynamicCover 
                                             game_id={game.game_id}
                                             src={game.cover_url || game.artwork_url} 
                                             alt={game.title}
                                             title={game.title}
                                             system={game.system}
                                             className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                                           />
                                           <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
                                              <Play className="w-10 h-10 text-cyan-electric fill-current mb-3 drop-shadow-[0_0_10px_rgba(0,242,255,0.8)] transform scale-90 group-hover:scale-100 transition-transform" />
                                              <h4 className="font-black text-xs uppercase tracking-tight leading-tight text-white mb-2">
                                                {game.title}
                                              </h4>
                                              <DownloadButton 
                                                gameId={game.game_id} 
                                                romUrl={game.rom_url} 
                                                systemId={game.system_id}
                                                onStatusChange={(isCached) => {
                                                  if (isCached) {
                                                    setCachedGameIds(prev => new Set([...prev, game.game_id]));
                                                  } else {
                                                    setCachedGameIds(prev => {
                                                      const next = new Set(prev);
                                                      next.delete(game.game_id);
                                                      return next;
                                                    });
                                                  }
                                                }}
                                              />
                                           </div>
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {!collapsedSystems.has(filter.id) && hasMore && (
                                    <div className="flex justify-center mt-8 pb-8">
                                       <button 
                                         onClick={() => setVisibleCounts(prev => ({...prev, [filter.id]: (prev[filter.id] || 48) + 48}))}
                                         className="px-8 py-3 bg-zinc-900 border border-white/10 hover:border-cyan-electric hover:text-cyan-electric text-zinc-400 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
                                       >
                                         <Zap className="w-4 h-4" />
                                         DESCIFRAR MÁS TÍTULOS ({sysGames.length - visibleCount} RESTANTES)
                                       </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-12 py-8 border border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-4 text-zinc-500">
                <Disc className="w-8 h-8 opacity-50" />
                <span className="text-xs font-mono uppercase tracking-widest">ARCHIVO SIN CONEXIÓN. INSERTE MANUALMENTE EL CARTUCHO O SINCRONICE CON LA RED.</span>
              </div>
            )}
            </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - REMOVED (Moved to Global MobileNavbar) */}
      {/* Mobile Settings Modal - REMOVED (Moved to Global MobileNavbar) */}
      
      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {mobileTab === 'search' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="lg:hidden absolute inset-0 bg-black/95 z-40 flex flex-col p-6 pt-20"
          >
            <div className="flex items-center gap-4 mb-8">
              <Search className="w-6 h-6 text-cyan-electric" />
              <input 
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="BUSCAR EN LA BASE DE DATOS..."
                className="bg-transparent border-b-2 border-white/20 w-full py-2 text-xl font-black text-white focus:outline-none focus:border-cyan-electric placeholder:text-zinc-700 uppercase italic"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {searchQuery && filteredGames.length === 0 && (
                <div className="text-zinc-500 text-center mt-12 font-mono text-sm">NO SE ENCONTRARON COINCIDENCIAS EN EL SECTOR 7G</div>
              )}
            </div>
            
            <button 
              onClick={() => {
                setMobileTab('library');
                setSearchParams({});
              }}
              className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-20 md:bottom-8 right-8 bg-rose-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 font-bold uppercase tracking-wide z-50"
          >
            <AlertTriangle className="w-6 h-6" />
            {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-4 hover:bg-white/20 p-1 rounded">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purge Modal */}
      <AnimatePresence>
        {showPurgeModal && (
          <motion.div
            key="purge-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-rose-500">
                <AlertTriangle className="w-8 h-8" />
                <h2 className="text-xl font-black uppercase tracking-widest">¿Purgar Caché Total?</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-6">
                Esto borrará el catálogo y <strong>todas las ROMs descargadas</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPurgeModal(false)}
                  className="px-4 py-2 rounded-lg font-bold text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={executePurge}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  PURGAR AHORA
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repair Modal */}
      <AnimatePresence>
        {showRepairModal && (
          <motion.div
            key="repair-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-cyan-electric/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-cyan-electric">
                <Zap className="w-8 h-8" />
                <h2 className="text-xl font-black uppercase tracking-widest">¿Forzar Reparación Global?</h2>
              </div>
              
              {repairResult ? (
                <div className="text-emerald-400 text-sm mb-6 font-mono">
                  {repairResult}
                  <br/><br/>Reiniciando sistema...
                </div>
              ) : (
                <>
                  <p className="text-zinc-400 text-sm mb-6">
                    Esto restablecerá todos los juegos "rotos" para que el sistema intente descargarlos de nuevo.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowRepairModal(false)}
                      className="px-4 py-2 rounded-lg font-bold text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={executeRepair}
                      className="px-4 py-2 rounded-lg font-bold text-sm bg-cyan-electric text-black hover:bg-cyan-400 transition-colors"
                    >
                      REPARAR
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
