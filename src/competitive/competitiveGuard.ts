export type ViolationType = 'macro_detected' | 'window_blurred' | 'desync' | 'rage_quit';

class CompetitiveGuard {
  private inputTimestamps: number[] = [];
  private isMonitoring = false;
  private onViolationCallback: ((type: ViolationType) => void) | null = null;
  private blurTimeout: NodeJS.Timeout | null = null;

  start(onViolation: (type: ViolationType) => void) {
    this.isMonitoring = true;
    this.onViolationCallback = onViolation;
    this.inputTimestamps = [];

    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);
  }

  stop() {
    this.isMonitoring = false;
    this.onViolationCallback = null;
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    if (this.blurTimeout) clearTimeout(this.blurTimeout);
  }

  private handleBlur = () => {
    if (!this.isMonitoring) return;
    
    // Give them a 3-second grace period before flagging a violation
    this.blurTimeout = setTimeout(() => {
      console.warn('[AntiCheat] Window focus lost for too long during competitive match.');
      this.onViolationCallback?.('window_blurred');
    }, 3000);
  }

  private handleFocus = () => {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
  }

  registerInput() {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    this.inputTimestamps.push(now);

    // Keep only inputs from the last 1000ms (1 second)
    this.inputTimestamps = this.inputTimestamps.filter(t => now - t < 1000);

    // If more than 80 inputs in 1 second, it's highly likely a macro/turbo button
    if (this.inputTimestamps.length > 80) {
      this.onViolationCallback?.('macro_detected');
      this.inputTimestamps = []; // Reset to avoid spamming the callback
    }
  }

  reportDesync() {
    if (!this.isMonitoring) return;
    this.onViolationCallback?.('desync');
  }

  reportRageQuit() {
    if (!this.isMonitoring) return;
    this.onViolationCallback?.('rage_quit');
  }
}

export const competitiveGuard = new CompetitiveGuard();
