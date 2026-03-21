import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Search, 
  Download, 
  ShieldCheck, 
  Zap, 
  HardDrive, 
  Cpu, 
  Globe, 
  AlertTriangle,
  Loader2,
  ChevronRight,
  Play,
  Info
} from 'lucide-react';
import { gameCatalog } from '../services/gameCatalog';
import { MetadataNormalizationEngine, GameObject } from '../services/metadataNormalization';
import { GameCover } from '../components/library/GameCover';

const PREMIUM_SYSTEMS = [
  { id: 'ps2', name: 'PlayStation 2', icon: '🎮', color: 'blue' },
  { id: 'ps3', name: 'PlayStation 3', icon: '💿', color: 'red' },
  { id: 'xbox', name: 'Xbox', icon: '💚', color: 'green' },
  { id: 'switch', name: 'Nintendo Switch', icon: '🔴', color: 'red' },
  { id: 'wii', name: 'Wii', icon: '⚪', color: 'zinc' },
];

export default function PremiumVault() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('ps2');
  const [results, setResults] = useState<GameObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      // In a real app, this would query a backend that indexes Archive.org
      // For this demo, we'll simulate finding some high-end games
      const simulatedResults: GameObject[] = [
        {
          game_id: `${selectedSystem}-god-of-war`,
          title: `God of War (${selectedSystem.toUpperCase()})`,
          system: selectedSystem,
          system_id: selectedSystem,
          cover_url: `https://picsum.photos/seed/${selectedSystem}1/400/600`,
          rom_url: `archive:${selectedSystem}-gow-collection`,
          description: 'Experiencia premium de alta fidelidad.',
          emulator_core: selectedSystem === 'ps2' ? 'pcsx2' : 'rpcs3',
          compatibility_status: 'compatible',
          year: 2005,
          publisher: 'Sony',
          developer: 'Santa Monica',
          players: 1,
          rom_size: 4300000000,
          artwork_url: null,
          checksum: 'dummy-checksum-1'
        },
        {
          game_id: `${selectedSystem}-halo`,
          title: `Halo: Combat Evolved (${selectedSystem.toUpperCase()})`,
          system: selectedSystem,
          system_id: selectedSystem,
          cover_url: `https://picsum.photos/seed/${selectedSystem}2/400/600`,
          rom_url: `archive:${selectedSystem}-halo-ce`,
          description: 'Clásico legendario optimizado para la Red.',
          emulator_core: 'xemu',
          compatibility_status: 'compatible',
          year: 2001,
          publisher: 'Microsoft',
          developer: 'Bungie',
          players: 4,
          rom_size: 4300000000,
          artwork_url: null,
          checksum: 'dummy-checksum-2'
        }
      ];
      setResults(simulatedResults);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (game: GameObject) => {
    setDownloadingId(game.game_id);
    try {
      const identifier = game.rom_url.replace('archive:', '');
      const resolvedUrl = await MetadataNormalizationEngine.resolveRomUrl(identifier, game.system_id);
      if (resolvedUrl) {
        // In a real app, we'd trigger a download manager or stream it
        window.open(resolvedUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:pl-28">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-cyan-electric/20 rounded-2xl border border-cyan-electric/30 shadow-[0_0_20px_rgba(0,242,255,0.2)]">
                <Database className="w-8 h-8 text-cyan-electric" />
              </div>
              <div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter">BÓVEDA <span className="text-cyan-electric">PREMIUM</span></h1>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Acceso de Nivel 5: Sistemas de Alta Fidelidad</p>
              </div>
            </div>
            <p className="text-zinc-400 max-w-2xl text-sm leading-relaxed">
              Explora el catálogo definitivo de consolas de sexta y séptima generación. 
              Nuestra tecnología de <span className="text-emerald-400 font-bold">Edge Computing</span> permite gestionar descargas masivas y emulación de alto rendimiento directamente desde la Red.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado del Servidor</p>
              <p className="text-xs font-black text-emerald-500 uppercase tracking-tight">ÓPTIMO / 1.2 GBPS</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="bg-zinc-900/30 border border-white/10 p-2 rounded-3xl backdrop-blur-2xl flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="BUSCAR TÍTULO PREMIUM (EJ: GOD OF WAR, HALO, SMASH...)"
              className="w-full bg-transparent border-none pl-14 pr-6 py-5 text-sm font-bold uppercase tracking-widest focus:ring-0 placeholder:text-zinc-700"
            />
          </div>
          <div className="flex gap-2 p-2 bg-black/40 rounded-2xl overflow-x-auto hide-scrollbar">
            {PREMIUM_SYSTEMS.map((sys) => (
              <button
                key={sys.id}
                onClick={() => setSelectedSystem(sys.id)}
                className={`
                  px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2
                  ${selectedSystem === sys.id 
                    ? 'bg-white text-black shadow-xl' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'}
                `}
              >
                <span>{sys.icon}</span>
                {sys.name}
              </button>
            ))}
          </div>
          <button 
            onClick={handleSearch}
            className="px-10 py-5 bg-cyan-electric text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cyan-electric/80 transition-all shadow-[0_0_30px_rgba(0,242,255,0.3)]"
          >
            LOCALIZAR
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-12 h-12 text-cyan-electric animate-spin" />
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest animate-pulse">Sincronizando con la Bóveda de Archive.org...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {results.map((game) => (
              <motion.div
                key={game.game_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-zinc-900/40 border border-white/10 rounded-3xl overflow-hidden hover:border-cyan-electric/50 transition-all"
              >
                <div className="aspect-[16/9] relative overflow-hidden">
                  <GameCover 
                    gameId={game.game_id}
                    primaryUrl={game.cover_url}
                    title={game.title}
                    systemId={game.system_id}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[8px] font-black text-white border border-white/10 uppercase tracking-widest">
                      {game.system_id}
                    </span>
                    <span className="px-3 py-1 bg-cyan-electric/20 backdrop-blur-md rounded-lg text-[8px] font-black text-cyan-electric border border-cyan-electric/30 uppercase tracking-widest">
                      PREMIUM
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2 group-hover:text-cyan-electric transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-zinc-500 text-xs mb-6 line-clamp-2 uppercase font-bold leading-relaxed">
                    {game.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleDownload(game)}
                      disabled={downloadingId === game.game_id}
                      className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      {downloadingId === game.game_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {downloadingId === game.game_id ? 'VERIFICANDO...' : 'DESCARGAR'}
                    </button>
                    <button className="flex items-center justify-center gap-2 py-3 bg-cyan-electric/10 hover:bg-cyan-electric/20 border border-cyan-electric/20 text-cyan-electric rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      <Play className="w-4 h-4 fill-current" /> JUGAR
                    </button>
                  </div>
                </div>

                {/* Technical Specs Overlay */}
                <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-xl p-8 opacity-0 group-hover:opacity-0 transition-opacity flex flex-col justify-center">
                  <h4 className="text-cyan-electric font-black text-xs uppercase tracking-widest mb-6">Especificaciones de Enlace</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Núcleo</span>
                      <span className="text-[10px] text-white font-black uppercase">{game.emulator_core}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Tamaño</span>
                      <span className="text-[10px] text-white font-black uppercase">~4.3 GB</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Latencia</span>
                      <span className="text-[10px] text-emerald-500 font-black uppercase">BAJA (P2P)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-8 border border-white/5">
              <HardDrive className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-4">SINCRONIZACIÓN REQUERIDA</h2>
            <p className="text-zinc-500 max-w-md text-sm uppercase font-bold tracking-widest leading-relaxed">
              Introduce un término de búsqueda para localizar recursos en la Bóveda de Archive.org.
            </p>
          </div>
        )}
      </div>

      {/* Security Footer */}
      <div className="max-w-7xl mx-auto mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Enlace Encriptado</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-electric" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Optimización de Núcleo</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-magenta-accent" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Red Global P2P</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 px-6 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">
            AVISO: Los juegos de alta fidelidad requieren una conexión de +50MB para una experiencia fluida.
          </p>
        </div>
      </div>
    </div>
  );
}
