import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Users, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../../services/AuthContext';
import { supabase } from '../../services/supabase';
import { haptics } from '../../services/haptics';

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
}

export default function ChatPanel({ isOpen, onClose, gameId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineCount, setOnlineCount] = useState(1);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !gameId) return;

    // Load recent messages
    const fetchMessages = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('game_chat')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) {
        setMessages(data.reverse());
        scrollToBottom();
      }
    };

    fetchMessages();

    // Subscribe to new messages
    if (!supabase) return;
    const channel = supabase
      .channel(`chat_${gameId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'game_chat',
        filter: `game_id=eq.${gameId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
        scrollToBottom();
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length || 1);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({ user_id: user.id, name: user.user_metadata?.name || 'Ronin' });
        }
      });

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen, gameId, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setNewMessage('');
    haptics.light();

    if (supabase) {
      await supabase.from('game_chat').insert([{
        game_id: gameId,
        user_id: user.id,
        user_name: user.user_metadata?.name || 'Ronin',
        content
      }]);
    }
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
            className="relative w-full max-w-md h-[80vh] flex flex-col bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Lobby Global</h2>
                  <div className="flex items-center gap-1 text-xs text-indigo-400">
                    <Users className="w-3 h-3" />
                    <span>{onlineCount} Ronins conectados</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <MessageSquare className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No hay mensajes aún.</p>
                  <p className="text-xs">¡Sé el primero en saludar!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = user?.id === msg.user_id;
                  return (
                    <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-zinc-500 mb-1 px-1">{msg.user_name}</span>
                      <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-sm' 
                          : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-zinc-900/50">
              {!user ? (
                <div className="text-center p-3 bg-zinc-800/50 rounded-xl text-sm text-zinc-400">
                  Inicia sesión para chatear
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
