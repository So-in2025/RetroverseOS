import { Nostalgist } from 'nostalgist';
import { storage, SaveState } from './storage';
import { RetroButton } from './inputManager';
import { ROMFetchService } from './romFetcher';
import { AudioEngine } from './audioEngine';
import { achievements } from './achievements';
import { customization } from './customization';

// Track AudioContexts created by Nostalgist/RetroArch to forcefully close them on exit
const createdAudioContexts: AudioContext[] = [];
if (typeof window !== 'undefined') {
  const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (OriginalAudioContext) {
    window.AudioContext = function(...args: any[]) {
      const ctx = new OriginalAudioContext(...args);
      createdAudioContexts.push(ctx);
      return ctx;
    } as any;
    window.AudioContext.prototype = OriginalAudioContext.prototype;
    
    if ((window as any).webkitAudioContext) {
      (window as any).webkitAudioContext = window.AudioContext;
    }
  }
}

export interface EmulatorConfig {
  gameId: string;
  core: string;
  romUrl: string;
  canvas: HTMLCanvasElement;
  system?: string;
}

const BIOS_MAP: Record<string, { filename: string, url: string }[]> = {
  'psx': [
    { filename: 'scph5501.bin', url: 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/scph5501.bin' },
    { filename: 'scph5500.bin', url: 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/scph5500.bin' },
    { filename: 'scph5502.bin', url: 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/scph5502.bin' }
  ],
  'ps2': [{ filename: 'scph39001.bin', url: 'https://archive.org/download/ps2-bios-set-usa-japan-europe/SCPH-39001_USA_v01.60(07/02/2002)_v4.bin' }],
  'sega_cd': [{ filename: 'bios_CD_U.bin', url: 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/bios_CD_U.bin' }],
  'atari_7800': [{ filename: '7800 BIOS (U).rom', url: 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/7800%20BIOS%20(U).rom' }],
  'lynx': [{ filename: 'lynxboot.img', url: 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/lynxboot.img' }],
  'pcengine': [{ filename: 'syscard3.pce', url: 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/syscard3.pce' }]
};

const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const CORE_MAP: Record<string, string> = {
  'atari_2600': 'stella',
  'atari_7800': 'prosystem',
  'lynx': 'handy',
  'nes': 'fceumm',
  'snes': isMobileDevice() ? 'snes9x2010' : 'snes9x',
  'sega_genesis': 'genesis_plus_gx',
  'gba': 'vba_next',
  'gbc': 'gambatte',
  'gb': 'gambatte',
  'psx': 'pcsx_rearmed',
  'n64': 'mupen64plus_next',
  'ps2': 'play',
  'mastersystem': 'genesis_plus_gx',
  'gamegear': 'genesis_plus_gx',
  'pcengine': 'mednafen_pce_fast',
  'wonderswan': 'mednafen_wswan',
  'ngp': 'mednafen_ngp'
};

export class EmulatorService {
  private nostalgist: Nostalgist | null = null;
  private isRunning: boolean = false;
  private isInitializing: boolean = false;
  private currentGameId: string | null = null;
  private currentSystem: string | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private sessionStartTime: number | null = null;

  constructor() {}

  /**
   * Prefetches the WASM core files into the browser cache silently.
   */
  public async prefetchCore(system: string) {
    const core = CORE_MAP[(system || '').toLowerCase()];
    if (!core) return;
    
    try {
      // Nostalgist default core URL pattern (jsDelivr)
      const baseUrl = 'https://cdn.jsdelivr.net/gh/libretro/RetroArch@master/pkg/emscripten/retroarch/cores';
      const jsUrl = `${baseUrl}/${core}_libretro.js`;
      const wasmUrl = `${baseUrl}/${core}_libretro.wasm`;
      
      // Fetch to put in browser cache (fire and forget)
      fetch(jsUrl, { mode: 'no-cors' }).catch(() => {});
      fetch(wasmUrl, { mode: 'no-cors' }).catch(() => {});
      console.log(`[Emulator] Prefetching core ${core} in background...`);
    } catch (e) {
      // Ignore errors for prefetching
    }
  }

  async initialize(config: EmulatorConfig, onProgress?: (status: string) => void) {
    if (this.isInitializing) {
      console.warn('[Emulator] Already initializing, skipping duplicate request');
      return;
    }

    this.isInitializing = true;

    try {
      console.log(`[Emulator] Initializing ${config.gameId} with core ${config.core}`);
      
      // Check for SharedArrayBuffer (Required for 3D cores like N64/PSX)
      if (typeof SharedArrayBuffer === 'undefined' || !window.crossOriginIsolated) {
        console.warn('[Emulator] SharedArrayBuffer or Cross-Origin Isolation is not available. 3D cores may fail.');
        if (config.system === 'n64' || config.system === 'psx') {
          onProgress?.('Warning: Browser security might block 3D games. Try reloading...');
        }
      }

      // Force stop any existing instance and wait for it
      await this.stop();

      // Check if canvas is already "owned" by another instance (safety check)
      if (config.canvas.getAttribute('data-emulator-active') === 'true') {
        console.warn('[Emulator] Canvas already has an active emulator. Forcing cleanup.');
      }
      config.canvas.setAttribute('data-emulator-active', 'true');

      const core = CORE_MAP[(config.system || '').toLowerCase()] || config.core;
      console.log(`[Emulator] Initializing core: ${core} for system: ${config.system}`);
      onProgress?.(`Preparing ${core}...`);

      this.currentGameId = config.gameId;
      this.currentSystem = config.system || null;
      this.canvas = config.canvas;
      this.sessionStartTime = Date.now();

      // Clear canvas before starting to prevent visual ghosting
      if (this.canvas) {
        const gl = this.canvas.getContext('webgl') || this.canvas.getContext('webgl2');
        if (gl) {
          (gl as WebGLRenderingContext).clearColor(0, 0, 0, 1);
          (gl as WebGLRenderingContext).clear(gl.COLOR_BUFFER_BIT);
        } else {
          const ctx = this.canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          }
        }
      }

      // 1. Handle BIOS if needed - Nostalgist expects an array of { fileName, fileContent }
      const biosFiles: { fileName: string, fileContent: Blob }[] = [];
      const requiredBios = BIOS_MAP[config.system || ''];
      
      if (requiredBios) {
        console.log(`[Emulator] Loading BIOS for ${config.system}`);
        onProgress?.('Loading System BIOS...');
        for (const bios of requiredBios) {
          try {
            const biosBlob = await ROMFetchService.fetchBios(bios.filename, bios.url, onProgress);
            biosFiles.push({ fileName: bios.filename, fileContent: biosBlob });
          } catch (e) {
            console.error(`[Emulator] Failed to load BIOS: ${bios.filename}`, e);
          }
        }
      }

      // 2. Fetch ROM using our caching service
      const romBlob = await ROMFetchService.fetchRom(config.gameId, config.romUrl, onProgress, config.system);

      // 3. Convert Blob to File with proper extension
      const magic = await romBlob.slice(0, 4).arrayBuffer();
      const magicView = new Uint8Array(magic);
      const isZip = magicView[0] === 0x50 && magicView[1] === 0x4B; // PK
      const isChd = magicView[0] === 0x4D && magicView[1] === 0x43 && magicView[2] === 0x6F && magicView[3] === 0x6D; // MCom

      let extension = 'bin';
      if (isZip) extension = 'zip';
      else if (isChd) extension = 'chd';
      else if (config.system === 'nes') extension = 'nes';
      else if (config.system === 'snes') extension = 'sfc';
      else if (config.system === 'sega_genesis') extension = 'md';
      else if (config.system === 'gba') extension = 'gba';
      else if (config.system === 'gbc') extension = 'gbc';
      else if (config.system === 'gb') extension = 'gb';
      else if (config.system === 'psx') extension = 'chd';
      else if (config.system === 'n64') extension = 'n64';
      else if (config.romUrl.includes('.n64') || config.romUrl.includes('.z64')) extension = 'n64';
      else if (config.romUrl.includes('.iso')) extension = 'iso';
      else if (config.romUrl.includes('.chd')) extension = 'chd';

      let fileName = `${config.gameId}.${extension}`;
      
      onProgress?.('Launching engine...');
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      const has4K = await customization.hasFeature('perf_4k_ultra');
      const hasLowLatency = await customization.hasFeature('perf_low_latency');

      const videoSettings = await storage.getSetting('videoSettings') || {
        qualityPreset: 'smooth',
        aspectRatio: '4:3',
        crtFilter: false,
        bilinearFiltering: true,
        textureEnhancement: true,
        resolution: '1080p',
        vsync: true
      };

      // Enforce 4K restriction
      const effectiveResolution = (!has4K && videoSettings.resolution === '4K') ? '1080p' : videoSettings.resolution;
      const isHighRes = effectiveResolution !== 'Nativa';
      const isUltraRes = effectiveResolution === '4K';
      const useEnhancements = videoSettings.textureEnhancement ?? false;

      const nostalgistOptions: any = {
        element: config.canvas,
        core: core,
        rom: { fileName, fileContent: romBlob },
        bios: biosFiles.length > 0 ? biosFiles : undefined,
        retroarchConfig: {
          video_driver: 'gl',
          audio_driver: 'webaudio',
          video_aspect_ratio_auto: videoSettings.aspectRatio === 'Original',
          video_smooth: videoSettings.bilinearFiltering,
          video_shader_enable: videoSettings.crtFilter && !isMobile,
          video_threaded: !hasLowLatency, // Threaded video adds 1 frame of lag but improves performance
          audio_latency: hasLowLatency ? 32 : (isMobile ? 128 : 64),
          directory_system: '/home/web_user/retroarch/system',
          directory_savefile: '/home/web_user/retroarch/saves',
          directory_savestate: '/home/web_user/retroarch/states',
          video_vsync: videoSettings.vsync ?? false,
          video_hard_sync: hasLowLatency,
          threaded_data_runloop_enable: true
        },
        retroarchCoreOptions: {
          // PSX (PCSX ReARMed)
          'pcsx_rearmed_neon_enhancement_enable': isHighRes ? 'enabled' : 'disabled',
          'pcsx_rearmed_neon_enhancement_no_main': isHighRes ? 'enabled' : 'disabled',
          'pcsx_rearmed_dithering': useEnhancements ? 'disabled' : 'enabled', // Removes dot pattern for smoother gradients
          
          // N64 (Mupen64Plus)
          'mupen64plus-next-ResolutionBackground': isUltraRes ? '3840x2160' : (isHighRes ? '1920x1080' : '640x480'),
          'mupen64plus-next-MultiSampling': useEnhancements ? (isUltraRes ? '16' : '4') : '0',
          'mupen64plus-next-EnableTrilinearFiltering': useEnhancements ? 'True' : 'False',
          'mupen64plus-next-TextureFilter': useEnhancements ? 'Trilinear' : 'None',
          'mupen64plus-next-TextureEnhancement': (useEnhancements && isUltraRes) ? 'HQ2X' : 'None',
          
          // GBA (mGBA)
          'mgba_video_scale': isUltraRes ? '4' : (isHighRes ? '3' : '1'),
        }
      };

      console.log(`[Emulator] Launching with core: ${core}, ROM: ${fileName}`);
      this.nostalgist = await Nostalgist.launch(nostalgistOptions);
      
      this.isRunning = true;
      console.log(`[Emulator] Core loaded and running.`);
    } catch (error) {
      console.error('[Emulator] Failed to launch:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async sendInput(button: RetroButton, isPressed: boolean, playerIndex: number = 0) {
    if (!this.nostalgist) return;

    // Nostalgist/RetroArch key mapping
    // RetroArch uses standard retropad names
    const retroKey = button;

    if (isPressed) {
      await this.nostalgist.pressDown(retroKey);
    } else {
      await this.nostalgist.pressUp(retroKey);
    }
  }

  /**
   * Captures the current frame from the canvas.
   * Note: WebGL canvases might need preserveDrawingBuffer, but we try anyway.
   */
  public captureScreenshot(): string {
    if (!this.canvas) return '';
    try {
      return this.canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.warn('Failed to capture screenshot', e);
      return '';
    }
  }

  async saveState(type: 'auto' | 'manual' = 'manual'): Promise<SaveState | null> {
    if (!this.nostalgist || !this.currentGameId) return null;
    try {
      const stateBlob = await this.nostalgist.saveState();
      const screenshot = this.captureScreenshot();
      
      const saveState: SaveState = {
        id: crypto.randomUUID(),
        gameId: this.currentGameId,
        timestamp: Date.now(),
        screenshot,
        stateData: stateBlob.state, // nostalgist returns { state: Blob }
        type
      };

      await storage.saveState(saveState);
      console.log(`[Emulator] State saved (${type})`);
      
      return saveState;
    } catch (e) {
      console.error('[Emulator] Failed to save state', e);
      return null;
    }
  }

  private loadCount: number = 0;

  async loadState(stateId: string) {
    if (!this.nostalgist || !this.currentGameId) return;
    try {
      const states = await storage.getStates(this.currentGameId);
      const targetState = states.find(s => s.id === stateId);
      
      if (targetState) {
        await this.nostalgist.loadState(targetState.stateData);
        console.log('[Emulator] State loaded successfully');
        
        this.loadCount++;
        if (this.loadCount >= 5) {
          achievements.unlock('save_scummer');
        }
      } else {
        console.warn('[Emulator] State not found in DB');
      }
    } catch (e) {
      console.error('[Emulator] Failed to load state', e);
    }
  }

  async getSaveStates(): Promise<SaveState[]> {
    if (!this.currentGameId) return [];
    return await storage.getStates(this.currentGameId);
  }

  async deleteSaveState(stateId: string): Promise<void> {
    await storage.deleteState(stateId);
  }

  private async updateStats(gameId: string, system: string, playTimeSeconds: number) {
    try {
      // 1. Increment play count and track last played
      await storage.incrementPlayCount(gameId);

      // 2. Track total play time
      const totalPlayTime = (await storage.getSetting('total_play_time') || 0) + playTimeSeconds;
      await storage.saveSetting('total_play_time', totalPlayTime);

      // 3. Track unique systems
      const playedSystems: string[] = await storage.getSetting('played_systems') || [];
      if (!playedSystems.includes(system)) {
        playedSystems.push(system);
        await storage.saveSetting('played_systems', playedSystems);
      }

      // 4. Track unique games
      const playedGames: string[] = await storage.getSetting('played_games') || [];
      if (!playedGames.includes(gameId)) {
        playedGames.push(gameId);
        await storage.saveSetting('played_games', playedGames);
      }

      // Check Achievements
      if (totalPlayTime >= 3600) { // 60 minutes
        achievements.unlock('marathon_gamer');
      }
      if (playedSystems.length >= 5) {
        achievements.unlock('retro_fanatic');
      }
      if (playedGames.length >= 10) {
        achievements.unlock('arcade_master');
      }
      
      // Completionist check (games in library)
      const catalog = await storage.getCatalogGames();
      if (catalog.length >= 50) {
        achievements.unlock('completionist');
      }

    } catch (e) {
      console.error('[Emulator] Failed to update stats', e);
    }
  }

  async pause() {
    if (this.nostalgist) {
      await this.nostalgist.pause();
      this.isRunning = false;
    }
  }

  async resume() {
    if (this.nostalgist) {
      await this.nostalgist.resume();
      this.isRunning = true;
    }
  }

  async stop() {
    if (this.nostalgist) {
      const instance = this.nostalgist;
      this.isRunning = false;
      this.nostalgist = null; // Prevent further calls immediately
      
      try {
        // Pause immediately to stop audio processing
        await instance.pause();
        
        // Auto-save before exiting if we have a game loaded
        if (this.currentGameId) {
          try {
            await this.saveState('auto');
            
            // Track stats
            if (this.sessionStartTime) {
              const playTime = Math.floor((Date.now() - this.sessionStartTime) / 1000); // seconds
              await this.updateStats(this.currentGameId, this.currentSystem || 'unknown', playTime);
            }
          } catch (e) {
            console.warn('[Emulator] Auto-save failed during stop', e);
          }
        }
        
        // Exit the emulator instance
        await instance.exit({ removeCanvas: false });
        
        // Force cleanup of any lingering audio nodes or contexts created by Nostalgist/RetroArch
        try {
          const bgmCtx = AudioEngine.getContext();
          for (const ctx of createdAudioContexts) {
            if (ctx !== bgmCtx && ctx.state !== 'closed') {
              try {
                await ctx.close();
              } catch (e) {}
            }
          }
          // Clear the array, keeping only the bgmCtx if it was in there
          createdAudioContexts.length = 0;
          if (bgmCtx) createdAudioContexts.push(bgmCtx);

          if (this.canvas) {
            const gl = this.canvas.getContext('webgl') || this.canvas.getContext('webgl2');
            if (gl) {
              (gl as WebGLRenderingContext).clear(gl.COLOR_BUFFER_BIT);
            }
          }
        } catch (e) {
          console.warn('[Emulator] Cleanup warning:', e);
        }
      } catch (e) {
        console.error('[Emulator] Error during stop:', e);
      }
    }
    this.currentGameId = null;
    if (this.canvas) {
      this.canvas.removeAttribute('data-emulator-active');
    }
    this.canvas = null;
    this.isRunning = false;
    console.log(`[Emulator] Stopped.`);
  }
}

export const emulator = new EmulatorService();
