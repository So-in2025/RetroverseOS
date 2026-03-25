import { ROMCandidate, GatekeeperAgent } from './AgenticROMDiscovery';

export class ROMGatekeeperAgent implements GatekeeperAgent {
  async validate(candidate: ROMCandidate): Promise<boolean> {
    console.log(`[Gatekeeper] Validando ${candidate.url}...`);
    
    try {
      // Usamos el proxy para evitar CORS y problemas de red directos
      const proxyUrl = `/api/tunnel?url=${encodeURIComponent(candidate.url)}`;
      
      // Intentamos una petición GET pero con un timeout corto o simplemente confiamos en el proxy
      // Para validación rápida, el proxy ya maneja reintentos y headers correctos
      const response = await fetch(proxyUrl, { 
        method: 'GET',
        headers: {
          'Range': 'bytes=0-1023' // Solo pedimos el primer KB para validar existencia y tipo
        }
      });
      
      if (!response.ok) {
        console.warn(`[Gatekeeper] URL muerta o inaccesible: ${candidate.url} (Status: ${response.status})`);
        return false;
      }

      const text = await response.text();
      if (text.trim().toLowerCase().startsWith('<') || text.toLowerCase().includes('<!doctype html>')) {
        console.warn(`[Gatekeeper] URL devuelve HTML en lugar de binario: ${candidate.url}`);
        return false;
      }

      return true;
    } catch (e) {
      console.error(`[Gatekeeper] Error validando ${candidate.url}:`, e);
      return false;
    }
  }
}
