import React from 'react';

interface CRTFilterProps {
  enabled: boolean;
}

export default function CRTFilter({ enabled }: CRTFilterProps) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden mix-blend-overlay">
      {/* Scanlines */}
      <div 
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%'
        }}
      />
      {/* Vignette & Tube shadow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.6)_100%)]" />
      
      {/* Screen Glare */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent opacity-30 rounded-t-[100%]" />
    </div>
  );
}
