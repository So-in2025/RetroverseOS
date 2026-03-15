import { GameObject } from './metadataNormalization';
import { STATIC_CORE_CATALOG } from './staticCatalog';

// A curated list of the top 50 retro games of all time
export const TOP_50_GAME_IDS = [
  'SuperMarioBros.USA',
  'SuperMarioBros3USA',
  'TheLegendofZeldaUSA',
  'SuperMarioWorldUSA',
  'ZeldaLinkToThePastUSA',
  'SuperMetroidUSA',
  'ChronoTriggerUSA',
  'DonkeyKongCountryUSA',
  'SonicTheHedgehogUSA',
  'SonicTheHedgehog2USA',
  'StreetsOfRage2USA',
  'PokemonFireRedUSA',
  'PokemonEmeraldUSA',
  'MetroidFusionUSA',
  'ZeldaMinishCapUSA',
  'SuperMario64USA',
  'MarioKart64USA',
  'ZeldaOcarinaOfTimeUSA',
  'SuperSmashBrosUSA',
  'MetalGearSolidUSA',
  'FinalFantasyVIIUSA',
  'CastlevaniaSOTNUSA',
  'CrashBandicootUSA',
  'Tekken3USA',
  'EarthBoundUSA',
  'SuperMarioKartUSA',
  'StarFoxUSA',
  'SonicTheHedgehog3USA',
  'GoldenAxeUSA',
  'GunstarHeroesUSA',
  'AdvanceWarsUSA',
  'GoldenSunUSA',
  'GoldenEye007USA',
  'StarFox64USA',
  'ResidentEvil2USA',
  'SpyroTheDragonUSA',
  'MegaManXUSA',
  'FinalFantasyIIIUSA',
  'SecretOfManaUSA',
  'CastlevaniaAriaOfSorrowUSA',
  'MetroidZeroMissionUSA',
  'MarioLuigiSuperstarSagaUSA',
  'BanjoKazooieUSA',
  'PerfectDarkUSA',
  'GranTurismo2USA',
  'TonyHawksProSkater2USA',
  'SuperMarioRPGUSA',
  'FZeroUSA',
  'ContraIIIUSA',
  'TMNT4TurtlesInTimeUSA'
];

export const getTop50Games = (): GameObject[] => {
  const gamesMap = new Map<string, GameObject>();
  
  // Populate map with all static games
  STATIC_CORE_CATALOG.forEach(game => {
    gamesMap.set(game.game_id, game);
  });

  // Filter and order based on TOP_50_GAME_IDS
  const top50: GameObject[] = [];
  
  TOP_50_GAME_IDS.forEach(id => {
    const game = gamesMap.get(id);
    if (game) {
      top50.push(game);
    }
  });

  // If we didn't find exactly 50, pad with other highly rated games
  if (top50.length < 50) {
    for (const game of STATIC_CORE_CATALOG) {
      if (!top50.find(g => g.game_id === game.game_id)) {
        top50.push(game);
        if (top50.length >= 50) break;
      }
    }
  }

  return top50;
};
