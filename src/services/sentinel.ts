
import { NetplayRoom } from './netplayService';
import { db, auth, ensureAuth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from 'firebase/firestore';

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
  emulatorLogs: any[];
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
    navigationHistory: [],
    emulatorLogs: []
  };

  private isEnabled = false;
  private blacklist: Set<string> = new Set();
  private errorAggregation: Map<string, { count: number; firstSeen: string; lastSeen: string; details: any }> = new Map();
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  constructor() {
    this.report.performance.loadTime = performance.now();
    this.loadBlacklist();
  }

  public setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
  }

  private aggregateError(type: string, key: string, details: any) {
    const aggregateKey = `${type}:${key}`;
    const now = new Date().toISOString();
    
    if (this.errorAggregation.has(aggregateKey)) {
      const existing = this.errorAggregation.get(aggregateKey)!;
      existing.count++;
      existing.lastSeen = now;
      existing.details = details; // Update with latest details
    } else {
      this.errorAggregation.set(aggregateKey, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        details
      });
    }

    // If it's a high-frequency error, maybe auto-blacklist or take action
    const agg = this.errorAggregation.get(aggregateKey)!;
    if (agg.count >= 10 && type === 'network_404' && details?.url) {
      this.addToBlacklist(details.url, 'High frequency 404');
    }
  }

  private loadBlacklist() {
    try {
      const stored = localStorage.getItem('sentinel_blacklist');
      if (stored) {
        const urls = JSON.parse(stored);
        this.blacklist = new Set(urls);
        console.log(`🛡️ [SENTINEL] Blacklist cargada: ${this.blacklist.size} URLs bloqueadas.`);
      }
    } catch (e) {
      console.warn('[SENTINEL] Fallo al cargar blacklist:', e);
    }
  }

  private saveBlacklist() {
    try {
      localStorage.setItem('sentinel_blacklist', JSON.stringify(Array.from(this.blacklist)));
    } catch (e) {
      // Silent fail
    }
  }

  public addToBlacklist(url: string, reason: string) {
    if (!url) return;
    if (this.blacklist.has(url)) return;

    this.blacklist.add(url);
    console.warn(`🚫 [SENTINEL] URL añadida a blacklist: ${url} (Motivo: ${reason})`);
    this.saveBlacklist();
    
    this.report.errors.push({
      type: 'blacklist_add',
      url,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  public isBlacklisted(url: string): boolean {
    if (!url) return false;
    return this.blacklist.has(url);
  }

  public start() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    
    // Use requestIdleCallback if available, otherwise fallback to setTimeout
    const scheduler = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1000));

    scheduler(() => {
      console.log('🚀 [SENTINEL] Iniciando auditoría en segundo plano (Baja Prioridad)...');
      this.setupErrorCapture();
      this.setupNetworkInterception();
      this.setupImageMonitoring();
      this.setupPerformanceMonitoring();
      
      // Periodic reporting (every 60s)
      setInterval(() => this.sendReport(), 60000);
    });
  }

  private async sendReport() {
    if (!this.isEnabled) return;
    
    // Convert aggregation to report format
    const aggregatedErrors: any[] = [];
    this.errorAggregation.forEach((val, key) => {
      if (val.count > 1) {
        aggregatedErrors.push({
          type: 'aggregated_error',
          key,
          ...val
        });
      }
    });

    // Only send if there's something to report
    if (this.report.errors.length === 0 && 
        this.report.networkFailures.length === 0 && 
        this.report.imageFailures.length === 0 &&
        this.report.romFailures.length === 0 &&
        aggregatedErrors.length === 0) return;

    try {
      const reportData = {
        ...this.getFullReport(),
        aggregatedErrors,
        userId: auth.currentUser?.uid || 'anonymous',
        timestamp: serverTimestamp()
      };

      // 1. Send to local API (Legacy/Backup)
      fetch('/api/sentinel/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      }).catch(() => {}); // Ignore local API failures
      
      // 2. Send to Firestore (Global Hive Mind)
      await ensureAuth();
      await addDoc(collection(db, 'telemetry'), {
        userId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
        type: 'error',
        details: reportData
      });
      
      // Clear reported items to avoid duplicates
      this.report.errors = [];
      this.report.networkFailures = [];
      this.report.imageFailures = [];
      this.report.romFailures = [];
      // We keep aggregation but maybe reset counts or clear old ones
      if (aggregatedErrors.length > 0) {
        // Optional: clear aggregation after successful report to avoid bloat
        // this.errorAggregation.clear();
      }
    } catch (e) {
      // Silent fail to avoid infinite loops or blocking the app
    }
  }

  private setupErrorCapture() {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      try {
        const messageStr = args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return '[Circular or Unserializable Object]';
            }
          }
          return String(arg);
        }).join(' ');

        // Ignore benign Vite websocket errors in AI Studio
        if (!messageStr.includes('[vite] failed to connect to websocket') && !messageStr.includes('WebSocket closed without opened')) {
          this.report.errors.push({
            type: 'console.error',
            message: messageStr,
            timestamp: new Date().toISOString(),
            stack: new Error().stack
          });
        }
      } catch (e) {
        // Fallback if even the logging fails
      }
      originalConsoleError.apply(console, args);
    };

    const originalOnerror = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const msgStr = String(message);
      if (!msgStr.includes('[vite] failed to connect to websocket') && !msgStr.includes('WebSocket closed without opened')) {
        this.report.errors.push({
          type: 'window.onerror',
          message: msgStr,
          source,
          lineno,
          colno,
          stack: error?.stack,
          timestamp: new Date().toISOString()
        });
      }
      
      if (typeof originalOnerror === 'function') {
        return originalOnerror(message, source, lineno, colno, error);
      }
      return false;
    };

    const originalOnunhandledrejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      const reasonStr = String(event.reason);
      if (!reasonStr.includes('WebSocket closed without opened') && !reasonStr.includes('[vite] failed to connect to websocket')) {
        this.report.errors.push({
          type: 'unhandledrejection',
          reason: reasonStr,
          timestamp: new Date().toISOString()
        });
      }
      
      if (typeof originalOnunhandledrejection === 'function') {
        originalOnunhandledrejection.call(window, event);
      }
    };
  }

  private setupNetworkInterception() {
    // Disabled fetch interception as it might be breaking Nostalgist core fetching
    return;
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
      if (this.report.imageFailures.length > 50) this.report.imageFailures.shift();
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

  public async reportGameStatus(gameId: string, status: 'compatible' | 'unstable' | 'broken', details?: any) {
    try {
      await ensureAuth();
      const gameRef = doc(db, 'global_catalog', gameId);
      
      // Update global status with atomic increments for reliability scoring
      await setDoc(gameRef, {
        gameId,
        status,
        lastVerifiedAt: serverTimestamp(),
        successCount: increment(status === 'compatible' ? 1 : 0),
        failureCount: increment(status === 'broken' ? 1 : 0),
        details: details || {}
      }, { merge: true });

      console.log(`[Sentinel] Global status reported for ${gameId}: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `global_catalog/${gameId}`);
    }
  }

  public logEmulator(core: string, gameId: string, event: string, details?: any) {
    const logEntry = {
      timestamp: Date.now(),
      core,
      gameId,
      event,
      details
    };

    if (!this.report.emulatorLogs) {
      this.report.emulatorLogs = [];
    }
    this.report.emulatorLogs.push(logEntry);

    if (this.logLevel === 'debug' || this.logLevel === 'info') {
      console.log(`[Sentinel][Emulator][${core}] ${gameId}: ${event}`, details || '');
    }

    // If it's a crash or critical error, aggregate it
    if (event.toLowerCase().includes('error') || event.toLowerCase().includes('fail') || event.toLowerCase().includes('crash')) {
      this.aggregateError('emulator_error', `${core}_${event}`, { core, gameId, ...details });
    }
  }

  public logRomFetch(gameId: string, url: string, status: 'start' | 'success' | 'error', details?: any) {
    if (status === 'error') {
      const errorKey = details?.message || 'unknown_error';
      this.aggregateError('rom_fetch_error', errorKey, { gameId, url, details });

      // Only log to console if log level allows
      if (this.logLevel === 'debug' || this.logLevel === 'info') {
        console.warn(`⚠️ [SENTINEL] Fallo en descarga de ROM (${gameId}): ${errorKey}`);
      }

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
