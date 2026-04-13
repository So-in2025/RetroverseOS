import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { GameObject } from './metadataNormalization';

export interface GlobalGameStatus {
  gameId: string;
  status: 'compatible' | 'unstable' | 'broken' | 'untested';
  reliabilityScore: number;
  lastVerifiedAt: any;
  romUrl?: string;
  emulatorCore?: string;
  successCount: number;
  failureCount: number;
}

export interface GlobalConfig {
  masterArchiveId: string;
  maintenanceMode: boolean;
  minAppVersion: string;
  archiveRedirects?: Record<string, string>;
}

class HiveMindService {
  private config: GlobalConfig = {
    masterArchiveId: 'nointro',
    maintenanceMode: false,
    minAppVersion: '1.0.0'
  };

  constructor() {
    this.listenToConfig();
  }

  private listenToConfig() {
    const configRef = doc(db, 'config', 'global');
    onSnapshot(configRef, (snapshot: any) => {
      if (snapshot.exists()) {
        this.config = snapshot.data() as GlobalConfig;
        console.log('[HiveMind] Global config updated:', this.config);
      }
    }, (error: any) => {
      console.warn('[HiveMind] Failed to listen to global config:', error);
    });
  }

  public getConfig() {
    return this.config;
  }

  /**
   * Resolves a URL using global redirects (Mass Replace).
   */
  public resolveUrl(url: string): string {
    if (!url || !this.config.archiveRedirects) return url;
    
    let finalUrl = url;
    for (const [oldId, newId] of Object.entries(this.config.archiveRedirects)) {
      if (finalUrl.includes(`archive.org/download/${oldId}/`)) {
        finalUrl = finalUrl.replace(`archive.org/download/${oldId}/`, `archive.org/download/${newId}/`);
        console.log(`[HiveMind] Mass Replace applied: ${oldId} -> ${newId}`);
      }
    }
    return finalUrl;
  }

  /**
   * Checks the global registry for a game's status.
   */
  public async getGlobalStatus(gameId: string): Promise<GlobalGameStatus | null> {
    try {
      const gameRef = doc(db, 'global_catalog', gameId);
      const snapshot = await getDoc(gameRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data() as GlobalGameStatus;
        // Calculate reliability score: success / (success + failure)
        const total = (data.successCount || 0) + (data.failureCount || 0);
        data.reliabilityScore = total > 0 ? (data.successCount || 0) / total : 0.5;
        return data;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `global_catalog/${gameId}`);
      return null;
    }
  }

  /**
   * Decides if a game should be shown or allowed based on global data.
   */
  public async shouldAllowGame(game: GameObject): Promise<{ allow: boolean; reason?: string }> {
    if (this.config.maintenanceMode) {
      return { allow: false, reason: 'System is under maintenance.' };
    }

    const globalStatus = await this.getGlobalStatus(game.game_id);
    
    if (globalStatus) {
      if (globalStatus.status === 'broken' && globalStatus.reliabilityScore < 0.2) {
        return { allow: false, reason: 'Game is globally reported as broken.' };
      }
    }

    return { allow: true };
  }
}

export const hiveMind = new HiveMindService();
