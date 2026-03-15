import { FULL_CATALOG } from './src/services/catalogManager';
console.log('Total games in FULL_CATALOG:', FULL_CATALOG.length);

const ids = new Set();
const duplicates = [];
FULL_CATALOG.forEach(g => {
  if (ids.has(g.game_id)) {
    duplicates.push(g.game_id);
  }
  ids.add(g.game_id);
});

console.log('Unique games in FULL_CATALOG:', ids.size);
console.log('Duplicates found:', duplicates.length);
if (duplicates.length > 0) {
  console.log('Duplicate IDs:', duplicates.slice(0, 10), duplicates.length > 10 ? '...' : '');
}
