import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Key, X, ExternalLink, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { haptics } from '../../services/haptics';
import { AudioEngine } from '../../services/audioEngine';

interface BYOKModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BYOKModal({ isOpen, onClose, onSuccess }: BYOKModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('retroos_gemini_key') || '';
      setApiKey(savedKey);
      setStatus('idle');
      AudioEngine.playMoveSound(); // Just a little sound effect
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      haptics.error();
      return;
    }

    setIsSaving(true);
    haptics.medium();
    
    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (apiKey.startsWith('AIza')) {
      localStorage.setItem('retroos_gemini_key', apiKey.trim());
      setStatus('success');
      haptics.success();
      AudioEngine.playSuccessSound();
      
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } else {
      setStatus('error');
      haptics.error();
    }
    
    setIsSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-950 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Brain className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Neural Engine Copilot</h2>
                  <p className="text-xs text-emerald-400 font-mono">BYOK (Bring Your Own Key)</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-4">
                <Shield className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-sm text-zinc-300">
                  <p className="mb-2">
                    Para garantizar un rendimiento óptimo y privacidad total, el <strong>Motor de Recomendación IA</strong> y el <strong>Coach Neural</strong> requieren tu propia clave de API de Google Gemini.
                  </p>
                  <p className="text-emerald-400 font-medium">
                    Tu clave se guarda localmente en tu navegador y nunca se envía a nuestros servidores.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-zinc-400" />
                    Gemini API Key
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    Obtener clave gratis <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setStatus('idle');
                    }}
                    placeholder="AIzaSy..."
                    className={`w-full bg-zinc-900 border ${status === 'error' ? 'border-red-500' : status === 'success' ? 'border-emerald-500' : 'border-white/10 focus:border-emerald-500'} rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors`}
                  />
                  {status === 'success' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                  )}
                  {status === 'error' && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                  )}
                </div>
                
                {status === 'error' && (
                  <p className="text-xs text-red-400">La clave ingresada no parece ser válida. Debe comenzar con "AIza".</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-zinc-900/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim()}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                {isSaving ? 'Sincronizando...' : 'Sincronizar Núcleo'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
