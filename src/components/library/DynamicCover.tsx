import React, { useState, useEffect } from 'react';
import { Gamepad2 } from 'lucide-react';
import { ImageCache } from '../../services/imageCache';

interface DynamicCoverProps {
  game_id?: string; // Added for Archive.org fallback
  title: string;
  system: string;
  src?: string | null;
  alt: string;
  className?: string;
  onError?: () => void;
}

const CONSOLE_FALLBACK_MAP: Record<string, string> = {
  'NES': 'https://images.unsplash.com/photo-1595514534837-024888802951?auto=format&fit=crop&q=80&w=400&h=600',
  'SNES': 'https://images.unsplash.com/photo-1595514534837-024888802951?auto=format&fit=crop&q=80&w=400&h=600',
  'GBA': 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?auto=format&fit=crop&q=80&w=400&h=600',
  'GB': 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?auto=format&fit=crop&q=80&w=400&h=600',
  'GBC': 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?auto=format&fit=crop&q=80&w=400&h=600',
  'Genesis': 'https://images.unsplash.com/photo-1595514534837-024888802951?auto=format&fit=crop&q=80&w=400&h=600',
  'PS1': 'https://images.unsplash.com/photo-1595514534837-024888802951?auto=format&fit=crop&q=80&w=400&h=600',
  'PS2': 'https://images.unsplash.com/photo-1595514534837-024888802951?auto=format&fit=crop&q=80&w=400&h=600',
  'Atari 2600': 'https://images.unsplash.com/photo-1595514534837-024888802951?auto=format&fit=crop&q=80&w=400&h=600'
};

export const DynamicCover: React.FC<DynamicCoverProps> = ({ game_id, title, system, src, alt, className, onError }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(src || null);
  const [attempt, setAttempt] = useState(0); 
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setTargetUrl(src || null);
    setAttempt(0);
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl: string | null = null;
    
    const loadCachedImage = async () => {
      if (!targetUrl) {
        if (isMounted) setImageSrc(null);
        return;
      }
      
      const cachedUrl = await ImageCache.getImage(targetUrl);
      if (isMounted) {
        if (cachedUrl.startsWith('blob:')) {
          currentObjectUrl = cachedUrl;
        }
        setImageSrc(cachedUrl);
      } else if (cachedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
      }
    };

    loadCachedImage();

    return () => {
      isMounted = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [targetUrl]);

  const handleError = () => {
    if (attempt === 0 && targetUrl?.includes('Named_Boxarts')) {
      // Fallback 1: Try Title Screen (Libretro)
      console.log(`[Cover Fallback] Trying Title Screen for ${title}`);
      setAttempt(1);
      setTargetUrl(targetUrl.replace('Named_Boxarts', 'Named_Titles'));
    } else if (attempt === 1 && targetUrl?.includes('Named_Titles')) {
      // Fallback 2: Try Gameplay Snap (Libretro)
      console.log(`[Cover Fallback] Trying Gameplay Snap for ${title}`);
      setAttempt(2);
      setTargetUrl(targetUrl.replace('Named_Titles', 'Named_Snaps'));
    } else if (attempt === 2 && game_id) {
      // Fallback 3: Try Archive.org Native Thumbnail
      console.log(`[Cover Fallback] Trying Archive.org Native Thumbnail for ${title}`);
      setAttempt(3);
      setTargetUrl(`https://archive.org/services/img/${game_id}`);
    } else if (attempt === 3 && CONSOLE_FALLBACK_MAP[system]) {
      // Fallback 4: Try Console Fallback
      console.log(`[Cover Fallback] Trying Console Fallback for ${system}`);
      setAttempt(4);
      setTargetUrl(CONSOLE_FALLBACK_MAP[system]);
    } else {
      // Fallback 5: Placeholder UI
      console.log(`[Cover Fallback] All image sources failed for ${title}. Using placeholder.`);
      setAttempt(5);
      setTargetUrl(null); // Trigger render of fallback UI
      if (onError) onError();
    }
  };

  if (attempt === 5 || (!targetUrl && attempt === 0)) {
    // Dynamic Cover Generator (Fallback UI)
    return (
      <div className={`relative flex flex-col items-center justify-center bg-zinc-900 overflow-hidden border border-white/10 ${className}`}>
        {/* Animated Shimmer Background */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-shimmer" />
        
        {/* System Color Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-electric shadow-[0_0_10px_#00f2ff]" />
        
        <Gamepad2 className="w-12 h-12 text-cyan-electric opacity-30 mb-3" />
        
        <h3 className="text-white font-black text-center px-3 uppercase tracking-tighter text-sm leading-tight z-10 line-clamp-3">
          {title}
        </h3>
        
        <div className="mt-2 px-2 py-0.5 bg-black/50 rounded text-[9px] text-cyan-electric/80 font-mono tracking-widest z-10 border border-cyan-electric/20">
          {system}
        </div>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && (
        <div className={`absolute inset-0 bg-zinc-900/50 animate-pulse ${className}`} />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
        />
      )}
    </>
  );
};
