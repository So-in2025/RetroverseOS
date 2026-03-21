import React from 'react';
import { motion } from 'motion/react';
import { 
  Gamepad2, 
  ShoppingBag, 
  Globe, 
  Settings, 
  LogOut,
  Search,
  Database,
  Trophy,
  Coins,
  MessageSquare,
  Scale
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/AuthContext';
import { useUIStore } from '../../store/uiStore';
import { useEconomy } from '../../hooks/useEconomy';
import SentinelWidget from '../SentinelWidget';

import { haptics } from '../../services/haptics';

const navItems = [
  { icon: Database, label: 'PREMIUM', path: '/premium' },
  { icon: ShoppingBag, label: 'MERCADO', path: '/marketplace' },
  { icon: Globe, label: 'NETPLAY', path: '/netplay' },
  { icon: Settings, label: 'SISTEMA', path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const setSearchModal = useUIStore((state) => state.setSearchModal);
  const setDebugPanel = useUIStore((state) => state.setDebugPanel);
  const { balance } = useEconomy();
  const navigate = useNavigate();
  const [logoClicks, setLogoClicks] = React.useState(0);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextClicks = logoClicks + 1;
    setLogoClicks(nextClicks);
    
    if (nextClicks >= 5) {
      setDebugPanel(true);
      setLogoClicks(0);
      haptics.success();
    } else {
      // If single click, navigate to home
      if (nextClicks === 1) {
        setTimeout(() => {
          if (logoClicks < 5) {
            navigate('/');
            setLogoClicks(0);
          }
        }, 300);
      }
    }
  };

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-6 bg-black border-r border-white/10 z-50">
      {/* Logo / Home */}
      <div className="mb-10">
        <button onClick={handleLogoClick} className="block">
          <div className="group relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-electric/20 rounded-xl blur-md group-hover:bg-cyan-electric/40 transition-all duration-500" />
            <div className="relative bg-zinc-900 border border-cyan-electric/30 rounded-xl p-2.5 shadow-[0_0_15px_rgba(0,242,255,0.2)] group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-6 h-6 text-cyan-electric" />
            </div>
          </div>
        </button>
      </div>

      {/* User Profile Avatar */}
      {user && (
        <div className="mb-6 w-full px-2">
          <Link to="/profile">
            <div className="group relative w-full flex justify-center p-1 rounded-xl transition-all duration-300 hover:bg-white/5">
              <img 
                src={user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                alt="Profile"
                className="w-10 h-10 rounded-lg border border-white/10 group-hover:border-cyan-electric/50 transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {user.user_metadata.full_name || 'OPERADOR'}
                </span>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* RetroCoins Balance */}
      <div className="mb-6 w-full px-2">
        <div className="group relative w-full flex justify-center p-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 cursor-default">
          <div className="flex flex-col items-center">
            <Coins className="w-4 h-4 text-yellow-400 mb-1" />
            <span className="text-[10px] font-black text-yellow-400">{balance}</span>
          </div>
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-yellow-400/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
              RETROCOINS
            </span>
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
          </div>
        </div>
      </div>

      {/* Global Search Button */}
      <div className="mb-6 w-full px-2">
        <button 
          onClick={() => {
            haptics.medium();
            setSearchModal(true);
          }}
          className="group relative w-full flex justify-center p-3 rounded-xl transition-all duration-300 hover:bg-white/5 text-zinc-500 hover:text-emerald-400"
        >
          <Search className="w-5 h-5" />
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              BUSCAR EN LA RED
            </span>
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
          </div>
        </button>
      </div>

      {/* Achievements Button */}
      <div className="mb-6 w-full px-2">
        <button 
          onClick={() => {
            haptics.medium();
            useUIStore.getState().setAchievementsModal(true);
          }}
          className="group relative w-full flex justify-center p-3 rounded-xl transition-all duration-300 hover:bg-white/5 text-zinc-500 hover:text-yellow-400"
        >
          <Trophy className="w-5 h-5" />
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              LOGROS
            </span>
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
          </div>
        </button>
      </div>

      {/* Navigation Rail */}
      <nav className="flex-1 flex flex-col gap-6 w-full px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className="relative group w-full flex justify-center"
              onClick={() => haptics.light()}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative p-3 rounded-xl transition-all duration-300 group-hover:bg-white/5
                  ${isActive ? 'bg-white/10 text-cyan-electric shadow-[0_0_20px_rgba(0,242,255,0.15)]' : 'text-zinc-500 hover:text-white'}
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-electric rounded-r-full shadow-[0_0_10px_#00f2ff]"
                  />
                )}

                {/* Tooltip */}
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">
                    {item.label}
                  </span>
                  {/* Arrow */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
                </div>
              </motion.div>
            </Link>
          );
        })}

        {/* Support / Feedback */}
        <div className="w-full px-2">
          <button 
            onClick={() => {
              haptics.medium();
              // In a real app, this would open a support modal
              alert('Sistema de Soporte: Envía tu feedback a support@retroverse.os');
            }}
            className="group relative w-full flex justify-center p-3 rounded-xl transition-all duration-300 hover:bg-white/5 text-zinc-500 hover:text-emerald-400"
          >
            <MessageSquare className="w-5 h-5" />
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                SOPORTE Y FEEDBACK
              </span>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
            </div>
          </button>
        </div>

        {/* Legal Disclaimer */}
        <div className="w-full px-2">
          <button 
            onClick={() => {
              haptics.medium();
              alert('Retroverse OS es un reproductor multimedia. Los usuarios son responsables de sus propios archivos legales.');
            }}
            className="group relative w-full flex justify-center p-3 rounded-xl transition-all duration-300 hover:bg-white/5 text-zinc-500 hover:text-amber-400"
          >
            <Scale className="w-5 h-5" />
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                ESTADO LEGAL (BYOR)
              </span>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
            </div>
          </button>
        </div>
      </nav>

      {/* Logout */}
      <div className="mt-auto pb-4 flex flex-col items-center gap-4">
        <SentinelWidget />
        
        <button 
          onClick={() => signOut()}
          className="group relative p-3 text-zinc-600 hover:text-rose-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-rose-950/90 border border-rose-500/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
              SALIR
            </span>
          </div>
        </button>

        {/* Hidden Debug Trigger - Made more accessible for the user */}
        <button 
          onClick={() => {
            setDebugPanel(true);
            haptics.success();
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-500/10 transition-all group relative"
          title="Neural Debugger"
        >
          <div className="w-1.5 h-1.5 bg-rose-500/20 rounded-full group-hover:bg-rose-500/50 transition-colors shadow-[0_0_10px_rgba(244,63,94,0.1)] group-hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
          
          {/* Tooltip for Debugger */}
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-rose-950/90 border border-rose-500/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
              NEURAL DEBUGGER
            </span>
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-rose-950/90" />
          </div>
        </button>
      </div>
    </aside>
  );
}
