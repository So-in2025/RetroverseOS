export const isCompetitiveEnabled = true;

export const COMPETITIVE_GAMES = {
  street_fighter_ii: 'sf2_game_id', // Replace with actual game_id from gameCatalog
  smash_64: 'smash64_game_id',
  mario_kart_64: 'mk64_game_id',
  tetris: 'tetris_game_id',
  nba_jam: 'nbajam_game_id',
};

export const ELO_CONFIG = {
  BASE_MMR: 1000,
  K_FACTOR: 32,
};

export const MATCHMAKING_CONFIG = {
  SEARCH_INTERVAL_MS: 5000,
  INITIAL_MMR_RANGE: 100,
  TIMEOUT_MS: 30000,
};

// Set season end date to 30 days from now for prototype
const nextMonth = new Date();
nextMonth.setDate(nextMonth.getDate() + 30);
export const SEASON_END_DATE = nextMonth.toISOString();
