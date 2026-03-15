import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Download, Trash2, Clock, X, Cloud, CloudUpload, CloudDownload, Loader2 } from 'lucide-react';
import { emulator } from '../../services/emulator';
import { SaveState } from '../../services/storage';
import { saveService } from '../../services/saveService';
import { useAuth } from '../../services/AuthContext';
import { useParams } from 'react-router-dom';

interface SaveStatePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SaveStatePanel({ isOpen, onClose }: SaveStatePanelProps) {
  const [states, setStates] = useState<SaveState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();
  const { gameId } = useParams();

  useEffect(() => {
    if (isOpen) {
      loadStates();
    }
  }, [isOpen]);

  const loadStates = async () => {
    const fetchedStates = await emulator.getSaveStates();
    setStates(fetchedStates);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await emulator.saveState('manual');
    await loadStates();
    setIsSaving(false);
  };

  const handleCloudSync = async (state: SaveState) => {
    if (!user || !gameId) return;
    setIsSyncing(true);
    try {
      // RetroArch save states can be large, but for now we assume they fit in the table
      // In a real app, we'd use Supabase Storage
      await saveService.uploadSave(user.id, gameId, JSON.stringify(state));
      alert('Progreso sincronizado con la Nube.');
    } catch (err) {
      console.error('Cloud sync error:', err);
      alert('Error al sincronizar con la nube.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoad = async (id: string) => {
    await emulator.loadState(id);
    onClose();
  };

  const handleDelete = async (id: string) => {
    await emulator.deleteSaveState(id);
    await loadStates();
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-950/90 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase italic tracking-tighter">
                  <Save className="w-5 h-5 text-cyan-electric" />
                  ESTADOS DE GUARDADO
                </h2>
                <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">Gestiona tu progreso táctico</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-b border-white/10 space-y-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                  isSaving 
                    ? 'bg-emerald-900/50 text-emerald-700 cursor-wait' 
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'GUARDANDO...' : 'CREAR PUNTO DE CONTROL'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
              {states.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                  <Save className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No hay registros de guardado</p>
                </div>
              ) : (
                states.map((state) => (
                  <div 
                    key={state.id} 
                    className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-electric/30 transition-all group"
                  >
                    <div className="aspect-video bg-black relative">
                      {state.screenshot ? (
                        <img src={state.screenshot} alt="Save State" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-800 font-black text-[10px] uppercase tracking-widest">SIN PREVISUALIZACIÓN</div>
                      )}
                      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-cyan-electric border border-white/10 uppercase tracking-widest">
                        {state.type}
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between bg-zinc-900/80">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(state.timestamp)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCloudSync(state)}
                          disabled={isSyncing}
                          className="p-2.5 bg-cyan-electric/10 text-cyan-electric hover:bg-cyan-electric hover:text-black rounded-xl transition-all border border-cyan-electric/20"
                          title="Sincronizar con la Nube"
                        >
                          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleLoad(state.id)}
                          className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-xl transition-all border border-emerald-500/20"
                          title="Cargar Estado"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(state.id)}
                          className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
