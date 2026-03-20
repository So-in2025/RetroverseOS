import React from 'react';

interface CRTFilterProps {
  enabled: boolean;
  style?: 'classic' | 'cyberpunk' | 'vhs' | 'matrix';
}

export default function CRTFilter({ enabled, style = 'classic' }: CRTFilterProps) {
  if (!enabled) return null;

  const getStyleClasses = () => {
    switch (style) {
      case 'cyberpunk':
        return {
          scanlines: 'opacity-[0.4] mix-blend-screen',
          gradient: 'linear-gradient(rgba(255, 0, 255, 0.05) 50%, rgba(0, 255, 255, 0.05) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.1), rgba(0, 255, 0, 0.05), rgba(0, 0, 255, 0.1))',
          vignette: 'bg-[radial-gradient(circle_at_center,transparent_40%,rgba(255,0,255,0.2)_100%)]'
        };
      case 'vhs':
        return {
          scanlines: 'opacity-[0.3] animate-pulse',
          gradient: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 255, 255, 0.05), rgba(200, 200, 200, 0.02), rgba(255, 255, 255, 0.05))',
          vignette: 'bg-[radial-gradient(circle_at_center,transparent_70%,rgba(0,0,0,0.8)_100%)]'
        };
      case 'matrix':
        return {
          scanlines: 'opacity-[0.5] mix-blend-color-dodge',
          gradient: 'linear-gradient(rgba(0, 255, 0, 0.1) 50%, rgba(0, 0, 0, 0.2) 50%), linear-gradient(90deg, rgba(0, 255, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.05))',
          vignette: 'bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,128,0,0.4)_100%)]'
        };
      default:
        return {
          scanlines: 'opacity-[0.25]',
          gradient: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          vignette: 'bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.6)_100%)]'
        };
    }
  };

  const config = getStyleClasses();

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden mix-blend-overlay">
      {/* Scanlines */}
      <div 
        className={`absolute inset-0 ${config.scanlines}`}
        style={{
          backgroundImage: config.gradient,
          backgroundSize: '100% 4px, 6px 100%'
        }}
      />
      {/* Vignette & Tube shadow */}
      <div className={`absolute inset-0 ${config.vignette}`} />
      
      {/* Screen Glare */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent opacity-30 rounded-t-[100%]" />
      
      {style === 'vhs' && (
        <div className="absolute inset-0 bg-white/5 animate-pulse mix-blend-overlay pointer-events-none" />
      )}
    </div>
  );
}
