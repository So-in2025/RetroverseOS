import React, { useState, useEffect } from 'react';
import { Gamepad2, Search, Users, Radio, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { haptics } from '../../services/haptics';
import { useEconomy } from '../../hooks/useEconomy';

export default function MobileHeader() {
  const { setSearchModal, toggleSocialPanel } = useUIStore();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { balance } = useEconomy();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-b border-white/10 z-50 px-4 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link to="/" onClick={() => haptics.light()} className="flex items-center gap-2">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-electric/20 rounded-lg blur-sm" />
            <div className="relative bg-zinc-900 border border-cyan-electric/30 rounded-lg p-1.5">
              <Gamepad2 className="w-4 h-4 text-cyan-electric" />
            </div>
          </div>
          <span className="text-xs font-black italic uppercase tracking-widest text-white">
            RETROVERSE <span className="text-cyan-electric">OS</span>
          </span>
        </Link>
        
        {isOffline && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 rounded-md animate-pulse">
            <Radio className="w-2.5 h-2.5 text-rose-500" />
            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">OFFLINE</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-lg mr-1">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-black text-yellow-400">{balance}</span>
        </div>
        <button 
          onClick={() => {
            haptics.medium();
            setSearchModal(true);
          }}
          className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-400 active:scale-95 transition-all"
        >
          <Search className="w-5 h-5" />
        </button>
        <button 
          onClick={() => {
            haptics.medium();
            toggleSocialPanel();
          }}
          className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-400 active:scale-95 transition-all relative"
        >
          <Users className="w-5 h-5" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-black shadow-[0_0_5px_#10b981]" />
        </button>
      </div>
    </header>
  );
}
