import React, { useState, useEffect, useMemo } from 'react';
import { Gamepad2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import localforage from 'localforage';
import { CoverService } from '../../services/coverService';
import { ImageCache } from '../../services/imageCache';

// Configurar localforage para covers
const coverStore = localforage.createInstance({
  name: 'retroverse-covers',
  storeName: 'resolved-urls'
});

interface GameCoverProps {
  gameId: string;
  archiveId?: string;
  title: string;
  systemId: string;
  primaryUrl?: string | null;
  className?: string;
  aspectRatio?: 'portrait' | 'square' | 'landscape';
  showLoading?: boolean;
}

/**
 * GameCover con Cascada de Fuentes y Cache Local Persistente
 */
export const GameCover: React.FC<GameCoverProps> = ({
  gameId,
  archiveId,
  title,
  systemId,
  primaryUrl,
  className = "",
  aspectRatio = 'portrait',
  showLoading = true
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [isCached, setIsCached] = useState(false);

  // Generar lista de fuentes (memoizado para evitar re-cálculos innecesarios)
  const sources = useMemo(() => {
    return CoverService.getCoverSources(title, systemId, archiveId || gameId, primaryUrl);
  }, [title, systemId, archiveId, gameId, primaryUrl]);

  // Cargar desde cache al montar
  useEffect(() => {
    let isMounted = true;
    
    // Reset state immediately when gameId changes to avoid showing old data
    setSourceIndex(0);
    setCurrentSrc(null);
    setStatus('loading');
    setIsCached(false);
    
    const checkCache = async () => {
      try {
        const cachedUrl = await coverStore.getItem<string>(gameId);
        if (cachedUrl && isMounted) {
          setCurrentSrc(cachedUrl);
          setStatus('success');
          setIsCached(true);
          return true;
        }
      } catch (e) {
        console.error('[CoverCache] Error reading cache:', e);
      }
      return false;
    };

    checkCache().then(found => {
      if (!found && isMounted) {
        setStatus('loading');
      }
    });

    return () => { isMounted = false; };
  }, [gameId, title]); // Added title to reset if title changes for same ID

  useEffect(() => {
    // Si ya cargamos de cache, no hacemos nada
    if (isCached || status === 'success') return;

    if (!sources || sources.length === 0) {
      console.warn(`[Cover] No sources generated for ${title}`);
      setStatus('error');
      return;
    }

    if (sourceIndex >= sources.length) {
      setStatus('error');
      return;
    }

    const url = sources[sourceIndex];
    // Silenced debug log for source attempts

    // Intentar cargar a través del cache de imágenes (blob URL)
    const loadWithCache = async () => {
      if (url && !url.startsWith('/') && !url.startsWith('blob:')) {
        try {
          const cachedUrl = await ImageCache.getImage(url);
          if (cachedUrl && cachedUrl.startsWith('blob:')) {
            setCurrentSrc(cachedUrl);
            return;
          }
        } catch (e) {
          // Silent fail for cache, fallback to direct
        }
      }
      setCurrentSrc(url);
    };

    loadWithCache();

    // Timeout de seguridad: si una imagen tarda más de 8s en cargar o fallar, forzamos el siguiente intento
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        console.warn(`[Cover] Timeout (8s) for ${title} at source ${sourceIndex + 1}: ${url}`);
        handleError();
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [sourceIndex, sources, isCached, status, title]);

  const handleError = () => {
    const failedUrl = sources[sourceIndex];
    console.warn(`[Cover] Failed to load source ${sourceIndex + 1}/${sources.length} for ${title}: ${failedUrl}`);

    // Si falló una URL que estaba en cache, la borramos y reiniciamos cascada
    if (isCached) {
      console.debug(`[Cover] Cached URL failed, clearing cache for ${gameId}`);
      coverStore.removeItem(gameId);
      setIsCached(false);
      setSourceIndex(0);
      setStatus('loading');
      return;
    }

    if (sourceIndex < sources.length - 1) {
      setSourceIndex(prev => prev + 1);
    } else {
      console.error(`[Cover] All ${sources.length} sources failed for ${title}`);
      setStatus('error');
    }
  };

  const handleLoad = () => {
    if (status !== 'success') {
      setStatus('success');
      
      // Guardar URL exitosa en cache persistente (la URL original, no el blob)
      const originalUrl = sources[sourceIndex];
      if (originalUrl && !isCached) {
        coverStore.setItem(gameId, originalUrl).catch(e => {
          console.error('[CoverCache] Error saving to cache:', e);
        });
      }
    }
  };

  const aspectClasses = {
    portrait: 'aspect-[2/3]',
    square: 'aspect-square',
    landscape: 'aspect-video'
  };

  return (
    <div className={`relative overflow-hidden bg-zinc-900/50 group shadow-2xl ${aspectClasses[aspectRatio]} ${className}`}>
      {/* Reflection Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-10" />
      
      {status === 'loading' && showLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin opacity-20" />
        </div>
      )}

      {status === 'error' ? (
        <motion.div 
          key="placeholder"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)`,
          }}
        >
          {/* Retro Grid Background */}
          <div className="absolute inset-0 opacity-10" 
            style={{ 
              backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }} 
          />
          
          {/* Decorative Elements */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,255,255,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-shimmer" />
          
          {/* Top Bar (System Specific Color) */}
          <div className={`absolute top-0 left-0 w-full h-1.5 shadow-[0_0_15px_rgba(0,242,255,0.5)] ${
            systemId.includes('nintendo') || systemId.includes('nes') || systemId.includes('snes') ? 'bg-red-600' :
            systemId.includes('sega') || systemId.includes('genesis') ? 'bg-blue-600' :
            systemId.includes('sony') || systemId.includes('ps') ? 'bg-zinc-400' :
            'bg-cyan-electric'
          }`} />

          {/* Center Icon */}
          <div className="relative z-10 mb-4 p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <Gamepad2 className="w-10 h-10 text-white/40" />
          </div>

          {/* Title with Retro Typography */}
          <div className="relative z-10 px-4 text-center">
            <h3 className="text-white font-black uppercase tracking-tighter text-xs sm:text-sm leading-tight drop-shadow-md line-clamp-3">
              {title}
            </h3>
            <div className="mt-3 inline-block px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[8px] text-white/60 font-mono uppercase tracking-[0.2em]">
              {systemId.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Bottom "Seal of Quality" style element */}
          <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full border-2 border-yellow-500/30 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-yellow-500/10" />
          </div>
        </motion.div>
      ) : (
        currentSrc && (
          <motion.img
            key={`${gameId}-${sourceIndex}`}
            src={currentSrc}
            alt={title}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ 
              opacity: status === 'success' ? 1 : 0, 
              scale: status === 'success' ? 1 : 1.05 
            }}
            transition={{ duration: 0.3 }}
            onLoad={handleLoad}
            onError={handleError}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        )
      )}

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none z-10" />

      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-black uppercase tracking-widest text-white/70 border border-white/10 z-20">
        {systemId.toUpperCase()}
      </div>
    </div>
  );
};
