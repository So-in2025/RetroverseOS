import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Plus, Trash2, Zap, AlertCircle, CheckCircle, X, ShieldAlert, Activity } from 'lucide-react';
import { apiPoolService, APIKeyStatus } from '../../services/apiPoolService';
import { haptics } from '../../services/haptics';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [keys, setKeys] = useState<APIKeyStatus[]>([]);
  const [newKey, setNewKey] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const refreshKeys = async () => {
    const pool = await apiPoolService.getKeys();
    setKeys([...pool]);
  };

  useEffect(() => {
    if (isOpen) {
      refreshKeys();
      const interval = setInterval(refreshKeys, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleAddKey = async () => {
    if (!newKey.trim()) return;
    await apiPoolService.addKey(newKey.trim());
    setNewKey('');
    setIsAdding(false);
    refreshKeys();
    haptics.success();
  };

  const handleRemoveKey = async (key: string) => {
    await apiPoolService.removeKey(key);
    refreshKeys();
    haptics.medium();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-mono"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-zinc-950 border-2 border-rose-500/50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(244,63,94,0.2)]"
        >
          {/* Header */}
          <div className="bg-rose-500/10 border-b border-rose-500/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center border border-rose-500/40 animate-pulse">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h2 className="text-rose-500 font-black uppercase tracking-widest text-lg leading-none">Neural Debugger</h2>
                <span className="text-[10px] text-rose-500/60 uppercase font-bold">API Pool Orchestrator v2.4.0</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors text-rose-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="bg-zinc-900/50 p-4 border-b border-white/5 grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Nodes</span>
              <span className="text-xl font-black text-white">{keys.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Active Links</span>
              <span className="text-xl font-black text-emerald-500">{keys.filter(k => !k.isExhausted).length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Exhausted</span>
              <span className="text-xl font-black text-rose-500">{keys.filter(k => k.isExhausted).length}</span>
            </div>
          </div>

          {/* Key List */}
          <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              {keys.map((k, idx) => (
                <motion.div 
                  key={k.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-xl border flex items-center justify-between group transition-all
                    ${k.isExhausted 
                      ? 'bg-rose-500/5 border-rose-500/20 opacity-60' 
                      : 'bg-white/5 border-white/10 hover:border-emerald-500/30'
                    }`}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full ${k.isExhausted ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-zinc-300 truncate max-w-[300px]">
                        {k.key.substring(0, 12)}••••••••••••{k.key.substring(k.key.length - 4)}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[9px] font-black uppercase ${k.isExhausted ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {k.isExhausted ? 'Exhausted' : 'Operational'}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">
                          Last Sync: {k.lastUsed ? new Date(k.lastUsed).toLocaleTimeString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleRemoveKey(k.key)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 rounded-lg transition-all text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}

              {keys.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                  <Terminal className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest">No Neural Nodes Detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer / Add Key */}
          <div className="p-4 bg-zinc-900/50 border-t border-white/5">
            {isAdding ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <input 
                  autoFocus
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Enter Gemini API Key..."
                  className="flex-1 bg-black border border-rose-500/30 rounded-xl px-4 py-2 text-xs text-rose-500 placeholder:text-rose-500/30 focus:outline-none focus:border-rose-500"
                />
                <button 
                  onClick={handleAddKey}
                  className="px-4 py-2 bg-rose-500 text-black font-black uppercase text-xs rounded-xl hover:bg-white transition-colors"
                >
                  Inject
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-white/5 text-white font-black uppercase text-xs rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Neural Node
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
