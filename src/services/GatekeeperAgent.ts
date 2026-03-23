import { ROMCandidate, GatekeeperAgent } from './AgenticROMDiscovery';

export class ROMGatekeeperAgent implements GatekeeperAgent {
  async validate(candidate: ROMCandidate): Promise<boolean> {
    console.log(`[Gatekeeper] Validando ${candidate.url}...`);
    
    try {
      // Usamos HEAD para no descargar el archivo, solo verificar cabeceras
      const response = await fetch(candidate.url, { method: 'HEAD' });
      
      if (!response.ok) {
        console.warn(`[Gatekeeper] URL muerta: ${candidate.url} (Status: ${response.status})`);
        return false;
      }

      const contentLength = response.headers.get('content-length');
      // Si el tamaño es menor a 1KB, probablemente sea un error o archivo vacío
      if (contentLength && parseInt(contentLength) < 1024) {
        console.warn(`[Gatekeeper] Archivo demasiado pequeño: ${candidate.url}`);
        return false;
      }

      return true;
    } catch (e) {
      console.error(`[Gatekeeper] Error validando ${candidate.url}:`, e);
      return false;
    }
  }
}
