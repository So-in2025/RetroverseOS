import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, ThumbsUp, ShieldAlert, Loader2, Send, Zap } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import { BYOKModal } from '../ai/BYOKModal';

interface Tip {
  id: string;
  user: string;
  content: string;
  upvotes: number;
}

interface CommunityTipsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
}

export default function CommunityTipsPanel({ isOpen, onClose, gameId }: CommunityTipsPanelProps) {
  const [activeTab, setActiveTab] = useState<'community' | 'cheats' | 'ai'>('community');
  const [tips, setTips] = useState<Tip[]>([]);
  const [cheats, setCheats] = useState<string | null>(null);
  const [aiGuide, setAiGuide] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newTip, setNewTip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBYOKModal, setShowBYOKModal] = useState(false);
  const [hasBYOK, setHasBYOK] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTips();
      fetchCheats();
      checkAiCache();
      const apiKey = localStorage.getItem('retroos_gemini_key');
      setHasBYOK(!!apiKey && apiKey.startsWith('AIza'));
    }
  }, [isOpen, gameId]);

  const checkAiCache = async () => {
    try {
      const res = await fetch(`/api/tips/ai/${gameId}`);
      const data = await res.json();
      if (data.cached) setAiGuide(data.content);
    } catch (e) {
      console.error(e);
    }
  };

  const requestAiGuide = async () => {
    setIsAiLoading(true);
    try {
      const { aiCoach } = await import('../../services/aiCoaching');
      const guide = await aiCoach.getGameTips(gameId, gameId.replace(/([A-Z])/g, ' $1').trim());
      
      if (guide === "El Coach Neural requiere que configures tu propia API Key (BYOK) en el Marketplace.") {
        setShowBYOKModal(true);
      }
      
      setAiGuide(guide);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchTips = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tips/community/${gameId}`);
      const data = await res.json();
      if (data.tips) setTips(data.tips);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCheats = async () => {
    try {
      const res = await fetch(`/api/cheats/${gameId}`);
      const data = await res.json();
      if (data.found) setCheats(data.content);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpvote = async (tipId: string) => {
    try {
      const res = await fetch(`/api/tips/community/${gameId}/${tipId}/upvote`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTips(tips.map(t => t.id === tipId ? { ...t, upvotes: data.upvotes } : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTip.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tips/community/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Player1', content: newTip })
      });
      const data = await res.json();
      if (data.success) {
        setTips([data.tip, ...tips]);
        setNewTip('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-black/90 backdrop-blur-2xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-cyan-electric" />
              <h2 className="text-lg font-black italic uppercase tracking-widest text-white">
                INTEL <span className="text-cyan-electric">DB</span>
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                activeTab === 'community' ? 'text-cyan-electric border-b-2 border-cyan-electric bg-cyan-electric/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Consejos de la Comunidad
            </button>
            <button
              onClick={() => setActiveTab('cheats')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                activeTab === 'cheats' ? 'text-magenta-accent border-b-2 border-magenta-accent bg-magenta-accent/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Base de Trucos
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                activeTab === 'ai' ? 'text-emerald-500 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Intel IA (Historia y Consejos)
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
            {activeTab === 'community' ? (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-cyan-electric animate-spin" />
                  </div>
                ) : tips.length > 0 ? (
                  tips.map(tip => (
                    <div key={tip.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-cyan-electric">{tip.user}</span>
                        <button 
                          onClick={() => handleUpvote(tip.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-cyan-electric transition-colors"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {tip.upvotes}
                        </button>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{tip.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-mono uppercase tracking-widest">Aún no hay consejos. ¡Sé el primero!</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'cheats' ? (
              <div className="space-y-4">
                {cheats ? (
                  <pre className="text-xs font-mono text-magenta-accent bg-black/50 p-4 rounded-xl border border-magenta-accent/20 overflow-x-auto">
                    {cheats}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-mono uppercase tracking-widest">No se encontraron trucos en la base de datos.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {aiGuide ? (
                  <div className="prose prose-invert prose-sm prose-emerald max-w-none bg-white/5 border border-white/10 rounded-xl p-4">
                    <ReactMarkdown>{aiGuide}</ReactMarkdown>
                    {aiGuide.includes('BYOK') && (
                      <button 
                        onClick={() => setShowBYOKModal(true)}
                        className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all w-full flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Configurar BYOK
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 flex flex-col items-center">
                    <p className="text-xs font-mono text-zinc-400 mb-6">Aún no hay una guía de IA para este juego.</p>
                    <button
                      onClick={requestAiGuide}
                      disabled={isAiLoading}
                      className="px-6 py-3 bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                      {isAiLoading ? 'GENERANDO...' : 'SOLICITAR GUÍA DE IA'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area (Only for Community) */}
          {activeTab === 'community' && (
            <div className="p-4 border-t border-white/10 bg-black/50">
              <form onSubmit={handleSubmitTip} className="flex gap-2">
                <input
                  type="text"
                  value={newTip}
                  onChange={(e) => setNewTip(e.target.value)}
                  placeholder="Comparte un consejo o secreto..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-electric/50"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newTip.trim()}
                  className="p-2 bg-cyan-electric text-black rounded-xl hover:bg-white transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      )}
      
      <BYOKModal 
        isOpen={showBYOKModal}
        onClose={() => setShowBYOKModal(false)}
        onSuccess={() => {
          setHasBYOK(true);
          requestAiGuide(); // Retry automatically
        }}
      />
    </AnimatePresence>
  );
}
