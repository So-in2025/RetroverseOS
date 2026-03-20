import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, ShoppingBag, User, Globe, Settings, Trophy } from 'lucide-react';
import { haptics } from '../../services/haptics';
import { useUIStore } from '../../store/uiStore';

export default function MobileNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const setAchievementsModal = useUIStore(state => state.setAchievementsModal);

  const navItems = [
    { id: 'marketplace', icon: ShoppingBag, label: 'MERCADO', path: '/marketplace' },
    { id: 'community', icon: Globe, label: 'RED', path: '/community' },
    { id: 'achievements', icon: Trophy, label: 'LOGROS', action: () => setAchievementsModal(true) },
    { id: 'settings', icon: Settings, label: 'SISTEMA', path: '/settings' },
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-2xl border-t border-white/10 z-50 pb-safe">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => {
                haptics.light();
                if (item.action) {
                  item.action();
                } else if (item.path) {
                  navigate(item.path);
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 ${
                active ? 'text-cyan-electric' : 'text-zinc-500'
              }`}
            >
              <div className="relative">
                <item.icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {active && (
                  <div className="absolute -inset-2 bg-cyan-electric/10 rounded-full blur-md" />
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
