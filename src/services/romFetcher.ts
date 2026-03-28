import { storage } from './storage';
import * as fflate from 'fflate';
import { ROMValidator } from './romValidator';
import { sentinel } from './sentinel';
import { ROMDiscoveryBrain } from './DiscoveryBrain';

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
      const response = await this.fetchWithProgress(url, undefined);
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');
      
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      
      let blob = new Blob(chunks);
      await blobValidator(blob);
      
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
    // 0. Sanitizar URL de entrada
    if (url.includes('f:/') || url.includes('c:/') || url.includes('d:/')) {
      // Si la URL contiene una ruta local, intentamos extraer solo el nombre del archivo
      const parts = url.split(/[/\\]/);
      const filename = parts.pop();
      const identifier = parts.find(p => p.length > 5 && !p.includes(':'));
      if (identifier && filename) {
        url = `https://archive.org/download/${identifier}/${filename}`;
        console.log(`[ROM Fetch] Sanitized malformed URL to: ${url}`);
      }
    }

    // 0. Agentic Discovery Engine (NEW)
    let finalUrl = url;
    let usedDiscovery = false;
    try {
        const brain = new ROMDiscoveryBrain();
        const candidate = await brain.findBestCandidate(gameId, system || '');
        if (candidate) {
            console.log(`[ROM Fetch] Discovery Engine found better URL: ${candidate.url}`);
            finalUrl = candidate.url;
            usedDiscovery = true;
        }
    } catch (e) {
        console.warn('[ROM Fetch] Discovery Engine failed, falling back to original URL:', e);
    }

    // 0. Resolve 'archive:' URLs
    if (finalUrl.startsWith('archive:')) {
        const { MetadataNormalizationEngine } = await import('./metadataNormalization');
        const identifier = finalUrl.replace('archive:', '');
        const resolvedUrl = await MetadataNormalizationEngine.resolveRomUrl(identifier, system);
        if (resolvedUrl) {
            finalUrl = resolvedUrl;
        } else {
            throw new Error(`No se pudo resolver el enlace de la ROM: ${finalUrl}`);
        }
    }

    // 0. Auto-correct old URLs that used raw extensions instead of .zip for nointro sets
    let originalUrl = finalUrl;
    let autoCorrected = false;
    if (finalUrl.includes('archive.org/download/nointro.') && !finalUrl.endsWith('.zip')) {
      finalUrl = finalUrl.replace(/\.(nes|sfc|smc|md|gen|gba|gbc|gb|n64|z64|v64)$/i, '.zip');
      autoCorrected = true;
      console.log(`[ROM Fetch] Auto-corrected URL to: ${finalUrl}`);
    }

    // 1. Check Cache
    const cachedRom = await storage.getCachedRom(gameId);
    if (cachedRom && cachedRom.blob.size > 1024) {
      // Validate that the cached ROM is not an HTML error page
      const header = await cachedRom.blob.slice(0, 100).text();
      if (!header.trim().toLowerCase().startsWith('<') && !header.toLowerCase().includes('<!doctype html>')) {
        
        // Check if the cached ROM is a ZIP and we are not mame/neogeo
        const magicBuffer = await cachedRom.blob.slice(0, 4).arrayBuffer();
        const magicBytes = new Uint8Array(magicBuffer);
        const isCachedZip = magicBytes[0] === 0x50 && magicBytes[1] === 0x4B;
        
        if (isCachedZip && system !== 'mame' && system !== 'neogeo') {
          console.warn(`[ROM Fetch] Found unextracted ZIP in cache for non-arcade system. Clearing cache and re-fetching...`);
          await storage.deleteCachedRom(gameId);
        } else {
          console.log(`[ROM Fetch] Cache hit for ${gameId} (${(cachedRom.blob.size / 1024).toFixed(2)} KB)`);
          onProgress?.('Cargando desde caché...');
          await storage.updateRomAccessTime(gameId);
          return cachedRom.blob;
        }
      } else {
        console.warn(`[ROM Fetch] Cache hit for ${gameId} but file appears to be HTML. Re-downloading...`);
      }
    } else if (cachedRom) {
      console.warn(`[ROM Fetch] Cache hit for ${gameId} but file is too small (${cachedRom.blob.size} bytes). Re-downloading...`);
    }

    const doFetch = async (targetUrl: string) => {
      console.log(`[ROM Fetch] Cache miss for ${gameId}. Downloading from ${targetUrl}...`);
      onProgress?.('Iniciando descarga...');
      sentinel.logRomFetch(gameId, targetUrl, 'start');
      
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
      };

      // 3. Fetch from Network with Progress
      const response = await this.fetchWithProgress(targetUrl, onProgress);
      
      // Read stream to report progress
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');
      
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          if (total && onProgress) {
            const percent = Math.round((loaded / total) * 100);
            onProgress(`Descargando... ${percent}%`);
          } else if (onProgress) {
            onProgress(`Descargando... ${(loaded / 1024 / 1024).toFixed(2)} MB`);
          }
        }
      }
      
      let blob = new Blob(chunks);
      
      // 3.5 Validate the downloaded blob
      await blobValidator(blob);
      
      // NEW: Robust ROM Validation
      if (system) {
          const validation = await ROMValidator.validate(blob, system);
          if (!validation.isValid) {
              throw new Error(`ROM Validation Failed: ${validation.error}`);
          }
      }

      // 4. Handle Compressed Files (.zip)
      // We check the magic number (PK) to be sure it's actually a zip file,
      // regardless of the URL extension.
      const magicBuffer = await blob.slice(0, 4).arrayBuffer();
      const magicBytes = new Uint8Array(magicBuffer);
      const isZip = magicBytes[0] === 0x50 && magicBytes[1] === 0x4B; // P, K

      if (isZip && system !== 'mame' && system !== 'neogeo') {
        onProgress?.('Extrayendo archivo principal...');
        try {
          blob = await this.extractMainFileFromZip(blob, system);
        } catch (extractErr) {
          console.error('[ROM Fetch] Error extracting ZIP:', extractErr);
          throw new Error('El archivo ZIP está corrupto o incompleto.');
        }
      }

      // 5. Save to Cache
      try {
        await this.saveToCache(gameId, blob);
        sentinel.logRomFetch(gameId, targetUrl, 'success', { size: blob.size });
      } catch (e) {
        console.warn(`[ROM Fetch] Failed to cache ROM ${gameId}:`, e);
      }

      return blob;
    };

    try {
      return await doFetch(finalUrl);
    } catch (e) {
      if (autoCorrected) {
        console.warn(`[ROM Fetch] Auto-corrected URL failed: ${e}. Trying original URL: ${originalUrl}`);
        try {
          return await doFetch(originalUrl);
        } catch (originalErr) {
          // Fall through to discovery fallback if original also fails
          e = originalErr;
        }
      }

      if (usedDiscovery && system) {
        console.warn(`[ROM Fetch] Discovered URL failed: ${e}. Clearing cache and trying original URL...`);
        const { DiscoveryCache } = await import('./DiscoveryCache');
        await DiscoveryCache.clear(gameId, system);
        
        let fallbackUrl = url;
        if (fallbackUrl.startsWith('archive:')) {
            const { MetadataNormalizationEngine } = await import('./metadataNormalization');
            const identifier = fallbackUrl.replace('archive:', '');
            const resolvedUrl = await MetadataNormalizationEngine.resolveRomUrl(identifier, system);
            if (resolvedUrl) {
                fallbackUrl = resolvedUrl;
            } else {
                throw new Error(`No se pudo resolver el enlace de la ROM: ${fallbackUrl}`);
            }
        }
        
        return await doFetch(fallbackUrl);
      }
      throw e;
    }
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

  public static async fetchWithProgress(url: string, onProgress?: (status: string) => void): Promise<Response> {
    let response: Response;
    
    // Use our own backend proxy
    const backendProxyUrl = `/api/tunnel?url=${encodeURIComponent(url)}`;

    try {
        console.log(`[ROM Fetch] Tunneling via Backend: ${backendProxyUrl}`);
        
        // 120 Second Timeout for proxies (More generous for large ROMs like PSX)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        response = await fetch(backendProxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Backend proxy failed: ${response.status}`);
        
        return response; // Success
    } catch (e: any) {
      console.error(`[ROM Fetch] Backend proxy collapsed:`, e);
      sentinel.logRomFetch('unknown', url, 'error', { error: e.message });
      throw new Error(`Backend proxy collapsed: ${e.message}`);
    }
  }

  /**
   * Fetches a core file (JS or WASM) with progress feedback
   */
  public static async fetchCoreFile(url: string, type: 'JS' | 'WASM', onProgress?: (status: string) => void): Promise<Blob> {
    onProgress?.(`Conectando con el servidor de núcleos (${type})...`);
    
    try {
      // fetchWithProgress already handles tunneling via /api/tunnel
      const response = await this.fetchWithProgress(url);

      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status}) al descargar el núcleo.`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          if (total && onProgress) {
            const percent = Math.round((loaded / total) * 100);
            onProgress?.(`Descargando Núcleo (${type})... ${percent}%`);
          } else if (onProgress) {
            // If total is unknown, we still want to show progress
            const mb = (loaded / 1024 / 1024).toFixed(2);
            onProgress?.(`Descargando Núcleo (${type})... ${mb} MB`);
          }
        }
      }

      if (chunks.length === 0 || loaded === 0) {
        throw new Error(`El archivo del núcleo (${type}) está vacío.`);
      }

      const blob = new Blob(chunks);

      // VALIDATION: Ensure we didn't download an HTML error page
      if (blob.size < 500) {
        const text = await blob.text();
        if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('{"error"')) {
          throw new Error(`El servidor devolvió un error en lugar del núcleo (${type}).`);
        }
      } else if (type === 'JS') {
        // Check first few bytes of JS
        const head = await blob.slice(0, 100).text();
        if (head.includes('<!DOCTYPE html>') || head.includes('<html')) {
          throw new Error(`Respuesta inválida del servidor para el núcleo JS.`);
        }
      }

      return blob;
    } catch (err: any) {
      console.error(`[ROMFetchService] Core fetch failed for ${type}:`, err);
      throw err;
    }
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
          'n64': ['.n64', '.z64', '.v64'],
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
