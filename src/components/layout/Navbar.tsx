import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, Users, Trophy, User, ShoppingBag, Settings } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5';

  return (
    <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                <Gamepad2 className="h-6 w-6 text-emerald-500" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white font-mono">DOMINION</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              <Link to="/tournaments" className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive('/tournaments')}`}>Torneos</Link>
              <Link to="/marketplace" className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive('/marketplace')}`}>Mercado</Link>
              <Link to="/community" className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive('/community')}`}>Comunidad</Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-4 mr-4 border-r border-white/10 pr-4">
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Créditos</p>
                <p className="text-sm font-mono text-emerald-400 font-bold">4,250</p>
              </div>
            </div>

            <Link to="/settings" className={`p-2 rounded-lg transition-colors ${isActive('/settings')}`} title="Configuración">
              <Settings className="h-5 w-5" />
            </Link>
            <Link to="/profile" className={`p-2 rounded-lg transition-colors ${isActive('/profile')}`} title="Perfil">
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
