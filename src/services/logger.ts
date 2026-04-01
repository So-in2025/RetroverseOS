/**
 * Structured Logger for Production
 * Centralizes all logs to allow future integration with external monitoring services.
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  userId?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, module: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      // userId: auth.currentUser?.uid // Optional: integrate with auth
    };

    // Console output with styling
    const styles = {
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold',
      debug: 'color: #10b981'
    };

    console.log(
      `%c[${entry.timestamp}] [${level.toUpperCase()}] [${module}] %c${message}`,
      styles[level],
      'color: inherit',
      data || ''
    );

    // Store in memory
    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }

    // In production, we would send critical errors to the server
    if (level === 'error') {
      this.reportToServer(entry);
    }
  }

  private async reportToServer(entry: LogEntry) {
    try {
      await fetch('/api/sentinel/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CRITICAL_ERROR',
          ...entry
        })
      });
    } catch (e) {
      // Silent fail to avoid infinite loops
    }
  }

  info(module: string, message: string, data?: any) { this.log('info', module, message, data); }
  warn(module: string, message: string, data?: any) { this.log('warn', module, message, data); }
  error(module: string, message: string, data?: any) { this.log('error', module, message, data); }
  debug(module: string, message: string, data?: any) { this.log('debug', module, message, data); }

  getLogs() { return this.logs; }
}

export const logger = Logger.getInstance();
