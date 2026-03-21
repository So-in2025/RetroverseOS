import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Download, Trash2, Clock, X, Cloud, CloudUpload, CloudDownload, Loader2, Lock, ShoppingBag } from 'lucide-react';
import { emulator } from '../../services/emulator';
import { SaveState } from '../../services/storage';
import { saveService } from '../../services/saveService';
import { useAuth } from '../../services/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { customization } from '../../services/customization';

interface SaveStatePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SaveStatePanel({ isOpen, onClose }: SaveStatePanelProps) {
  const [states, setStates] = useState<SaveState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [maxSlots, setMaxSlots] = useState(3);
  const [hasCloudSync, setHasCloudSync] = useState(false);
  const { user } = useAuth();
  const { gameId } = useParams();

  useEffect(() => {
    if (isOpen) {
      loadStates();
      checkPermissions();
    }
  }, [isOpen]);

  const checkPermissions = async () => {
    const slots = await customization.getMaxSaveSlots();
    const cloud = await customization.isCloudSyncEnabled();
    setMaxSlots(slots);
    setHasCloudSync(cloud);
  };

  const loadStates = async () => {
    const fetchedStates = await emulator.getSaveStates();
    setStates(fetchedStates);
  };

  const handleSave = async () => {
    if (states.length >= maxSlots) {
      alert(`Has alcanzado el límite de ${maxSlots} slots de guardado. Libera espacio o adquiere la Expansión de Slots en el Marketplace.`);
      return;
    }
    setIsSaving(true);
    await emulator.saveState('manual');
    await loadStates();
    setIsSaving(false);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleCloudSync = async (state: SaveState) => {
    if (!user || !gameId) return;
    if (!hasCloudSync) {
      alert('La Sincronización en la Nube requiere una licencia activa. Visita el Marketplace.');
      return;
    }
    setIsSyncing(true);
    try {
      // Convert Blob to Base64 for JSON serialization
      const base64Data = await blobToBase64(state.stateData);
      const stateToUpload = { ...state, stateData: base64Data };
      
      await saveService.uploadSave(user.id, gameId, JSON.stringify(stateToUpload));
      alert('Progreso sincronizado con la Nube.');
    } catch (err) {
      console.error('Cloud sync error:', err);
      alert('Error al sincronizar con la nube.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudDownload = async () => {
    if (!user || !gameId) return;
    if (!hasCloudSync) {
      alert('La Sincronización en la Nube requiere una licencia activa. Visita el Marketplace.');
      return;
    }
    setIsSyncing(true);
    try {
      const cloudDataStr = await saveService.downloadSave(user.id, gameId);
      if (cloudDataStr) {
        const cloudState = JSON.parse(cloudDataStr);
        // Convert base64 back to Blob
        const res = await fetch(cloudState.stateData);
        const blob = await res.blob();
        
        const newState: SaveState = {
          ...cloudState,
          id: crypto.randomUUID(), // new local ID
          stateData: blob,
          timestamp: Date.now(), // update timestamp to now so it appears at top
          type: 'manual'
        };
        
        // Save to local IndexedDB
        const { storage } = await import('../../services/storage');
        await storage.saveState(newState);
        await loadStates();
        alert('Estado descargado de la nube exitosamente.');
      } else {
        alert('No se encontró ningún estado en la nube para este juego.');
      }
    } catch (err) {
      console.error('Cloud download error:', err);
      alert('Error al descargar de la nube.');
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Slots de Memoria</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${states.length >= maxSlots ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {states.length} / {maxSlots}
                </span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(states.length / maxSlots) * 100}%` }}
                  className={`h-full ${states.length >= maxSlots ? 'bg-rose-500' : 'bg-emerald-500'}`}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                  isSaving 
                    ? 'bg-emerald-900/50 text-emerald-700 cursor-wait' 
                    : states.length >= maxSlots
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : states.length >= maxSlots ? <Lock className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'GUARDANDO...' : states.length >= maxSlots ? 'SLOTS AGOTADOS' : 'CREAR PUNTO DE CONTROL'}
              </button>
              
              <div className="relative group">
                {!hasCloudSync && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link 
                      to="/marketplace" 
                      className="px-4 py-2 bg-cyan-electric text-black text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      DESBLOQUEAR NUBE
                    </Link>
                  </div>
                )}
                <button
                  onClick={handleCloudDownload}
                  disabled={isSyncing || !hasCloudSync}
                  className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                    isSyncing 
                      ? 'bg-cyan-900/20 text-cyan-700 border-cyan-900/30 cursor-wait' 
                      : !hasCloudSync
                        ? 'bg-zinc-900/50 text-zinc-600 border-white/5 cursor-not-allowed'
                        : 'bg-cyan-electric/10 hover:bg-cyan-electric/20 text-cyan-electric border-cyan-electric/30'
                  }`}
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : hasCloudSync ? <CloudDownload className="w-4 h-4" /> : <Cloud className="w-4 h-4 opacity-30" />}
                  {isSyncing ? 'SINCRONIZANDO...' : hasCloudSync ? 'RESTAURAR DESDE LA NUBE' : 'SINCRONIZACIÓN BLOQUEADA'}
                </button>
              </div>
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
