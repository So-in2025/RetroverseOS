import React, { useState, useEffect } from 'react';
import { ImageOff, Loader2, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageCache } from '../../services/imageCache';

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
 * TRIPLE CASCADA DE ARTE (GameCover)
 * 1. Libretro Master (High Quality)
 * 2. Archive.org Native (Internal Thumbnail)
 * 3. OpenGameArt / Placeholder (Generated)
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
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'fallback'>('loading');
  const [attempt, setAttempt] = useState(0);

  // Construct the 3 levels of the cascade
  const cascade = [
    primaryUrl, // Level 1: Libretro
    `https://archive.org/services/img/${gameId}`, // Level 2: Archive.org Native
  ].filter(Boolean) as string[];

  useEffect(() => {
    setAttempt(0);
    setStatus('loading');
    setCurrentSrc(cascade[0] || null);
  }, [gameId, primaryUrl]);

  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl: string | null = null;

    const loadCachedImage = async () => {
      if (!currentSrc) {
        if (isMounted) setCachedSrc(null);
        return;
      }

      try {
        const cachedUrl = await ImageCache.getImage(currentSrc);
        if (isMounted) {
          if (cachedUrl.startsWith('blob:')) {
            currentObjectUrl = cachedUrl;
          }
          setCachedSrc(cachedUrl);
        } else if (cachedUrl.startsWith('blob:')) {
          URL.revokeObjectURL(cachedUrl);
        }
      } catch (e) {
        if (isMounted) setCachedSrc(currentSrc);
      }
    };

    loadCachedImage();

    return () => {
      isMounted = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [currentSrc]);

  const handleError = () => {
    const nextAttempt = attempt + 1;
    if (nextAttempt < cascade.length) {
      setAttempt(nextAttempt);
      setCurrentSrc(cascade[nextAttempt]);
      setStatus('fallback');
      console.log(`[Triple Cascada] Level ${attempt + 1} failed for ${title}. Trying Level ${nextAttempt + 1}...`);
    } else {
      // Level 3: Placeholder
      setStatus('error');
      console.log(`[Triple Cascada] All image sources failed for ${title}. Using Level 3 (Placeholder).`);
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
    <div className={`relative overflow-hidden bg-zinc-900/50 ${aspectClasses[aspectRatio]} ${className}`}>
      <AnimatePresence mode="wait">
        {status === 'loading' && showLoading && (
          <motion.div 
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-zinc-900"
          >
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin opacity-20" />
          </motion.div>
        )}

        {status === 'error' || (!currentSrc && attempt === 0) ? (
          <motion.div 
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 overflow-hidden"
          >
            {/* Animated Shimmer Background */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-shimmer" />
            
            {/* System Color Accent */}
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
          cachedSrc && (
            <motion.img
              key={cachedSrc}
              src={cachedSrc}
              alt={title}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ 
                opacity: status === 'success' ? 1 : 0.5, 
                scale: status === 'success' ? 1 : 1.05 
              }}
              transition={{ duration: 0.4 }}
              onLoad={handleLoad}
              onError={handleError}
              className={`w-full h-full object-cover ${status === 'success' ? '' : 'blur-sm'}`}
              referrerPolicy="no-referrer"
            />
          )
        )}
      </AnimatePresence>

      {/* Overlay for fallback state */}
      {status === 'fallback' && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-none" />
      )}
      
      {/* System Badge (Optional) */}
      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-black uppercase tracking-widest text-white/70 border border-white/10">
        {systemId.toUpperCase()}
      </div>
    </div>
  );
};
