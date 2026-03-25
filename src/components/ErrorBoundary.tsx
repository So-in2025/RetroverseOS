import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ [ERROR BOUNDARY] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-carbon flex items-center justify-center p-6 text-white font-sans">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full bg-zinc-900 border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Fallo Crítico</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              El sistema ha encontrado una anomalía inesperada. Los datos han sido protegidos.
            </p>
            
            <div className="bg-black/50 rounded-xl p-4 mb-8 text-left overflow-hidden">
              <p className="text-[10px] font-mono text-rose-400/70 uppercase mb-1">Error Log:</p>
              <p className="text-xs font-mono text-zinc-500 break-words">
                {this.state.error?.message || 'Unknown system failure'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={this.handleReset}
                className="py-4 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Reiniciar
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Inicio
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
