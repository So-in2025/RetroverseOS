import { storage } from './storage';
import * as fflate from 'fflate';
import { ROMValidator } from './romValidator';

const CORS_PROXY = "https://corsproxy.io/?";

export class ROMFetchService {
  private static MAX_CACHE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB (Synced with storage.ts)

  /**
   * Fetches a BIOS file, caching it permanently in IndexedDB.
   */
  public static async fetchBios(filename: string, url: string, onProgress?: (status: string) => void): Promise<Blob> {
    const cached = await storage.getBios(filename);
    if (cached) return cached;

    console.log(`[BIOS Fetch] Downloading ${filename}...`);
    onProgress?.('Preparando descarga...');
    
    const response = await this.fetchWithProgress(url, onProgress);
    const blob = await response.blob();
    
    await storage.cacheBios(filename, blob);
    return blob;
  }

  /**
   * Prefetches a ROM into the local IndexedDB cache silently.
   * Useful for predictive loading when a user hovers over a game.
   */
  public static async prefetchRom(gameId: string, url: string, system?: string): Promise<void> {
    try {
      // 1. Check Cache first
      const cachedRom = await storage.getCachedRom(gameId);
      if (cachedRom && cachedRom.blob.size > 1024) {
        // Already cached, no need to prefetch
        return;
      }

      console.log(`[ROM Prefetch] Initiating predictive download for ${gameId}...`);
      
      // 2. Resolve 'archive:' URLs
      if (url.startsWith('archive:')) {
          const { MetadataNormalizationEngine } = await import('./metadataNormalization');
          const identifier = url.replace('archive:', '');
          const resolvedUrl = await MetadataNormalizationEngine.resolveRomUrl(identifier, system);
          if (resolvedUrl) {
              url = resolvedUrl;
          } else {
              return; // Silently fail
          }
      }

      // 3. Auto-correct old URLs
      if (url.includes('archive.org/download/nointro.') && !url.endsWith('.zip')) {
        url = url.replace(/\.(nes|sfc|smc|md|gen|gba|gbc|gb|n64|z64)$/i, '.zip');
      }

      // 4. Define Validator for Zip Integrity and HTML errors
      const blobValidator = async (blob: Blob) => {
        if (blob.size < 4096) throw new Error(`Too small`);
        const header = await blob.slice(0, 100).text();
        if (header.trim().toLowerCase().startsWith('<') || header.toLowerCase().includes('<!doctype html>')) {
          throw new Error('HTML error page');
        }
      };

      // 5. Fetch from Network (without progress callback)
      const response = await this.fetchWithProgress(url, undefined, blobValidator);
      let blob = await response.blob();
      
      // 6. Validate
      if (system) {
          const validation = await ROMValidator.validate(blob, system);
          if (!validation.isValid) {
              console.warn(`[ROM Prefetch] Validation Failed for ${gameId}: ${validation.error}`);
              return;
          }
      }

      // 7. Handle Compressed Files
      const magic = await blob.slice(0, 4).text();
      const isZip = url.toLowerCase().endsWith('.zip') || magic.startsWith('PK');

      if (isZip && system !== 'mame' && system !== 'neogeo') {
        blob = await this.extractMainFileFromZip(blob, system);
      }

      // 8. Save to Cache
      await this.saveToCache(gameId, blob);
      console.log(`[ROM Prefetch] Successfully cached ${gameId} in background.`);
      
    } catch (e) {
      console.warn(`[ROM Prefetch] Failed to prefetch ${gameId}:`, e);
    }
  }

