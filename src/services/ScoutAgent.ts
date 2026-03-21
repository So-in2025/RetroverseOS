import { ROMCandidate, ScoutAgent } from './AgenticROMDiscovery';

export class ArchiveScoutAgent implements ScoutAgent {
  name = 'Archive.org';

  async discover(gameId: string, system: string): Promise<ROMCandidate[]> {
    console.log(`[Scout] Buscando candidatos para ${gameId} en Archive.org...`);
    
    const query = `title:"${gameId}" AND mediatype:data AND collection:nointro`;
    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&output=json&rows=5`;

    try {
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (!data.response || data.response.numFound === 0) return [];

      return data.response.docs.map((doc: any) => ({
        url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.zip`,
        source: this.name,
        reliabilityScore: 0.8,
        latency: 0,
        metadata: { identifier: doc.identifier }
      }));
    } catch (e) {
      console.error('[Scout] Error consultando Archive.org:', e);
      return [];
    }
  }
}
