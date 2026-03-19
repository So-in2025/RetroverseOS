import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Sparkles, Rocket, ChevronRight, Check, Heart, Zap, Trophy, History } from 'lucide-react';
import { economyService } from '../../services/economyService';
import { useAuth } from '../../services/AuthContext';
import { haptics } from '../../services/haptics';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const GENRES = [
  { id: 'action', label: 'Acción', icon: Zap },
  { id: 'rpg', label: 'RPG', icon: Heart },
  { id: 'platformer', label: 'Plataformas', icon: Trophy },
  { id: 'sports', label: 'Deportes', icon: Gamepad2 },
  { id: 'racing', label: 'Carreras', icon: Rocket },
  { id: 'puzzle', label: 'Puzle', icon: Sparkles },
];

const ERAS = [
  { id: '8bit', label: '8-Bit (NES/Master System)', year: '1983-1989' },
  { id: '16bit', label: '16-Bit (SNES/Genesis)', year: '1990-1995' },
  { id: '32bit', label: '32/64-Bit (PS1/N64)', year: '1996-2000' },
  { id: 'handheld', label: 'Portátiles (GB/GBA)', year: '1989-2004' },
];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<{
    genres: string[];
    era: string;
    playstyle: string;
  }>({
    genres: [],
    era: '',
    playstyle: '',
  });

  const handleGenreToggle = (genreId: string) => {
    haptics.light();
    setPreferences(prev => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId]
    }));
  };

  const handleComplete = async () => {
    haptics.success();
    await economyService.saveUserPreferences(user?.id, preferences);
    await economyService.saveSetting('onboarding_completed', true, user?.id);
    onComplete();
  };

  const steps = [
    {
      title: "Bienvenido a Retroverse OS",
      subtitle: "Configura tu algoritmo de descubrimiento personal.",
      content: (
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-electric/20 blur-3xl rounded-full" />
            <Gamepad2 className="w-24 h-24 text-cyan-electric relative z-10 animate-pulse" />
          </div>
          <p className="text-zinc-400 max-w-xs">
            Nuestra IA de fondo analizará tus gustos para que nunca pierdas tiempo buscando qué jugar.
          </p>
        </div>
      )
    },
    {
      title: "¿Qué géneros te apasionan?",
      subtitle: "Selecciona al menos 2 para mejores resultados.",
      content: (
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {GENRES.map(genre => {
            const Icon = genre.icon;
            const isSelected = preferences.genres.includes(genre.id);
            return (
              <button
                key={genre.id}
                onClick={() => handleGenreToggle(genre.id)}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                  isSelected 
                    ? 'bg-cyan-electric/10 border-cyan-electric text-cyan-electric' 
                    : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-black uppercase tracking-widest">{genre.label}</span>
                {isSelected && <Check className="w-4 h-4 absolute top-2 right-2" />}
              </button>
            );
          })}
        </div>
      )
    },
    {
      title: "Tu Era Dorada",
      subtitle: "¿En qué época te sientes más cómodo?",
      content: (
        <div className="flex flex-col gap-3 w-full max-w-md">
          {ERAS.map(era => {
            const isSelected = preferences.era === era.id;
            return (
              <button
                key={era.id}
                onClick={() => { haptics.light(); setPreferences(prev => ({ ...prev, era: era.id })); }}
                className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${
                  isSelected 
                    ? 'bg-cyan-electric/10 border-cyan-electric text-cyan-electric' 
                    : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'
                }`}
              >
                <div className="text-left">
                  <div className="text-sm font-black uppercase tracking-widest">{era.label}</div>
                  <div className="text-[10px] opacity-50">{era.year}</div>
                </div>
                {isSelected && <Check className="w-5 h-5" />}
              </button>
            );
          })}
        </div>
      )
    },
    {
      title: "Sincronizando Algoritmo...",
      subtitle: "Estamos preparando tu biblioteca personalizada.",
      content: (
        <div className="flex flex-col items-center space-y-8 w-full max-w-xs">
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2 }}
              className="h-full bg-cyan-electric shadow-[0_0_15px_rgba(0,255,242,0.5)]"
            />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-[10px] font-mono text-cyan-electric animate-pulse uppercase tracking-widest">
              Analizando metadatos de {preferences.genres.length} géneros...
            </p>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Priorizando era {preferences.era}...
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950 flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,242,0.05),transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-lg flex flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full flex flex-col items-center text-center space-y-8"
          >
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                {steps[step].title}
              </h1>
              <p className="text-zinc-500 text-sm font-medium">
                {steps[step].subtitle}
              </p>
            </div>

            <div className="w-full py-8 flex justify-center">
              {steps[step].content}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex items-center gap-4 w-full">
          {step > 0 && step < steps.length - 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-4 rounded-2xl border border-white/10 text-zinc-500 font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
            >
              Atrás
            </button>
          )}
          
          {step < steps.length - 1 ? (
            <button
              disabled={step === 1 && preferences.genres.length < 2}
              onClick={() => setStep(s => s + 1)}
              className="flex-1 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 bg-cyan-electric text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-cyan-400 transition-all shadow-[0_0_30px_rgba(0,255,242,0.3)]"
            >
              Entrar al Retroverse
            </button>
          )}
        </div>

        {/* Progress Dots */}
        <div className="mt-8 flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === step ? 'bg-cyan-electric w-4' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
