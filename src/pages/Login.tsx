import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { Gamepad2, Lock, ArrowRight, Power, Cpu, ShieldCheck, Terminal, Scan, Loader2, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  const [bootStep, setBootStep] = useState(0);
  
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Simulated Boot Sequence
  useEffect(() => {
    const steps = [
      { t: 500, action: () => setBootStep(1) },
      { t: 1200, action: () => setBootStep(2) },
      { t: 2000, action: () => setBootStep(3) },
      { t: 2800, action: () => setBootSequence(false) }
    ];

    let timeouts: NodeJS.Timeout[] = [];
    steps.forEach(step => {
      timeouts.push(setTimeout(step.action, step.t));
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoggingIn(false);
    }
  };

  const handleTestLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError('');
      await signInWithGoogle(); // This now calls mockSignIn if supabase is null
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white font-mono overflow-hidden relative selection:bg-cyan-electric selection:text-black flex items-center justify-center">
      {/* Background Grid & Noise */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,242,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 animate-pulse pointer-events-none" />
      
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-electric/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {bootSequence ? (
          <motion.div 
            key="boot"
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black"
          >
            <div className="w-96 space-y-4">
              <div className="flex items-center gap-4 mb-8">
                <Power className="w-12 h-12 text-cyan-electric animate-pulse" />
                <div>
                  <h1 className="text-3xl font-black tracking-tighter italic">RETROVERSE <span className="text-cyan-electric">OS</span></h1>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">Inicialización del Sistema</p>
                </div>
              </div>

              <div className="space-y-2 font-mono text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>CARGANDO_KERNEL</span>
                  <span className={bootStep >= 0 ? "text-emerald-500" : "text-zinc-700"}>{bootStep >= 0 ? "[OK]" : "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span>VERIFICACIÓN_MEMORIA</span>
                  <span className={bootStep >= 1 ? "text-emerald-500" : "text-zinc-700"}>{bootStep >= 1 ? "[OK]" : "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span>INTERFAZ_GPU</span>
                  <span className={bootStep >= 2 ? "text-emerald-500" : "text-zinc-700"}>{bootStep >= 2 ? "[OK]" : "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span>HANDSHAKE_SEGURIDAD</span>
                  <span className={bootStep >= 3 ? "text-emerald-500" : "text-zinc-700"}>{bootStep >= 3 ? "[OK]" : "..."}</span>
                </div>
              </div>

              <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden mt-8">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                  className="h-full bg-cyan-electric shadow-[0_0_10px_rgba(0,242,255,0.8)]"
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className="relative z-10 w-full max-w-md flex flex-col items-center justify-center"
          >
            {/* Main Login Interface */}
            <div className="w-full relative group">
              {/* Holographic Border Effect */}
              <div className="absolute -inset-1 bg-gradient-to-b from-cyan-electric/20 to-transparent rounded-3xl opacity-50 blur-sm pointer-events-none" />
              
              <div className="relative bg-black/90 backdrop-blur-3xl border border-white/10 rounded-3xl p-12 shadow-2xl overflow-hidden">
                {/* Scanline Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none opacity-30 bg-[size:100%_2px,3px_100%]" />

                <div className="relative z-10 flex flex-col items-center">
                  {/* Header Icon */}
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8 relative"
                  >
                    <div className="absolute inset-0 bg-cyan-electric blur-xl opacity-20 rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 rounded-2xl bg-zinc-900 border border-cyan-electric/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.1)]">
                      <Scan className="w-12 h-12 text-cyan-electric" />
                    </div>
                  </motion.div>

                  <h1 className="text-3xl font-black text-white tracking-tighter italic mb-1 text-center">
                    VERIFICACIÓN DE <span className="text-cyan-electric">IDENTIDAD</span>
                  </h1>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mb-10 text-center">
                    Puerta de Enlace Segura v2.0 // OAuth 2.0 Habilitado
                  </p>

                  <div className="w-full space-y-6">
                    <AnimatePresence>
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 bg-rose-500/10 border-l-2 border-rose-500 text-rose-500 text-[10px] font-bold text-center uppercase tracking-widest"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="group w-full py-5 bg-white text-black rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-electric transition-all shadow-lg hover:shadow-[0_0_40px_rgba(0,242,255,0.4)] flex items-center justify-center gap-3 relative overflow-hidden mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {isLoggingIn ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Conectando...
                          </>
                        ) : (
                          <>
                            Iniciar sesión con Google <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </span>
                    </button>

                    {!supabase && (
                      <button
                        onClick={handleTestLogin}
                        className="group w-full py-5 bg-zinc-800 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-700 transition-all shadow-lg flex items-center justify-center gap-3 relative overflow-hidden mt-4"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <UserIcon className="w-4 h-4" />
                          Iniciar sesión de prueba <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </button>
                    )}

                    <p className="text-[9px] text-zinc-600 text-center uppercase tracking-widest leading-relaxed">
                      Al acceder a esta terminal, aceptas los <br />
                      <span className="text-zinc-400">Términos de Servicio de Retroverse OS</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Status */}
            <div className="mt-12 flex items-center justify-center gap-8 text-[10px] font-mono text-zinc-600 uppercase tracking-widest w-full">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                RED: EN LÍNEA
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3" />
                CPU: 12%
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-electric/50" />
                VER: 2.0.1
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
