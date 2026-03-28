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
  'gba': [{ filename: 'gba_bios.bin', url: 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/gba_bios.bin' }],
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
const hasSAB = () => typeof SharedArrayBuffer !== 'undefined';

const getCoreMap = (): Record<string, string> => ({
  'atari_2600': 'stella',
  'atari_7800': 'prosystem',
  'lynx': 'handy',
  'nes': 'fceumm',
  'snes': 'snes9x2010', // More stable across devices than latest snes9x
  'sega_genesis': 'genesis_plus_gx',
  'gba': 'mgba', // mgba is generally the best, Nostalgist handles it well
  'gbc': 'gambatte',
  'gb': 'gambatte',
  'psx': 'pcsx_rearmed',
  'n64': 'parallel_n64',
  'ps2': 'play',
  'mastersystem': 'genesis_plus_gx',
  'gamegear': 'genesis_plus_gx',
  'pcengine': 'mednafen_pce_fast',
  'wonderswan': 'mednafen_wswan',
  'ngp': 'mednafen_ngp'
});

export class EmulatorService {
  private nostalgist: Nostalgist | null = null;
  private isRunning: boolean = false;
  private isInitializing: boolean = false;
  private isRewinding: boolean = false;
  private isFastForwarding: boolean = false;
  private currentGameId: string | null = null;
  private currentSystem: string | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private sessionStartTime: number | null = null;
  private rewindInterval: number | null = null;

  constructor() {}

  /**
   * Prefetches the WASM core files into the browser cache silently.
   */
  public async prefetchCore(system: string) {
    // Prefetching disabled to rely on Nostalgist's internal stable resolution
    return;
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

      const core = getCoreMap()[(config.system || '').toLowerCase()] || config.core;
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
      if (isZip) {
         // If it's STILL a zip here, it means extractMainFileFromZip failed or was skipped.
         // We MUST pass it as .zip to Nostalgist, otherwise it will try to read a zip as a raw ROM.
         extension = 'zip';
      } else if (isChd) {
         extension = 'chd';
      } else if (config.system === 'nes') extension = 'nes';
      else if (config.system === 'snes') extension = 'sfc';
      else if (config.system === 'sega_genesis') extension = 'md';
      else if (config.system === 'gba') extension = 'gba';
      else if (config.system === 'gbc') extension = 'gbc';
      else if (config.system === 'gb') extension = 'gb';
      else if (config.system === 'psx') extension = 'chd';
      else if (config.system === 'n64') {
        // N64 requires the correct extension for byte order detection
        if (magicView[0] === 0x80 && magicView[1] === 0x37 && magicView[2] === 0x12 && magicView[3] === 0x40) {
          extension = 'z64'; // Big Endian
        } else if (magicView[0] === 0x37 && magicView[1] === 0x80 && magicView[2] === 0x40 && magicView[3] === 0x12) {
          extension = 'v64'; // Byte Swapped
        } else {
          extension = 'n64'; // Little Endian or fallback
        }
      }
      else if (config.romUrl.includes('.n64') || config.romUrl.includes('.z64') || config.romUrl.includes('.v64')) extension = 'n64';
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

      let finalCore: any = core;
      
      // Map cores to available versions in webretro if they are missing from the default CDN
      let webretroCore = '';
      let coreSource = 'BinBashBanana/webretro@master/cores';
      let coreSuffix = '_libretro';
      
      if (core === 'parallel_n64' || core === 'mupen64plus_next') {
        webretroCore = core;
        coreSource = 'BinBashBanana/webretro@master/cores';
      } else if (core === 'prosystem') {
        webretroCore = core;
      } else if (core === 'stella') {
        webretroCore = 'stella2014';
      } else if (core === 'mednafen_psx') {
        webretroCore = 'mednafen_psx_hw';
      } else if (core === 'melonds' || core === 'yabause') {
        webretroCore = core;
      }

      if (webretroCore) {
        const jsUrl = `https://cdn.jsdelivr.net/gh/${coreSource}/${webretroCore}${coreSuffix}.js`;
        const wasmUrl = `https://cdn.jsdelivr.net/gh/${coreSource}/${webretroCore}${coreSuffix}.wasm`;
        
        console.log(`[Emulator] Fetching core files: \nJS: ${jsUrl}\nWASM: ${wasmUrl}`);

        try {
          // Manual fetch with progress for cores
          const jsBlob = await ROMFetchService.fetchCoreFile(jsUrl, 'JS', onProgress);
          const wasmBlob = await ROMFetchService.fetchCoreFile(wasmUrl, 'WASM', onProgress);

          if (jsBlob.size < 1000 || wasmBlob.size < 1000) {
            throw new Error('Core file too small, probably an error page or redirect');
          }

          finalCore = {
            name: webretroCore,
            js: { fileName: `${webretroCore}${coreSuffix}.js`, fileContent: jsBlob },
            wasm: { fileName: `${webretroCore}${coreSuffix}.wasm`, fileContent: wasmBlob }
          };
          console.log(`[Emulator] Core files fetched successfully. JS: ${jsBlob.size} bytes, WASM: ${wasmBlob.size} bytes`);
        } catch (e) {
          console.error('[Emulator] Manual core fetch failed:', e);
          onProgress?.('Error en descarga rápida, usando servidor alternativo...');
          finalCore = webretroCore; // Fallback to string name (Nostalgist will fetch it)
        }
      }

      const nostalgistOptions: any = {
        element: config.canvas,
        core: finalCore,
        rom: { fileName, fileContent: romBlob },
        bios: biosFiles.length > 0 ? biosFiles : undefined,
        retroarchConfig: {
          video_aspect_ratio_auto: videoSettings.aspectRatio === 'Original',
          video_smooth: videoSettings.bilinearFiltering,
          video_shader_enable: videoSettings.crtFilter && !isMobile,
          video_threaded: !hasLowLatency, // Threaded video adds 1 frame of lag but improves performance
          audio_latency: hasLowLatency ? 64 : (isMobile ? 128 : 96), // Increased slightly for stability
          directory_system: '/home/web_user/retroarch/system',
          directory_savefile: '/home/web_user/retroarch/saves',
          directory_savestate: '/home/web_user/retroarch/states',
          video_vsync: videoSettings.vsync ?? true, // Default to true for smoother scrolling
          video_hard_sync: hasLowLatency,
          threaded_data_runloop_enable: true,
          rewind_enable: false, // Disabled by default for stability and performance
          rewind_buffer_size: 10 * 1024 * 1024, // Reduced buffer size
          rewind_granularity: 1,
          fastforward_ratio: 3.0
        },
        retroarchCoreOptions: {
          // PSX (PCSX ReARMed)
          'pcsx_rearmed_neon_enhancement_enable': isHighRes ? 'enabled' : 'disabled',
          'pcsx_rearmed_neon_enhancement_no_main': isHighRes ? 'enabled' : 'disabled',
          'pcsx_rearmed_dithering': useEnhancements ? 'disabled' : 'enabled', // Removes dot pattern for smoother gradients
          
          // GBA (mGBA)
          'mgba_video_scale': isUltraRes ? '4' : (isHighRes ? '3' : '1'),

          // N64 (ParaLLEl N64)
          'parallel-n64-gfxplugin': 'glide64',
          'parallel-n64-rspplugin': 'hle',
          'parallel-n64-screensize': '640x480',
          'parallel-n64-polyoffset-factor': '-3.0',
          'parallel-n64-polyoffset-units': '-3.0',
        }
      };

      console.log(`[Emulator] Launching with core: ${core}, ROM: ${fileName}`);
      if (nostalgistOptions.core && typeof nostalgistOptions.core !== 'string') {
        const coreObj = nostalgistOptions.core as any;
        console.log(`[Emulator] Core Blobs - JS: ${coreObj.js?.size} bytes, WASM: ${coreObj.wasm?.size} bytes`);
      }
      onProgress?.('Iniciando motor de emulación...');
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

  public async setRewind(active: boolean) {
    if (!this.nostalgist || this.isRewinding === active) return;
    this.isRewinding = active;
    
    // RetroArch uses a specific command for rewind
    // In Nostalgist we might need to use pressDown/Up if mapped, 
    // or use the command API if available.
    // For now, we'll use the standard 'rewind' command if supported
    if (active) {
      await this.nostalgist.pressDown('rewind');
    } else {
      await this.nostalgist.pressUp('rewind');
    }
  }

  public async setFastForward(active: boolean) {
    if (!this.nostalgist || this.isFastForwarding === active) return;
    this.isFastForwarding = active;
    
    if (active) {
      await this.nostalgist.pressDown('fast_forward');
    } else {
      await this.nostalgist.pressUp('fast_forward');
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
