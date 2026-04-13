import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, limit, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Shield, Activity, Link as LinkIcon, Database, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { hiveMind, GlobalConfig, GlobalGameStatus } from '../services/hiveMind';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [catalogStats, setCatalogStats] = useState({ total: 0, broken: 0, compatible: 0 });
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  
  // Mass Replace Form
  const [oldId, setOldId] = useState('');
  const [newId, setNewId] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (user && user.email === 'jg.hardcore.builds@gmail.com' && user.emailVerified) {
        setIsAdmin(true);
        await loadData();
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  const loadData = async () => {
    try {
      // Load Telemetry
      const q = query(collection(db, 'telemetry'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      setTelemetry(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load Catalog Stats (Approximate for now)
      const catQ = query(collection(db, 'global_catalog'), limit(1000));
      const catSnap = await getDocs(catQ);
      let broken = 0;
      let compatible = 0;
      catSnap.docs.forEach(d => {
        const data = d.data() as GlobalGameStatus;
        if (data.status === 'broken') broken++;
        if (data.status === 'compatible') compatible++;
      });
      setCatalogStats({ total: catSnap.size, broken, compatible });

      // Load Config
      setConfig(hiveMind.getConfig());
    } catch (e) {
      console.error('Failed to load admin data', e);
    }
  };

  const handleAddRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldId || !newId || !config) return;

    try {
      const newRedirects = { ...(config.archiveRedirects || {}), [oldId]: newId };
      await setDoc(doc(db, 'config', 'global'), { archiveRedirects: newRedirects }, { merge: true });
      setConfig({ ...config, archiveRedirects: newRedirects });
      setOldId('');
      setNewId('');
      alert('Redirect added successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to add redirect.');
    }
  };

  const handleRemoveRedirect = async (keyToRemove: string) => {
    if (!config || !config.archiveRedirects) return;
    try {
      const newRedirects = { ...config.archiveRedirects };
      delete newRedirects[keyToRemove];
      await updateDoc(doc(db, 'config', 'global'), { archiveRedirects: newRedirects });
      setConfig({ ...config, archiveRedirects: newRedirects });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading Admin...</div>;
  if (!isAdmin) return <div className="p-8 text-red-500">Access Denied. Admin privileges required.</div>;

  return (
    <div className="p-8 text-white max-w-7xl mx-auto space-y-8">
      <div className="flex items-center space-x-4 mb-8">
        <Shield className="w-10 h-10 text-cyan-400" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hive Mind Command Center</h1>
          <p className="text-gray-400">Global Telemetry & Catalog Management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Global Catalog</h3>
          </div>
          <div className="text-3xl font-bold mb-4">{catalogStats.total} <span className="text-sm text-gray-400 font-normal">verified</span></div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-400 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Compatible</span>
              <span>{catalogStats.compatible}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400 flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> Broken</span>
              <span>{catalogStats.broken}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm md:col-span-2">
          <div className="flex items-center space-x-3 mb-4">
            <LinkIcon className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">Mass Link Replacement (Global Redirects)</h3>
          </div>
          <form onSubmit={handleAddRedirect} className="flex space-x-4 mb-6">
            <input 
              type="text" 
              placeholder="Old Archive ID (e.g. nointro.gba)" 
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={oldId}
              onChange={e => setOldId(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="New Archive ID" 
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={newId}
              onChange={e => setNewId(e.target.value)}
            />
            <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
              Add Redirect
            </button>
          </form>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Redirects</h4>
            {config?.archiveRedirects && Object.entries(config.archiveRedirects).map(([old, newUrl]) => (
              <div key={old} className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-white/5">
                <div className="flex items-center space-x-3 text-sm">
                  <span className="text-red-400 line-through">{old}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-400">{newUrl}</span>
                </div>
                <button onClick={() => handleRemoveRedirect(old)} className="text-gray-500 hover:text-red-400 transition-colors">
                  Remove
                </button>
              </div>
            ))}
            {(!config?.archiveRedirects || Object.keys(config.archiveRedirects).length === 0) && (
              <div className="text-sm text-gray-500 italic">No active redirects.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-rose-400" />
            <h3 className="font-semibold">Live Telemetry Stream</h3>
          </div>
          <button onClick={loadData} className="text-gray-400 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {telemetry.map((t, i) => (
            <div key={i} className="bg-black/40 p-4 rounded-lg border border-white/5 text-sm">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  t.type === 'error' ? 'bg-red-500/20 text-red-400' : 
                  t.type === 'emulator' ? 'bg-blue-500/20 text-blue-400' : 
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {t.type.toUpperCase()}
                </span>
                <span className="text-gray-500 text-xs">
                  {t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString() : 'Recent'}
                </span>
              </div>
              <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(t.details, null, 2)}
              </pre>
            </div>
          ))}
          {telemetry.length === 0 && (
            <div className="text-center text-gray-500 py-8">No telemetry data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
