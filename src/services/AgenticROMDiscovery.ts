export interface ROMCandidate {
  url: string;
  source: string;
  reliabilityScore: number; // 0.0 - 1.0
  latency: number; // ms
  metadata?: Record<string, any>;
}

export interface ScoutAgent {
  name: string;
  discover(gameId: string, system: string): Promise<ROMCandidate[]>;
}

export interface GatekeeperAgent {
  validate(candidate: ROMCandidate): Promise<boolean>;
}

export interface DiscoveryBrain {
  findBestCandidate(gameId: string, system: string): Promise<ROMCandidate | null>;
}
