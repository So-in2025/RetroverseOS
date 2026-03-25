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
    return CoverService.getCoverSources(title, systemId, gameId, primaryUrl);
  }, [title, systemId, gameId, primaryUrl]);

  // Cargar desde cache al montar
  useEffect(() => {
    let isMounted = true;
    
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
        setSourceIndex(0);
        setCurrentSrc(null);
        setStatus('loading');
      }
    });

    return () => { isMounted = false; };
  }, [gameId, sources]);

  useEffect(() => {
    // Si ya cargamos de cache, no hacemos nada
    if (isCached || status === 'success') return;

    if (sourceIndex >= sources.length) {
      setStatus('error');
      return;
    }

    const url = sources[sourceIndex];
    if (sourceIndex === 0) {
      console.debug(`[Cover] Buscando arte para: ${title}`);
    }

    // Intentar cargar a través del cache de imágenes (blob URL)
    const loadWithCache = async () => {
      if (url && !url.startsWith('/')) {
        try {
          const cachedUrl = await ImageCache.getImage(url);
          if (cachedUrl && cachedUrl.startsWith('blob:')) {
            setCurrentSrc(cachedUrl);
            return;
          }
        } catch (e) {
          console.warn(`[Cover] Cache fetch failed for ${url}, falling back to direct`);
        }
      }
      setCurrentSrc(url);
    };

    loadWithCache();

    // Timeout de seguridad: si una imagen tarda más de 8s en cargar o fallar, forzamos el siguiente intento
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        console.warn(`[Cover] Timeout loading ${url} for ${title}, skipping...`);
        handleError();
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [sourceIndex, sources, isCached]);

  const handleError = () => {
    // Si falló una URL que estaba en cache, la borramos y reiniciamos cascada
    if (isCached) {
      coverStore.removeItem(gameId);
      setIsCached(false);
      setSourceIndex(0);
      setStatus('loading');
      return;
    }

    if (sourceIndex === sources.length - 1) {
      console.warn(`[Cover] No se encontró arte para: ${title}`);
    }
    
    setCurrentSrc(null);
    if (sourceIndex < sources.length - 1) {
      setSourceIndex(prev => prev + 1);
    } else {
      setStatus('error');
    }
  };

  const handleLoad = () => {
    if (status !== 'success') {
      console.debug(`[Cover] OK! Fuente ${sourceIndex + 1} cargada: ${title}`);
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
    <div className={`relative overflow-hidden bg-zinc-900/50 ${aspectClasses[aspectRatio]} ${className}`}>
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
          className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-shimmer" />
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-electric shadow-[0_0_10px_#00f2ff]" />
          <Gamepad2 className="w-12 h-12 text-cyan-electric opacity-30 mb-3" />
          <h3 className="text-white font-black text-center px-3 uppercase tracking-tighter text-sm leading-tight z-10 line-clamp-3">
            {title}
          </h3>
          <div className="mt-2 px-2 py-0.5 bg-black/50 rounded text-[9px] text-cyan-electric/80 font-mono tracking-widest z-10 border border-cyan-electric/20">
            {systemId.toUpperCase()}
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
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )
      )}

      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-black uppercase tracking-widest text-white/70 border border-white/10">
        {systemId.toUpperCase()}
      </div>
    </div>
  );
};
