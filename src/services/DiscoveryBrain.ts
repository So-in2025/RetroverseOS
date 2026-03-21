import { ROMCandidate, DiscoveryBrain } from './AgenticROMDiscovery';
import { ArchiveScoutAgent } from './ScoutAgent';
import { ROMGatekeeperAgent } from './GatekeeperAgent';
import { DiscoveryCache } from './DiscoveryCache';

export class ROMDiscoveryBrain implements DiscoveryBrain {
  private scouts = [new ArchiveScoutAgent()]; // Aquí podemos añadir más scouts en el futuro
  private gatekeeper = new ROMGatekeeperAgent();

  async findBestCandidate(gameId: string, system: string): Promise<ROMCandidate | null> {
    // 1. Check Cache
    const cached = await DiscoveryCache.get(gameId, system);
    if (cached) {
      console.log(`[Brain] Cache hit for ${gameId}`);
      return cached;
    }

    console.log(`[Brain] Iniciando descubrimiento paralelo para ${gameId}...`);

    // 2. Parallel Scouting
    const scoutingPromises = this.scouts.map(scout => scout.discover(gameId, system));
    const results = await Promise.all(scoutingPromises);
    const allCandidates = results.flat();

    // 3. Parallel Validation & Scoring
    const validCandidates: ROMCandidate[] = [];
    for (const candidate of allCandidates) {
      const start = performance.now();
      const isValid = await this.gatekeeper.validate(candidate);
      const end = performance.now();
      
      if (isValid) {
        candidate.latency = end - start;
        validCandidates.push(candidate);
      }
    }

    if (validCandidates.length === 0) return null;

    // 4. Ranking Algorithm
    const bestCandidate = validCandidates.sort((a, b) => {
      const scoreA = (a.reliabilityScore * 0.7) + (1000 / (a.latency + 1) * 0.3);
      const scoreB = (b.reliabilityScore * 0.7) + (1000 / (b.latency + 1) * 0.3);
      return scoreB - scoreA;
    })[0];

    // 5. Cache & Return
    await DiscoveryCache.set(gameId, system, bestCandidate);
    return bestCandidate;
  }
}
