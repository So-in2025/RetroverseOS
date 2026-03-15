import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Circle, MessageSquare, Gamepad2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { AudioEngine } from '../../services/audioEngine';
import { haptics } from '../../services/haptics';

const friends = [
  { name: 'CyberKai', status: 'online', game: 'Street Fighter II', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
  { name: 'PixelQueen', status: 'away', game: 'Tetris', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { name: 'GlitchRunner', status: 'online', game: 'Sonic 2', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
  { name: 'RetroKing', status: 'offline', game: null, avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=100&h=100&fit=crop' },
];

export default function SocialPanel() {
  const { socialPanelOpen, toggleSocialPanel } = useUIStore();

  return (
    <AnimatePresence>
      {socialPanelOpen && (
        <>
          {/* Mobile Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSocialPanel}
            className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
          />

          <motion.div 
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.5 }}
            onDragEnd={(e, info) => {
              if (info.offset.x > 100) {
                toggleSocialPanel();
              }
            }}
            className="fixed right-0 top-0 h-full w-72 xl:w-64 flex flex-col bg-black/90 xl:bg-black/40 backdrop-blur-2xl xl:backdrop-blur-xl border-l border-white/10 p-6 z-[60] xl:z-40"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Neural Links
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                  {friends.filter(f => f.status === 'online').length} LIVE
                </span>
                <button 
                  onClick={toggleSocialPanel}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
                  title="Hide Neural Links"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 overflow-y-auto scrollbar-hide">
              {friends.map((friend) => (
                <motion.div 
                  key={friend.name}
                  whileHover={{ x: -4 }}
                  onClick={() => haptics.light()}
                  className="group cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className="relative">
                      <img 
                        src={friend.avatar} 
                        className={`w-10 h-10 rounded-xl object-cover border border-white/10 ${friend.status === 'offline' ? 'grayscale opacity-50' : ''}`} 
                        alt={friend.name}
                      />
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${
                        friend.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
                        friend.status === 'away' ? 'bg-amber-500' : 'bg-zinc-700'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black uppercase italic truncate ${friend.status === 'offline' ? 'text-zinc-600' : 'text-zinc-200'}`}>
                        {friend.name}
                      </p>
                      {friend.game && (
                        <p className="text-[10px] font-bold text-cyan-electric/70 truncate flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3" /> {friend.game}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-white/5">
              <button 
                onClick={() => haptics.medium()}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                Open Comms
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Desktop Toggle Button (Only visible when panel is closed and on desktop) */}
      {!socialPanelOpen && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={toggleSocialPanel}
          className="hidden xl:flex fixed right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-full z-40 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all group shadow-2xl"
          title="Show Neural Links"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 shadow-[0_0_8px_#10b981]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