  /**
   * Fetches a ROM, either from the local IndexedDB cache or from the network.
   */
  public static async fetchRom(gameId: string, url: string, onProgress?: (status: string) => void, system?: string): Promise<Blob> {
    // 0. Resolve 'archive:' URLs
    if (url.startsWith('archive:')) {
        const { MetadataNormalizationEngine } = await import('./metadataNormalization');
        const identifier = url.replace('archive:', '');
        const resolvedUrl = await MetadataNormalizationEngine.resolveRomUrl(identifier, system);
        if (resolvedUrl) {
            url = resolvedUrl;
        } else {
            throw new Error(`No se pudo resolver el enlace de la ROM: ${url}`);
        }
    }

    // 0. Auto-correct old URLs that used raw extensions instead of .zip for nointro sets
    if (url.includes('archive.org/download/nointro.') && !url.endsWith('.zip')) {
      url = url.replace(/\.(nes|sfc|smc|md|gen|gba|gbc|gb|n64|z64)$/i, '.zip');
      console.log(`[ROM Fetch] Auto-corrected URL to: ${url}`);
    }

    // 1. Check Cache
    const cachedRom = await storage.getCachedRom(gameId);
    if (cachedRom && cachedRom.blob.size > 1024) {
      // Validate that the cached ROM is not an HTML error page
      const header = await cachedRom.blob.slice(0, 100).text();
      if (!header.trim().toLowerCase().startsWith('<') && !header.toLowerCase().includes('<!doctype html>')) {
        console.log(`[ROM Fetch] Cache hit for ${gameId} (${(cachedRom.blob.size / 1024).toFixed(2)} KB)`);
        onProgress?.('Cargando desde caché...');
        await storage.updateRomAccessTime(gameId);
        return cachedRom.blob;
      } else {
        console.warn(`[ROM Fetch] Cache hit for ${gameId} but file appears to be HTML. Re-downloading...`);
      }
    } else if (cachedRom) {
      console.warn(`[ROM Fetch] Cache hit for ${gameId} but file is too small (${cachedRom.blob.size} bytes). Re-downloading...`);
    }

    console.log(`[ROM Fetch] Cache miss for ${gameId}. Downloading...`);
    onProgress?.('Iniciando descarga...');
    
    // 2. Define Validator for Zip Integrity and HTML errors
    const blobValidator = async (blob: Blob) => {
      // Validation: Discard if < 4KB
      if (blob.size < 4096) {
        throw new Error(`Downloaded ROM is too small (${blob.size} bytes). Sector de Datos Dañado.`);
      }
      const header = await blob.slice(0, 100).text();
      if (header.trim().toLowerCase().startsWith('<') || header.toLowerCase().includes('<!doctype html>')) {
        throw new Error('Downloaded ROM is an HTML error page. Sector de Datos Dañado.');
      }
      if (url.toLowerCase().endsWith('.zip') || header.startsWith('PK')) {
        try {
           // Attempt to unzip header to verify integrity
           // Only unzip if not arcade
           if (system !== 'mame' && system !== 'neogeo') {
             await this.extractMainFileFromZip(blob, system);
           }
        } catch (e) {
           throw new Error('Corrupt ZIP data. Sector de Datos Dañado.');
        }
      }
    };

    // 3. Fetch from Network with Progress and Validation
    const response = await this.fetchWithProgress(url, onProgress, blobValidator);
    let blob = await response.blob();
    
    // NEW: Robust ROM Validation
    if (system) {
        const validation = await ROMValidator.validate(blob, system);
        if (!validation.isValid) {
            throw new Error(`ROM Validation Failed: ${validation.error}`);
        }
    }

    // 4. Handle Compressed Files (.zip, .7z)
    // Sometimes URLs don't end in .zip but the content is actually a zip file.
    // We check the magic number (PK\x03\x04) to be sure.
    const magic = await blob.slice(0, 4).text();
    const isZip = url.toLowerCase().endsWith('.zip') || magic.startsWith('PK');

    if (isZip && system !== 'mame' && system !== 'neogeo') {
      onProgress?.('Extrayendo archivo principal...');
      blob = await this.extractMainFileFromZip(blob, system);
    }

    // 5. Save to Cache
    try {
      await this.saveToCache(gameId, blob);
    } catch (e) {
      console.warn(`[ROM Fetch] Failed to cache ROM ${gameId}:`, e);
    }

    return blob;
  }


