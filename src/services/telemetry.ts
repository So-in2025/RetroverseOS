import { sentinel } from './sentinel';

type TelemetryEvent = {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
};

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private isProcessing: boolean = false;
  private flushInterval: number = 10000; // 10 seconds

  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  public track(name: string, properties?: Record<string, any>) {
    const event: TelemetryEvent = {
      name,
      properties,
      timestamp: Date.now(),
    };

    this.queue.push(event);
    
    // Also log to Sentinel in Dev
    if (import.meta.env.DEV) {
      console.log(`[Telemetry] ${name}`, properties);
      sentinel.logEvent(name, properties);
    }

    // If queue gets too large, flush immediately
    if (this.queue.length >= 50) {
      this.flush();
    }
  }

  private async flush() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const batch = [...this.queue];
    this.queue = [];

    try {
      // In a real app, we would send this to Sentry, PostHog, or a custom endpoint
      // For now, we'll just log that we would send it
      if (import.meta.env.DEV) {
        // console.log(`[Telemetry] Flushing ${batch.length} events...`);
      }
      
      // Example: await fetch('/api/telemetry', { method: 'POST', body: JSON.stringify(batch) });
      
    } catch (e) {
      console.error('[Telemetry] Flush failed', e);
      // Put back in queue if it failed
      this.queue = [...batch, ...this.queue];
    } finally {
      this.isProcessing = false;
    }
  }

  // Specific helpers
  public trackGameStart(gameId: string, system: string, core: string) {
    this.track('game_start', { gameId, system, core });
  }

  public trackGameError(gameId: string, error: string, core: string) {
    this.track('game_error', { gameId, error, core });
  }

  public trackNetplayMatch(gameId: string, roomId: string, latency: number) {
    this.track('netplay_match', { gameId, roomId, latency });
  }
}

export const telemetry = new TelemetryService();
