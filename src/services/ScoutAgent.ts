import { ROMCandidate, ScoutAgent } from './AgenticROMDiscovery';
import { gameCatalog } from './gameCatalog';

const SYSTEM_KEYWORDS: Record<string, string> = {
  'NES': '("Nintendo Entertainment System" OR "NES")',
  'SNES': '("Super Nintendo" OR "SNES")',
  'GBA': '("Game Boy Advance" OR "GBA")',
  'GB': '("Game Boy" OR "GB")',
  'GBC': '("Game Boy Color" OR "GBC")',
  'Genesis': '("Sega Genesis" OR "Mega Drive")',
  'PS1': '("PlayStation" OR "PS1" OR "PSX")',
  'PS2': '("PlayStation 2" OR "PS2")',
  'Atari 2600': '("Atari 2600")'
};

export class ArchiveScoutAgent implements ScoutAgent {
  name = 'Archive.org';

  async discover(gameId: string, system: string): Promise<ROMCandidate[]> {
    console.log(`[Scout] Buscando candidatos para ${gameId} (${system}) en Archive.org...`);
    
    const game = gameCatalog.getGame(gameId);
    let cleanGameId = game?.title || gameId.replace(/^(nes|snes|gba|gbc|gb|genesis|psx|ps1|ps2|n64|atari2600)_/i, '').replace(/_/g, ' ').replace(/-/g, ' ');
    
    // Remove numbers at the start if it came from ID
    if (!game?.title) {
      cleanGameId = cleanGameId.replace(/^\d+\s/, '');
    }
    
    // Use a broader query that searches for the title in various fields
    const upperSystem = system.toUpperCase();
    const systemKeyword = SYSTEM_KEYWORDS[upperSystem] || (system ? `"${system}"` : "");
    const escapedGameId = cleanGameId.replace(/"/g, '\\"');
    
    // Try multiple query variations for better discovery
    const queryVariations = [
      // 1. Strict title match within system
      systemKeyword 
        ? `(title:"${escapedGameId}" OR identifier:${gameId}) AND ${systemKeyword}`
        : `(title:"${escapedGameId}" OR identifier:${gameId})`,
      // 2. Title and system combined
      system ? `"${escapedGameId}" ${system}` : `"${escapedGameId}"`,
      // 3. First two words of title + system (for long titles)
      system ? `${escapedGameId.split(" ").slice(0, 2).join(" ")} ${system}` : escapedGameId.split(" ").slice(0, 2).join(" "),
      // 4. Loose title match
      systemKeyword
        ? `title:(${escapedGameId}) AND ${systemKeyword}`
        : `title:(${escapedGameId})`
    ];

    const baseFilter = " AND (collection:nointro OR collection:software OR collection:classicpcgames OR collection:cdromimages OR mediatype:software)";
    
    const fetchWithRetry = async (url: string, retries = 2, delay = 1000): Promise<Response> => {
      for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) return response;
          if (response.status === 429 || response.status >= 500) {
            if (i < retries) {
              await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
              continue;
            }
          }
          return response;
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (i === retries) throw err;
          const isTimeout = err.name === 'AbortError';
          console.warn(`[Scout] Fetch attempt ${i + 1} failed (${isTimeout ? 'Timeout' : err.message}). Retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
      throw new Error('Fetch failed after retries');
    };

    for (const queryBase of queryVariations) {
      // Clean up query: remove double spaces and trim
      const cleanQueryBase = queryBase.replace(/\s+/g, ' ').trim();
      const query = (cleanQueryBase + (cleanQueryBase.includes('collection:') ? '' : baseFilter)).replace(/\s+/g, ' ').trim();
      const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,mediatype,collection&rows=10&page=1&output=json`;
      const proxySearchUrl = `/api/tunnel?url=${encodeURIComponent(searchUrl)}`;

      try {
        const response = await fetchWithRetry(proxySearchUrl);
        if (!response.ok) {
          console.warn(`[Scout] Proxy returned ${response.status} for search query: ${query}`);
          continue;
        }
        
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn(`[Scout] Invalid JSON from proxy: ${text.substring(0, 100)}`);
          continue;
        }
        
        let docs = [];
        if (data.response && Array.isArray(data.response.docs)) {
          docs = data.response.docs;
        } else if (data.items && Array.isArray(data.items)) {
          docs = data.items;
        }
        
        if (docs.length > 0) {
          console.log(`[Scout] Resultados encontrados con query: ${queryBase}`);
          const candidates: ROMCandidate[] = [];
          
          // Limit to first 5 documents to avoid overwhelming the server/network
          const limitedDocs = docs.slice(0, 5);
          
          // For each item found, fetch its file list to find the best ROM
          for (const doc of limitedDocs) {
            try {
              const metadataUrl = `https://archive.org/metadata/${doc.identifier}`;
              const proxyMetaUrl = `/api/tunnel?url=${encodeURIComponent(metadataUrl)}`;
              const metaResponse = await fetchWithRetry(proxyMetaUrl);
              if (!metaResponse.ok) {
                console.warn(`[Scout] Proxy returned ${metaResponse.status} for metadata ${doc.identifier}`);
                continue;
              }
              
              const metaText = await metaResponse.text();
              let metaData;
              try {
                metaData = JSON.parse(metaText);
              } catch (e) {
                console.warn(`[Scout] Invalid JSON for metadata ${doc.identifier}: ${metaText.substring(0, 100)}`);
                continue;
              }
              
              // Skip restricted or dark items
              if (metaData.metadata?.is_dark === 'true' || 
                  metaData.metadata?.access_restricted_item === 'true' ||
                  metaData.is_dark || 
                  metaData.is_restricted) {
                console.log(`[Scout] Saltando item restringido: ${doc.identifier}`);
                continue;
              }
              
              if (metaData.files) {
                // Filter for files that look like ROMs or Zips
                const romFiles = metaData.files.filter((f: any) => {
                  const name = f.name.toLowerCase();
                  const size = parseInt(f.size || '0');
                  
                  // Basic validation: must have size and valid extension
                  if (size < 4096) return false; // Skip tiny files (often text files disguised as zips)

                  // Evitar archivos masivos que probablemente son colecciones completas
                  // Un juego de NES/GB/GBA raramente pasa de 32MB (excepto CD-ROMs como PSX)
                  const isCD = system === 'psx' || system === 'PS1' || system === 'PS2' || system === 'segacd' || system === 'Sega CD' || system === 'Dreamcast' || system === 'saturn';
                  if (!isCD && size > 100 * 1024 * 1024) return false; // > 100MB es sospechoso para cartuchos

                  return name.endsWith('.zip') || 
                         name.endsWith('.nes') || name.endsWith('.fds') || name.endsWith('.sfc') || 
                         name.endsWith('.smc') || name.endsWith('.md') || 
                         name.endsWith('.gen') || name.endsWith('.gba') || 
                         name.endsWith('.gbc') || name.endsWith('.gb') || 
                         name.endsWith('.n64') || name.endsWith('.z64') ||
                         name.endsWith('.iso') || name.endsWith('.chd') ||
                         name.endsWith('.bin') || name.endsWith('.cue');
                });

                if (romFiles.length > 0) {
                  // Extract potential title from gameId for matching
                  const titleMatch = cleanGameId.toLowerCase().replace(/[^a-z0-9]/g, '');

                  // Priority: Title Match > No-Intro > Redump > Others
                  romFiles.sort((a: any, b: any) => {
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    const aCleanName = aName.replace(/[^a-z0-9]/g, '');
                    const bCleanName = bName.replace(/[^a-z0-9]/g, '');
                    
                    let aScore = aName.includes('no-intro') ? 2 : (aName.includes('redump') ? 1 : 0);
                    let bScore = bName.includes('no-intro') ? 2 : (bName.includes('redump') ? 1 : 0);
                    
                    // Boost score if filename contains the target title
                    if (titleMatch.length >= 3 && aCleanName.includes(titleMatch)) aScore += 10;
                    if (titleMatch.length >= 3 && bCleanName.includes(titleMatch)) bScore += 10;
                    
                    // Penalize .fds if it's a standard NES search
                    if (system.toLowerCase() === 'nes') {
                      if (aName.endsWith('.fds')) aScore -= 5;
                      if (bName.endsWith('.fds')) bScore -= 5;
                    }

                    // If one has a much better score, use it
                    if (aScore !== bScore) return bScore - aScore;
                    
                    // Otherwise, pick the largest file (often the most complete/best dump)
                    return parseInt(b.size || '0') - parseInt(a.size || '0');
                  });
                  
                  const bestFile = romFiles[0];
                  // Use the full file name including path, but encode it properly
                  const encodedFileName = bestFile.name.split('/').map((part: string) => encodeURIComponent(part)).join('/');
                  
                  candidates.push({
                    url: `https://archive.org/download/${doc.identifier}/${encodedFileName}`,
                    source: this.name,
                    reliabilityScore: 0.9,
                    latency: 0,
                    metadata: { identifier: doc.identifier, filename: bestFile.name, size: bestFile.size }
                  });
                }
              }
            } catch (err) {
              console.warn(`[Scout] Error fetching metadata for ${doc.identifier}:`, err);
            }
          }

          if (candidates.length > 0) {
            return candidates;
          }
        }
      } catch (e) {
        console.error('[Scout] Error consultando Archive.org:', e);
      }
    }

    console.log(`[Scout] No se encontraron resultados para ${cleanGameId} en ${system} tras varios intentos.`);
    return [];
  }
}
