import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { Gamepad2, Lock, ArrowRight, Power, Cpu, ShieldCheck, Terminal, Scan, Loader2, User as UserIcon, Trophy, Users, History, Zap, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  console.log('📦 [Login] Rendering');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  const [bootStep, setBootStep] = useState(0);
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const { signInWithGoogle, signInAnonymously, signInAsDeveloper, signInWithEmail, signUpWithEmail, user } = useAuth();
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

  const handleGuestLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError('');
      await signInAnonymously();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoggingIn(false);
    }
  };

  const handleDevLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError('');
      await signInAsDeveloper();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    try {
      setIsLoggingIn(true);
      setError('');
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setError('Check your email for confirmation link');
        setIsLoggingIn(false);
      } else {
        await signInWithEmail(email, password);
      }
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

      <AnimatePresence mode="popLayout">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6"
          >
            {/* Hero Section */}
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="space-y-10"
              >
                <div className="space-y-4">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[10px] font-bold uppercase tracking-[0.3em]"
                  >
                    <Zap className="w-3 h-3 animate-pulse" /> Enlace Neural Establecido
                  </motion.div>
                  <h1 className="text-7xl lg:text-9xl font-black italic tracking-tighter leading-none select-none">
                    RETRO<br />
                    <span className="text-cyan-electric drop-shadow-[0_0_30px_rgba(0,242,255,0.3)]">VERSE</span>
                  </h1>
                  <p className="text-xl text-zinc-400 font-light leading-relaxed max-w-lg">
                    La evolución del gaming clásico. Una red global diseñada para revivir la gloria del pasado con la tecnología del futuro.
                  </p>
                </div>

                {/* Pillars with improved visuals */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <motion.div whileHover={{ y: -5 }} className="space-y-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-cyan-electric/50 transition-colors shadow-xl">
                      <History className="w-6 h-6 text-cyan-electric" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-1">Nostalgia</h3>
                      <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-tighter">Acceso instantáneo a la bóveda más grande de la historia.</p>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ y: -5 }} className="space-y-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-magenta-accent/50 transition-colors shadow-xl">
                      <Trophy className="w-6 h-6 text-magenta-accent" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-1">Competencia</h3>
                      <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-tighter">Arena competitiva con MMR global y torneos diarios.</p>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ y: -5 }} className="space-y-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors shadow-xl">
                      <Users className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-1">Comunidad</h3>
                      <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-tighter">Netplay sin lag. Juega con cualquier persona, en cualquier lugar.</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Action Area */}
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="flex flex-col items-center lg:items-end justify-center"
              >
                <div className="w-full max-w-sm relative group">
                  {/* Outer Glow */}
                  <div className="absolute -inset-8 bg-cyan-electric/10 rounded-[60px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  
                  <div className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 lg:p-14 shadow-2xl overflow-hidden">
                    {/* Scanline Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none opacity-20 bg-[size:100%_2px,3px_100%]" />

                    <div className="relative z-10 space-y-10">
                      <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-electric animate-pulse" />
                          <h2 className="text-2xl font-black italic tracking-tight uppercase">Acceso <span className="text-cyan-electric">Global</span></h2>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em]">Protocolo de Enlace Seguro v2.0</p>
                      </div>

                      <div className="space-y-6">
                        <AnimatePresence mode="wait">
                          {!showAuthOptions ? (
                            <motion.button
                              key="enter-btn"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                              onClick={() => setShowAuthOptions(true)}
                              className="group w-full py-8 bg-white text-black rounded-[24px] font-black text-sm uppercase tracking-[0.4em] hover:bg-cyan-electric transition-all shadow-[0_0_60px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(0,242,255,0.5)] flex flex-col items-center justify-center gap-2 relative overflow-hidden"
                            >
                              <span className="relative z-10 flex items-center gap-3">
                                INICIAR ENLACE <ArrowRight className="w-5 h-5 group-hover:translate-x-3 transition-transform" />
                              </span>
                              <span className="text-[8px] text-black/40 font-bold tracking-[0.2em] relative z-10">PRESIONA PARA ACCEDER</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                            </motion.button>
                          ) : showEmailForm ? (
                            <motion.form 
                              key="email-form"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              onSubmit={handleEmailAuth} 
                              className="space-y-4"
                            >
                              <div className="space-y-2">
                                <label className="text-[9px] text-zinc-500 uppercase tracking-widest ml-1">Terminal_ID (Email)</label>
                                <input 
                                  type="email"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  required
                                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-electric/50 transition-colors"
                                  placeholder="user@retroverse.os"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] text-zinc-500 uppercase tracking-widest ml-1">Access_Code (Password)</label>
                                <input 
                                  type="password"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  required
                                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-electric/50 transition-colors"
                                  placeholder="••••••••"
                                />
                              </div>
                              
                              <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full py-4 bg-cyan-electric text-black rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-400 transition-all shadow-lg disabled:opacity-50"
                              >
                                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isSignUp ? 'Crear Cuenta' : 'Acceder')}
                              </button>

                              <div className="flex flex-col gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsSignUp(!isSignUp)}
                                  className="text-[9px] text-zinc-500 uppercase tracking-widest hover:text-cyan-electric transition-colors"
                                >
                                  {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowEmailForm(false)}
                                  className="text-[9px] text-zinc-400 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-1"
                                >
                                  <ArrowRight className="w-3 h-3 rotate-180" /> Volver
                                </button>
                              </div>
                            </motion.form>
                          ) : (
                            <motion.div 
                              key="auth-options"
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-4"
                            >
                              <button
                                onClick={handleGoogleLogin}
                                disabled={isLoggingIn}
                                className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-electric transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Globe className="w-5 h-5" /> Google Auth</>}
                              </button>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <button
                                  onClick={handleGuestLogin}
                                  disabled={isLoggingIn}
                                  className="py-5 bg-zinc-800/50 border border-white/5 text-zinc-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  <UserIcon className="w-4 h-4" /> Invitado
                                </button>
                                <button
                                  onClick={handleDevLogin}
                                  disabled={isLoggingIn}
                                  className="py-5 bg-zinc-800/50 border border-cyan-electric/20 text-cyan-electric rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-cyan-electric/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  <Terminal className="w-4 h-4" /> Dev
                                </button>
                              </div>

                              <button
                                onClick={() => setShowEmailForm(true)}
                                className="w-full py-4 bg-zinc-900 border border-white/10 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                <Terminal className="w-4 h-4" /> Email Login
                              </button>

                              <button
                                onClick={() => setShowAuthOptions(false)}
                                className="w-full py-2 text-[9px] text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors flex items-center justify-center gap-2"
                              >
                                <ArrowRight className="w-3 h-3 rotate-180" /> VOLVER AL PANEL PRINCIPAL
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[9px] text-zinc-600 text-center uppercase tracking-widest leading-relaxed">
                          Al acceder, confirmas tu enlace con la red <br />
                          <span className="text-zinc-400">Retroverse OS Global Network</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>


            {/* Footer Status */}
            <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  RED: EN LÍNEA
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <Cpu className="w-3 h-3" />
                  CPU: 12%
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="hidden md:block">ESTADO: LISTO PARA ENLACE</div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-electric/50" />
                  VER: 2.0.1
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
