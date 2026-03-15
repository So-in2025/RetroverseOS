import { MetadataNormalizationEngine } from './src/services/metadataNormalization';

async function test() {
  console.log('Testing Archive.org search for NES...');
  try {
    const results = await MetadataNormalizationEngine.searchArchiveOrg('', 'nes', 10, 1);
    console.log('Results found:', results.length);
    if (results.length > 0) {
      console.log('First result:', results[0].title, results[0].game_id);
    }
  } catch (e) {
    console.error('Search failed:', e);
  }
}

test();
