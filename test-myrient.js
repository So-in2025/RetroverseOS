import { ROMDiscoveryBrain } from './src/services/DiscoveryBrain.js';
import { gameCatalog } from './src/services/gameCatalog.js';

async function test() {
  const brain = new ROMDiscoveryBrain();
  const candidate = await brain.findBestCandidate('nes_14_Castlevania', 'nes');
  console.log('Best candidate:', candidate);
}

test();
