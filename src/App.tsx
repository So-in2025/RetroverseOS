import React from 'react';
import { Library } from './components/Library';
import { Emulator } from './components/Emulator';
import { useStore } from './store';
import { AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const { isPlaying } = useStore();

  return (
    <div className="h-screen w-screen overflow-hidden bg-black selection:bg-emerald-500 selection:text-black">
      {!window.crossOriginIsolated && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500/10 border-b border-red-500/20 px-4 py-1 text-[10px] font-mono text-red-400 text-center backdrop-blur-md">
          SYSTEM WARNING: CROSS-ORIGIN ISOLATION DISABLED. EMULATOR PERFORMANCE MAY BE DEGRADED.
        </div>
      )}
      <Library />
      
      <AnimatePresence>
        {isPlaying && <Emulator />}
      </AnimatePresence>
    </div>
  );
};

export default App;
