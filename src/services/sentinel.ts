
import { NetplayRoom } from './netplayService';

export interface SentinelReport {
  timestamp: string;
  errors: any[];
  imageFailures: any[];
  networkFailures: any[];
  romFailures: any[];
  multiplayerStatus: string;
  performance: {
    loadTime: number;
    fpsDrops: number;
  };
  navigationHistory: string[];
}

class SentinelService {
  private report: SentinelReport = {
    timestamp: new Date().toISOString(),
    errors: [],
    imageFailures: [],
    networkFailures: [],
    romFailures: [],
    multiplayerStatus: 'unknown',
    performance: {
      loadTime: 0,
      fpsDrops: 0
    },
    navigationHistory: []
  };

  private isEnabled = false;

  constructor() {
    this.report.performance.loadTime = performance.now();
  }

  public start() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    
    // Delay initialization to avoid blocking the main thread during boot
    setTimeout(() => {
      console.log('🚀 [SENTINEL] Iniciando auditoría en tiempo real...');
      this.setupErrorCapture();
      this.setupNetworkInterception();
      this.setupImageMonitoring();
      this.setupPerformanceMonitoring();
      
      // Periodic reporting (every 60s)
      setInterval(() => this.sendReport(), 60000);
    }, 100);
  }

  private async sendReport() {
    if (!this.isEnabled) return;
    
    // Only send if there's something to report
    if (this.report.errors.length === 0 && 
        this.report.networkFailures.length === 0 && 
        this.report.imageFailures.length === 0 &&
        this.report.romFailures.length === 0) return;

    try {
      const reportData = this.getFullReport();
      await fetch('/api/sentinel/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      
      // Clear reported items to avoid duplicates
      this.report.errors = [];
      this.report.networkFailures = [];
      this.report.imageFailures = [];
      this.report.romFailures = [];
    } catch (e) {
      // Silent fail to avoid infinite loops or blocking the app
    }
  }

  private setupErrorCapture() {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      try {
        this.report.errors.push({
          type: 'console.error',
          message: args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
              try {
                return JSON.stringify(arg);
              } catch (e) {
                return '[Circular or Unserializable Object]';
              }
            }
            return String(arg);
          }).join(' '),
          timestamp: new Date().toISOString(),
          stack: new Error().stack
        });
      } catch (e) {
        // Fallback if even the logging fails
      }
      originalConsoleError.apply(console, args);
    };

    const originalOnerror = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this.report.errors.push({
        type: 'window.onerror',
        message: String(message),
        source,
        lineno,
        colno,
        stack: error?.stack,
        timestamp: new Date().toISOString()
      });
      
      if (typeof originalOnerror === 'function') {
        return originalOnerror(message, source, lineno, colno, error);
      }
      return false;
    };

    const originalOnunhandledrejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      this.report.errors.push({
        type: 'unhandledrejection',
        reason: String(event.reason),
        timestamp: new Date().toISOString()
      });
      
      if (typeof originalOnunhandledrejection === 'function') {
        originalOnunhandledrejection.call(window, event);
      }
    };
  }

  private setupNetworkInterception() {
    try {
      // Check if fetch is even available and if we can modify it
      const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
      if (descriptor && descriptor.configurable === false) {
        console.warn('⚠️ [SENTINEL] fetch no es configurable, saltando interceptación.');
        return;
      }

      const originalFetch = window.fetch;
      if (typeof originalFetch !== 'function') return;

      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get: () => async (...args: any[]) => {
          const start = performance.now();
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
          
          try {
            const response = await originalFetch.apply(window, args as any);
            const duration = performance.now() - start;
            
            if (!response.ok) {
              this.report.networkFailures.push({
                url,
                status: response.status,
                statusText: response.statusText,
                duration,
                timestamp: new Date().toISOString()
              });
            }
            
            return response;
          } catch (error) {
            const duration = performance.now() - start;
            this.report.networkFailures.push({
              url,
              error: String(error),
              duration,
              timestamp: new Date().toISOString()
            });
            throw error;
          }
        }
      });
    } catch (e) {
      console.warn('⚠️ [SENTINEL] No se pudo interceptar fetch (propiedad protegida).');
    }
  }

  private setupImageMonitoring() {
    if (!document.body) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            this.monitorImage(node);
          } else if (node instanceof HTMLElement) {
            node.querySelectorAll('img').forEach(img => this.monitorImage(img));
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('img').forEach(img => this.monitorImage(img));
  }

  private monitorImage(img: HTMLImageElement) {
    if (img.dataset.sentinelMonitored) return;
    img.dataset.sentinelMonitored = 'true';

    const start = performance.now();
    
    img.addEventListener('load', () => {
      const duration = performance.now() - start;
      // We don't log successes to keep report clean, but we could
    });

    img.addEventListener('error', () => {
      const duration = performance.now() - start;
      this.report.imageFailures.push({
        src: img.src,
        duration,
        timestamp: new Date().toISOString(),
        alt: img.alt
      });
    });
  }

  private setupPerformanceMonitoring() {
    let lastTime = performance.now();
    let frames = 0;
    
    const checkFps = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        if (fps < 30) {
          this.report.performance.fpsDrops++;
        }
        frames = 0;
        lastTime = now;
      }
      requestAnimationFrame(checkFps);
    };
    
    requestAnimationFrame(checkFps);
  }

  public logRomFetch(gameId: string, url: string, status: 'start' | 'success' | 'error', details?: any) {
    if (status === 'error') {
      this.report.romFailures.push({
        gameId,
        url,
        details,
        timestamp: new Date().toISOString()
      });
    }
  }

  public logMultiplayer(status: string, details?: any) {
    this.report.multiplayerStatus = status;
    if (details?.error) {
      this.report.errors.push({
        type: 'multiplayer',
        message: details.error,
        timestamp: new Date().toISOString()
      });
    }
  }

  public logNavigation(path: string) {
    this.report.navigationHistory.push(path);
  }

  public logEvent(name: string, properties?: any) {
    this.report.errors.push({
      type: 'event',
      name,
      properties,
      timestamp: new Date().toISOString()
    });
  }

  public getFullReport(): SentinelReport {
    return {
      ...this.report,
      timestamp: new Date().toISOString()
    };
  }

  public async runAutoTraversal(navigate: (path: string) => void) {
    console.log('🕵️ [SENTINEL] Iniciando recorrido automático de alta intensidad...');
    
    const routes = [
      { path: '/', name: 'Library' },
      { path: '/netplay', name: 'Multiplayer' },
      { path: '/settings', name: 'Settings' },
      { path: '/profile', name: 'Profile' },
      { path: '/marketplace', name: 'Marketplace' }
    ];

    for (const route of routes) {
      console.log(`📍 [SENTINEL] Probando ruta: ${route.name} (${route.path})`);
      navigate(route.path);
      this.logNavigation(route.path);
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Acciones específicas por ruta
      if (route.path === '/') {
        const gameCards = document.querySelectorAll('[data-game-id]');
        console.log(`📊 [SENTINEL] Juegos detectados en biblioteca: ${gameCards.length}`);
        if (gameCards.length > 0) {
          const firstGame = gameCards[0] as HTMLElement;
          console.log('🎮 [SENTINEL] Simulando apertura de detalle de juego');
          firstGame.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Intentar click en botón de jugar si existe
          const playBtn = document.querySelector('button:contains("Jugar"), .bg-cyan-electric');
          if (playBtn) {
            console.log('🕹️ [SENTINEL] Simulando inicio de juego');
            (playBtn as HTMLElement).click();
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          navigate('/');
        }
      }

      if (route.path === '/netplay') {
        const createBtn = document.querySelector('button:contains("Crear"), .bg-rose-500');
        if (createBtn) {
          console.log('🌐 [SENTINEL] Simulando creación de sala multiplayer');
          (createBtn as HTMLElement).click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    const finalReport = this.getFullReport();
    console.log('✅ [SENTINEL] Auditoría completada.');
    console.log('📊 [SENTINEL] REPORTE FINAL:', finalReport);
    
    // Send final report immediately
    await this.sendReport();
    
    // Auto-descarga del reporte en consola para el usuario
    if (finalReport.errors.length > 0 || finalReport.networkFailures.length > 0) {
      console.warn('⚠️ [SENTINEL] Se detectaron fallos críticos durante la auditoría.');
    }
  }
}

export const sentinel = new SentinelService();