  private static async validateResponse(response: Response): Promise<void> {
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
      // It might be an error page served as 200 OK
      const text = await response.text();
      if (text.trim().startsWith('<') || text.includes('Error') || text.includes('Forbidden')) {
        throw new Error('Invalid response: Received HTML/JSON instead of binary data');
      }
    }
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
  }

  private static async fetchWithProgress(url: string, onProgress?: (status: string) => void, validator?: (blob: Blob) => Promise<void>): Promise<Response> {
    let response: Response;
    
    // STOCHASTIC TUNNEL SELECTOR
    // We prioritize LocalTunnel (our server) as it's the most reliable and supports streaming.
    const baseProxies = [
        { name: 'LocalTunnel', url: `${window.location.origin}/api/tunnel?url=${encodeURIComponent(url)}` },
        { name: 'CorsProxy', url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
        { name: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
        { name: 'CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
        { name: 'CorsAnywhere', url: `https://cors-anywhere.herokuapp.com/${url}` }
    ];

    // Strictly: LocalTunnel -> CorsProxy -> AllOrigins -> Codetabs -> CorsAnywhere
    const proxies = baseProxies;

    // Try direct fetch first if it's HTTPS (some Archive.org nodes support CORS)
    try {
        console.log(`[ROM Fetch] Attempting Direct Connection: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased to 5s timeout for direct
        
        response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            await this.validateResponse(response.clone());
            if (validator) {
                const blob = await response.clone().blob();
                await validator(blob);
            }
            return response;
        }
    } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
            console.warn(`[ROM Fetch] Direct connection failed, engaging Omega Tunnel...`);
        }
    }

    for (const proxy of proxies) {
        try {
            console.log(`[ROM Fetch] Tunneling via ${proxy.name}: ${proxy.url}`);
            
            // 120 Second Timeout for proxies (More generous for large ROMs like PSX)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);

            response = await fetch(proxy.url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Proxy ${proxy.name} failed: ${response.status}`);
            
            // Clone to validate headers without consuming the body
            await this.validateResponse(response.clone());
            
            // If validator provided, read body and validate
            if (validator) {
                const blob = await response.clone().blob();
                await validator(blob);
            }
            
            return response; // Success
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                console.warn(`[ROM Fetch] ${proxy.name} collapsed:`, e);
                onProgress?.(`Tunnel ${proxy.name} collapsed, rerouting...`);
            }
        }
    }

    throw new Error('Download failed: All tunnels collapsed. Target is locked.');
  }

  private static async extractMainFileFromZip(zipBlob: Blob, system?: string): Promise<Blob> {
    const buffer = await zipBlob.arrayBuffer();
    const zipData = new Uint8Array(buffer);
    
    return new Promise((resolve, reject) => {
      fflate.unzip(zipData, (err, unzipped) => {
        if (err) return reject(err);
        
        const files = Object.keys(unzipped);
        
        // Define system-specific extensions to prioritize
        const systemExts: Record<string, string[]> = {
          'nes': ['.nes'],
          'snes': ['.sfc', '.smc'],
          'sega_genesis': ['.md', '.gen', '.bin'],
          'gba': ['.gba'],
          'gbc': ['.gbc'],
          'gb': ['.gb'],
          'psx': ['.chd', '.cue', '.bin', '.iso'],
          'n64': ['.n64', '.z64'],
          'atari_2600': ['.a26', '.bin'],
          'atari_7800': ['.a78', '.bin'],
          'lynx': ['.lnx'],
          'mastersystem': ['.sms'],
          'gamegear': ['.gg'],
          'pcengine': ['.pce'],
          'wonderswan': ['.ws', '.wsc'],
          'ngp': ['.ngp', '.ngc']
        };

        const preferredExts = system && systemExts[system] ? systemExts[system] : [];
        
        // Special case for PSX: if it's a zip with .cue and .bin, don't extract if we only find .cue
        // because the emulator needs the .bin files too.
        if (system === 'psx') {
          const hasChd = files.some(f => f.toLowerCase().endsWith('.chd'));
          const hasIso = files.some(f => f.toLowerCase().endsWith('.iso'));
          const hasCue = files.some(f => f.toLowerCase().endsWith('.cue'));
          
          if (!hasChd && !hasIso && hasCue) {
            console.log('[ROM Fetch] PSX multi-file set detected (.cue/.bin). Returning original ZIP.');
            return resolve(zipBlob);
          }
        }

        // 1. Try to find a file with a preferred extension
        let bestFile = '';
        let bestSize = 0;

        for (const file of files) {
          const lowerFile = file.toLowerCase();
          const data = unzipped[file];
          
          // Skip directories and metadata
          if (file.endsWith('/') || data.length === 0) continue;
          if (lowerFile.includes('readme') || lowerFile.includes('license') || lowerFile.includes('metadata')) continue;

          if (preferredExts.some(ext => lowerFile.endsWith(ext))) {
            if (data.length > bestSize) {
              bestSize = data.length;
              bestFile = file;
            }
          }
        }

        // 2. Fallback: Find the largest file that is not a directory or metadata
        if (!bestFile) {
          for (const file of files) {
            const lowerFile = file.toLowerCase();
            const data = unzipped[file];
            
            if (file.endsWith('/') || data.length === 0) continue;
            if (lowerFile.includes('readme') || lowerFile.includes('license') || lowerFile.includes('metadata')) continue;

            if (data.length > bestSize) {
              bestSize = data.length;
              bestFile = file;
            }
          }
        }

        if (bestFile && bestSize > 0) {
          console.log(`[ROM Fetch] Extracted main file: ${bestFile} (${(bestSize / 1024).toFixed(2)} KB)`);
          resolve(new Blob([unzipped[bestFile]]));
        } else {
          reject(new Error('No valid ROM file found in ZIP archive'));
        }
      });
    });
  }

  private static async saveToCache(gameId: string, blob: Blob) {
    const size = blob.size;
    await storage.cacheRom({
      gameId,
      blob,
      size,
      lastAccessed: Date.now()
    });
    console.log(`[ROM Fetch] Cached ${gameId} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  }
}
