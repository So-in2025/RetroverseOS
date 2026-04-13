import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Gamepad2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CoverService } from '../../services/coverService';
import { cacheManager } from '../../services/cacheManager';

// Cache en memoria para URLs de objetos (evita recrear URLs para el mismo juego en la misma sesión)
const objectUrlCache = new Map<string, string>();

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
 * GameCover con Cascada de Fuentes y Cache Local Persistente (LRU)
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

  const isMounted = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Intersection Observer for Lazy Loading
  useEffect(() => {
    setIsVisible(false); // Reset visibility when gameId changes
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Load a bit before it comes into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [gameId]);

  const prevGameId = useRef(gameId);

  // Cargar desde cache al montar
  useEffect(() => {
    if (!isVisible) return;
    
    if (prevGameId.current === gameId && currentSrc) return;
    prevGameId.current = gameId;

    let isMountedLocal = true;
    
    // Reset state immediately when gameId changes to avoid showing old data
    setSourceIndex(0);
    setCurrentSrc(null);
    setStatus('loading');
    setIsCached(false);
    
    const checkCache = async () => {
      try {
        // Check if we need to clear cache due to version bump
        const CATALOG_VERSION = '27'; // Incrementado para forzar migración a blobs optimizados
        const lastVersion = localStorage.getItem('cover_cache_version');
        if (lastVersion !== CATALOG_VERSION) {
          console.log('[CoverCache] Version mismatch or upgrade, clearing cover cache...');
          await cacheManager.clearAll();
          localStorage.setItem('cover_cache_version', CATALOG_VERSION);
          return false;
        }

        // Primero revisar cache en memoria (rápido)
        if (objectUrlCache.has(gameId)) {
          const url = objectUrlCache.get(gameId)!;
          setCurrentSrc(url);
          setStatus('success');
          setIsCached(true);
          // Record access in background
          cacheManager.recordAccess(gameId);
          return true;
        }

        // Luego revisar IndexedDB via cacheManager
        const cachedBlob = await cacheManager.getCover(gameId);
        if (cachedBlob && isMountedLocal) {
          const url = URL.createObjectURL(cachedBlob);
          objectUrlCache.set(gameId, url);
          setCurrentSrc(url);
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
      if (!found && isMountedLocal) {
        // Si no está en cache, iniciamos la carga por red
        loadFromNetwork();
      }
    });

    return () => { isMountedLocal = false; };
  }, [gameId, isVisible]);

  const loadFromNetwork = async () => {
    if (isCached || status === 'success') return;

    if (!sources || sources.length === 0) {
      setStatus('error');
      return;
    }

    let currentIndex = sourceIndex;
    let success = false;

    while (currentIndex < sources.length && !success && isMounted.current) {
      const url = sources[currentIndex];
      
      const proxiedUrl = (url.startsWith('blob:') || url.startsWith('/')) 
        ? url 
        : `/api/tunnel?url=${encodeURIComponent(url)}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // Reduced to 4s

        const response = await fetch(proxiedUrl, { 
          signal: controller.signal,
          referrerPolicy: 'no-referrer'
        });
        clearTimeout(timeoutId);

        if (response.status === 429) {
          // Rate limited, stop trying for this game to avoid spamming
          throw new Error('Rate limited');
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('Not an image');

        // Persistir en cache via cacheManager (LRU)
        await cacheManager.putCover(gameId, blob);
        
        if (!isMounted.current) {
          URL.revokeObjectURL(URL.createObjectURL(blob));
          return;
        }

        // Crear URL para mostrar
        const objectUrl = URL.createObjectURL(blob);
        objectUrlCache.set(gameId, objectUrl);
        
        setCurrentSrc(objectUrl);
        setStatus('success');
        setIsCached(true);
        success = true;
      } catch (e: any) {
        if (e.message === 'Rate limited') {
          setStatus('error');
          return;
        }
        console.warn(`[Cover] Failed source ${currentIndex + 1} for ${title}:`, e);
        currentIndex++;
        if (isMounted.current) setSourceIndex(currentIndex);
      }
    }

    if (!success) {
      setStatus('error');
    }
  };

  const handleError = () => {
    if (isCached) {
      // If cached image fails, it might be corrupted
      cacheManager.clearAll(); // Or just remove this one
      objectUrlCache.delete(gameId);
      setIsCached(false);
      setStatus('loading');
      loadFromNetwork();
    }
  };

  const handleLoad = () => {
    setStatus('success');
  };

  const aspectClasses = {
    portrait: 'aspect-[2/3]',
    square: 'aspect-square',
    landscape: 'aspect-video'
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-zinc-900/50 group shadow-2xl ${aspectClasses[aspectRatio]} ${className}`}>
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
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
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
