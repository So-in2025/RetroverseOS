import React, { useState, useEffect } from 'react';
import { inputManager, RetroButton } from '../../services/inputManager';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Check, RotateCcw } from 'lucide-react';

interface VirtualControllerProps {
  isVisible: boolean;
  skin?: 'default' | 'gold' | 'carbon' | 'translucent';
}

interface ButtonLayout {
  x: number;
  y: number;
  size: number;
}

export default function VirtualController({ isVisible, skin = 'default' }: VirtualControllerProps) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [layout, setLayout] = useState<Record<string, ButtonLayout>>({});

  useEffect(() => {
    const loadLayout = async () => {
      const saved = await inputManager.getVirtualLayout();
      if (saved) setLayout(saved);
    };
    loadLayout();
  }, []);

  if (!isVisible) return null;

  const handleInput = (button: RetroButton, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
    if (isCustomizing) return;
    e.preventDefault();
    e.stopPropagation();
    inputManager.injectInput(button, pressed);
  };

  const handleDragEnd = (button: string, info: any) => {
    const newLayout = {
      ...layout,
      [button]: {
        x: (layout[button]?.x || 0) + info.offset.x,
        y: (layout[button]?.y || 0) + info.offset.y,
        size: layout[button]?.size || 1
      }
    };
    setLayout(newLayout);
  };

  const saveLayout = async () => {
    await inputManager.saveVirtualLayout(layout);
    setIsCustomizing(false);
  };

  const resetLayout = async () => {
    setLayout({});
    await inputManager.saveVirtualLayout({});
  };

  const getSkinClasses = () => {
    switch (skin) {
      case 'gold':
        return {
          dpad: 'bg-yellow-500/20 active:bg-yellow-500/40 border-yellow-500/50',
          actionX: 'bg-blue-500/40 border-blue-500/60 text-blue-200',
          actionB: 'bg-yellow-500/40 border-yellow-500/60 text-yellow-200',
          actionY: 'bg-emerald-500/40 border-emerald-500/60 text-emerald-200',
          actionA: 'bg-rose-500/40 border-rose-500/60 text-rose-200',
          menu: 'bg-yellow-900/40 border-yellow-500/30 text-yellow-500'
        };
      case 'carbon':
        return {
          dpad: 'bg-zinc-800/60 active:bg-zinc-700/80 border-zinc-600/50',
          actionX: 'bg-zinc-700/60 border-zinc-500/50 text-zinc-300',
          actionB: 'bg-zinc-700/60 border-zinc-500/50 text-zinc-300',
          actionY: 'bg-zinc-700/60 border-zinc-500/50 text-zinc-300',
          actionA: 'bg-zinc-700/60 border-zinc-500/50 text-zinc-300',
          menu: 'bg-zinc-900/80 border-zinc-700/50 text-zinc-500'
        };
      case 'translucent':
        return {
          dpad: 'bg-purple-500/10 active:bg-purple-500/30 border-purple-500/20 backdrop-blur-sm',
          actionX: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
          actionB: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
          actionY: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
          actionA: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
          menu: 'bg-purple-900/20 border-purple-500/20 text-purple-400'
        };
      default:
        return {
          dpad: 'bg-white/20 active:bg-white/40 border-white/10',
          actionX: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
          actionB: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
          actionY: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
          actionA: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
          menu: 'bg-black/60 border-white/10 text-zinc-400'
        };
    }
  };

  const skinClasses = getSkinClasses();

  // Helper for button styles
  const btnBase = "absolute flex items-center justify-center transition-all active:scale-95 touch-none select-none";
  const dpadBase = `${skinClasses.dpad} backdrop-blur-md border`;
  const actionBtnBase = "rounded-full backdrop-blur-md border shadow-lg active:brightness-125 opacity-80 active:opacity-100";

  return (
    <div className="absolute inset-x-0 bottom-0 h-40 md:h-56 pointer-events-none z-50 flex justify-between items-end px-2 pb-4 md:pb-6 select-none touch-none">
      {/* Customization Controls */}
      <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
        {!isCustomizing ? (
          <button 
            onClick={() => setIsCustomizing(true)}
            className="p-2 bg-black/60 border border-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
            title="Personalizar Controles"
          >
            <Settings className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={saveLayout}
              className="px-4 py-1 bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-widest rounded-full flex items-center gap-2"
            >
              <Check className="w-3 h-3" /> Guardar
            </button>
            <button 
              onClick={resetLayout}
              className="px-4 py-1 bg-rose-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-full flex items-center gap-2"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        )}
      </div>

      {/* D-Pad Area */}
      <motion.div 
        drag={isCustomizing}
        dragMomentum={false}
        onDragEnd={(_, info) => handleDragEnd('dpad', info)}
        style={{ x: layout.dpad?.x, y: layout.dpad?.y }}
        className={`relative w-32 h-32 md:w-48 md:h-48 pointer-events-auto ${isCustomizing ? 'ring-2 ring-emerald-500 ring-dashed rounded-full' : ''}`}
      >
        {/* D-Pad Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-36 md:h-36 bg-black/10 rounded-full blur-xl"></div>
        
        {/* UP */}
        <button 
          className={`${btnBase} ${dpadBase} top-1 md:top-4 left-1/2 -translate-x-1/2 w-10 h-12 md:w-14 md:h-16 rounded-t-xl`}
          onTouchStart={handleInput('up', true)}
          onTouchEnd={handleInput('up', false)}
          onTouchCancel={handleInput('up', false)}
          onMouseDown={handleInput('up', true)}
          onMouseUp={handleInput('up', false)}
        >
          <div className="w-0 h-0 border-l-[4px] md:border-l-[6px] border-l-transparent border-r-[4px] md:border-r-[6px] border-r-transparent border-b-[6px] md:border-b-[10px] border-b-white/50 mb-1 md:mb-2" />
        </button>

        {/* DOWN */}
        <button 
          className={`${btnBase} ${dpadBase} bottom-1 md:bottom-4 left-1/2 -translate-x-1/2 w-10 h-12 md:w-14 md:h-16 rounded-b-xl`}
          onTouchStart={handleInput('down', true)}
          onTouchEnd={handleInput('down', false)}
          onTouchCancel={handleInput('down', false)}
          onMouseDown={handleInput('down', true)}
          onMouseUp={handleInput('down', false)}
        >
          <div className="w-0 h-0 border-l-[4px] md:border-l-[6px] border-l-transparent border-r-[4px] md:border-r-[6px] border-r-transparent border-t-[6px] md:border-t-[10px] border-t-white/50 mt-1 md:mt-2" />
        </button>

        {/* LEFT */}
        <button 
          className={`${btnBase} ${dpadBase} left-1 md:left-4 top-1/2 -translate-y-1/2 w-12 h-10 md:w-16 md:h-14 rounded-l-xl`}
          onTouchStart={handleInput('left', true)}
          onTouchEnd={handleInput('left', false)}
          onTouchCancel={handleInput('left', false)}
          onMouseDown={handleInput('left', true)}
          onMouseUp={handleInput('left', false)}
        >
          <div className="w-0 h-0 border-t-[4px] md:border-t-[6px] border-t-transparent border-b-[4px] md:border-b-[6px] border-b-transparent border-r-[6px] md:border-r-[10px] border-r-white/50 mr-1 md:mr-2" />
        </button>

        {/* RIGHT */}
        <button 
          className={`${btnBase} ${dpadBase} right-1 md:right-4 top-1/2 -translate-y-1/2 w-12 h-10 md:w-16 md:h-14 rounded-r-xl`}
          onTouchStart={handleInput('right', true)}
          onTouchEnd={handleInput('right', false)}
          onTouchCancel={handleInput('right', false)}
          onMouseDown={handleInput('right', true)}
          onMouseUp={handleInput('right', false)}
        >
          <div className="w-0 h-0 border-t-[4px] md:border-t-[6px] border-t-transparent border-b-[4px] md:border-b-[6px] border-b-transparent border-l-[6px] md:border-l-[10px] border-l-white/50 ml-1 md:ml-2" />
        </button>
        
        {/* Center Pivot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-14 md:h-14 bg-white/5 rounded-lg pointer-events-none"></div>
      </motion.div>

      {/* Center Menu Buttons */}
      <motion.div 
        drag={isCustomizing}
        dragMomentum={false}
        onDragEnd={(_, info) => handleDragEnd('menu', info)}
        style={{ x: layout.menu?.x, y: layout.menu?.y }}
        className={`flex gap-2 md:gap-4 mb-2 md:mb-8 pointer-events-auto z-50 ${isCustomizing ? 'ring-2 ring-emerald-500 ring-dashed rounded-full p-2' : ''}`}
      >
        <button 
          className={`px-3 py-1 md:px-5 md:py-2 ${skinClasses.menu} active:bg-white/20 backdrop-blur-md rounded-full border text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-colors`}
          onTouchStart={handleInput('select', true)}
          onTouchEnd={handleInput('select', false)}
          onMouseDown={handleInput('select', true)}
          onMouseUp={handleInput('select', false)}
        >
          Select
        </button>
        <button 
          className={`px-3 py-1 md:px-5 md:py-2 ${skinClasses.menu} active:bg-white/20 backdrop-blur-md rounded-full border text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-colors`}
          onTouchStart={handleInput('start', true)}
          onTouchEnd={handleInput('start', false)}
          onMouseDown={handleInput('start', true)}
          onMouseUp={handleInput('start', false)}
        >
          Start
        </button>
      </motion.div>

      {/* Action Buttons (Nintendo Layout: X Top, B Bottom, Y Left, A Right) */}
      <motion.div 
        drag={isCustomizing}
        dragMomentum={false}
        onDragEnd={(_, info) => handleDragEnd('actions', info)}
        style={{ x: layout.actions?.x, y: layout.actions?.y }}
        className={`relative w-32 h-32 md:w-48 md:h-48 pointer-events-auto ${isCustomizing ? 'ring-2 ring-emerald-500 ring-dashed rounded-full' : ''}`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-36 md:h-36 bg-black/20 rounded-full blur-xl"></div>

        {/* X (Top) */}
        <button 
          className={`${btnBase} ${actionBtnBase} top-0 md:top-2 left-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 ${skinClasses.actionX} font-black text-base md:text-xl`}
          onTouchStart={handleInput('x', true)}
          onTouchEnd={handleInput('x', false)}
          onTouchCancel={handleInput('x', false)}
          onMouseDown={handleInput('x', true)}
          onMouseUp={handleInput('x', false)}
        >
          X
        </button>

        {/* B (Bottom) */}
        <button 
          className={`${btnBase} ${actionBtnBase} bottom-0 md:bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 ${skinClasses.actionB} font-black text-base md:text-xl`}
          onTouchStart={handleInput('b', true)}
          onTouchEnd={handleInput('b', false)}
          onTouchCancel={handleInput('b', false)}
          onMouseDown={handleInput('b', true)}
          onMouseUp={handleInput('b', false)}
        >
          B
        </button>

        {/* Y (Left) */}
        <button 
          className={`${btnBase} ${actionBtnBase} left-0 md:left-2 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 ${skinClasses.actionY} font-black text-base md:text-xl`}
          onTouchStart={handleInput('y', true)}
          onTouchEnd={handleInput('y', false)}
          onTouchCancel={handleInput('y', false)}
          onMouseDown={handleInput('y', true)}
          onMouseUp={handleInput('y', false)}
        >
          Y
        </button>

        {/* A (Right) */}
        <button 
          className={`${btnBase} ${actionBtnBase} right-0 md:right-2 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 ${skinClasses.actionA} font-black text-base md:text-xl`}
          onTouchStart={handleInput('a', true)}
          onTouchEnd={handleInput('a', false)}
          onTouchCancel={handleInput('a', false)}
          onMouseDown={handleInput('a', true)}
          onMouseUp={handleInput('a', false)}
        >
          A
        </button>
      </motion.div>
    </div>
  );
}
