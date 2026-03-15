import { GameObject } from './metadataNormalization';
import { STATIC_CORE_CATALOG } from './staticCatalog';

// Compact Game Definition: [Title, SystemID, Year, Publisher, Developer, Players, FileName (optional)]
// If FileName is omitted, Title is used for file generation.
export type CompactGame = [string, string, number, string, string, number, string?];

// System Constants for Compact List
const NES = 'nes';
const SNES = 'snes';
const GEN = 'sega_genesis';
const GBA = 'gba';
const N64 = 'n64';
const PSX = 'psx';

// Myrient Base URLs (Duplicated here for independence or imported)
const MYRIENT_NES = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20Entertainment%20System%20%28Headered%29';
const MYRIENT_SNES = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Super%20Nintendo%20Entertainment%20System';
const MYRIENT_GEN = 'https://myrient.erista.me/files/No-Intro/Sega%20-%20Mega%20Drive%20-%20Genesis';
const MYRIENT_GBA = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Advance';
const MYRIENT_GBC = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Color';
const MYRIENT_GB = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy';
const MYRIENT_N64 = 'https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%2064%20%28BigEndian%29';
const MYRIENT_PSX = 'https://myrient.erista.me/files/Redump/Sony%20-%20PlayStation';
const MYRIENT_ATARI_2600 = 'https://myrient.erista.me/files/No-Intro/Atari%20-%202600';
const MYRIENT_ATARI_7800 = 'https://myrient.erista.me/files/No-Intro/Atari%20-%207800';
const MYRIENT_LYNX = 'https://myrient.erista.me/files/No-Intro/Atari%20-%20Lynx';
const MYRIENT_MASTERSYSTEM = 'https://myrient.erista.me/files/No-Intro/Sega%20-%20Master%20System%20-%20Mark%20III';
const MYRIENT_GAMEGEAR = 'https://myrient.erista.me/files/No-Intro/Sega%20-%20Game%20Gear';
const MYRIENT_PCENGINE = 'https://myrient.erista.me/files/No-Intro/NEC%20-%20PC%20Engine%20-%20TurboGrafx%2016';
const MYRIENT_WONDERSWAN = 'https://myrient.erista.me/files/No-Intro/Bandai%20-%20WonderSwan';
const MYRIENT_NGP = 'https://myrient.erista.me/files/No-Intro/SNK%20-%20Neo%20Geo%20Pocket';

// Libretro System Names for Thumbnails
const LIBRETRO_SYSTEMS: Record<string, string> = {
  'nes': 'Nintendo - Nintendo Entertainment System',
  'snes': 'Nintendo - Super Nintendo Entertainment System',
  'sega_genesis': 'Sega - Mega Drive - Genesis',
  'gba': 'Nintendo - Game Boy Advance',
  'gbc': 'Nintendo - Game Boy Color',
  'gb': 'Nintendo - Game Boy',
  'n64': 'Nintendo - Nintendo 64',
  'psx': 'Sony - PlayStation',
  'atari_2600': 'Atari - 2600',
  'atari_7800': 'Atari - 7800',
  'lynx': 'Atari - Lynx',
  'mastersystem': 'Sega - Master System - Mark III',
  'gamegear': 'Sega - Game Gear',
  'pcengine': 'NEC - PC Engine - TurboGrafx 16',
  'wonderswan': 'Bandai - WonderSwan',
  'ngp': 'SNK - Neo Geo Pocket'
};

// Helper to generate URLs
const getUrls = (sysId: string, title: string) => {
  const libretroSys = LIBRETRO_SYSTEMS[sysId].replace(/ /g, '_');
  const eSys = encodeURIComponent(libretroSys);
  const eTitle = encodeURIComponent(title.replace(/[&*/:`<>?\|"]/g, '_'));
  return {
    cover: `https://raw.githubusercontent.com/libretro-thumbnails/${eSys}/master/Named_Boxarts/${eTitle}.png`,
    art: `https://raw.githubusercontent.com/libretro-thumbnails/${eSys}/master/Named_Snaps/${eTitle}.png`
  };
};

// Helper to generate ROM URL
const getRomUrl = (sysId: string, fileName: string) => {
  const eFile = encodeURIComponent(fileName);
  switch (sysId) {
    case 'nes': return `${MYRIENT_NES}/${eFile}.zip`;
    case 'snes': return `${MYRIENT_SNES}/${eFile}.zip`;
    case 'sega_genesis': return `${MYRIENT_GEN}/${eFile}.zip`;
    case 'gba': return `${MYRIENT_GBA}/${eFile}.zip`;
    case 'gbc': return `${MYRIENT_GBC}/${eFile}.zip`;
    case 'gb': return `${MYRIENT_GB}/${eFile}.zip`;
    case 'n64': return `${MYRIENT_N64}/${eFile}.zip`;
    case 'psx': return `${MYRIENT_PSX}/${eFile}.zip`;
    case 'atari_2600': return `${MYRIENT_ATARI_2600}/${eFile}.zip`;
    case 'atari_7800': return `${MYRIENT_ATARI_7800}/${eFile}.zip`;
    case 'lynx': return `${MYRIENT_LYNX}/${eFile}.zip`;
    case 'mastersystem': return `${MYRIENT_MASTERSYSTEM}/${eFile}.zip`;
    case 'gamegear': return `${MYRIENT_GAMEGEAR}/${eFile}.zip`;
    case 'pcengine': return `${MYRIENT_PCENGINE}/${eFile}.zip`;
    case 'wonderswan': return `${MYRIENT_WONDERSWAN}/${eFile}.zip`;
    case 'ngp': return `${MYRIENT_NGP}/${eFile}.zip`;
    default: return '';
  }
};

// Helper to get Emulator Core
const getCore = (sysId: string) => {
  switch (sysId) {
    case 'nes': return 'fceumm';
    case 'snes': return 'snes9x';
    case 'sega_genesis': return 'genesis_plus_gx';
    case 'gba': return 'mgba';
    case 'gbc': return 'gambatte';
    case 'gb': return 'gambatte';
    case 'n64': return 'mupen64plus_next';
    case 'psx': return 'pcsx_rearmed';
    case 'atari_2600': return 'stella';
    case 'atari_7800': return 'prosystem';
    case 'lynx': return 'handy';
    case 'mastersystem': return 'genesis_plus_gx';
    case 'gamegear': return 'genesis_plus_gx';
    case 'pcengine': return 'mednafen_pce_fast';
    case 'wonderswan': return 'mednafen_wswan';
    case 'ngp': return 'mednafen_ngp';
    default: return '';
  }
};

// Helper to get System Display Name
const getSystemName = (sysId: string) => {
  switch (sysId) {
    case 'nes': return 'NES';
    case 'snes': return 'SNES';
    case 'sega_genesis': return 'GENESIS';
    case 'gba': return 'GBA';
    case 'gbc': return 'GBC';
    case 'gb': return 'GB';
    case 'n64': return 'N64';
    case 'psx': return 'PSX';
    case 'atari_2600': return 'ATARI 2600';
    case 'atari_7800': return 'ATARI 7800';
    case 'lynx': return 'LYNX';
    case 'mastersystem': return 'MASTER SYSTEM';
    case 'gamegear': return 'GAME GEAR';
    case 'pcengine': return 'PC ENGINE';
    case 'wonderswan': return 'WONDERSWAN';
    case 'ngp': return 'NEO GEO POCKET';
    default: return sysId.toUpperCase();
  }
};

// Massive Compact List of Games
// This allows us to define thousands of games with minimal code footprint
const COMPACT_CATALOG: CompactGame[] = [
  // NES CLASSICS
  ['Adventure Island', NES, 1986, 'Hudson Soft', 'Hudson Soft', 1, 'Adventure Island (USA)'],
  ['Adventure Island II', NES, 1991, 'Hudson Soft', 'Hudson Soft', 1, 'Adventure Island II (USA)'],
  ['Adventure Island 3', NES, 1992, 'Hudson Soft', 'Hudson Soft', 1, 'Adventure Island 3 (USA)'],
  ['Adventures of Lolo', NES, 1989, 'HAL Laboratory', 'HAL Laboratory', 1, 'Adventures of Lolo (USA)'],
  ['Adventures of Lolo 2', NES, 1990, 'HAL Laboratory', 'HAL Laboratory', 1, 'Adventures of Lolo 2 (USA)'],
  ['Adventures of Lolo 3', NES, 1991, 'HAL Laboratory', 'HAL Laboratory', 1, 'Adventures of Lolo 3 (USA)'],
  ['Balloon Fight', NES, 1986, 'Nintendo', 'Nintendo', 2, 'Balloon Fight (USA)'],
  ['Baseball', NES, 1985, 'Nintendo', 'Nintendo', 2, 'Baseball (USA, Europe)'],
  ['Batman: The Video Game', NES, 1990, 'Sunsoft', 'Sunsoft', 1, 'Batman - The Video Game (USA)'],
  ['Battletoads', NES, 1991, 'Tradewest', 'Rare', 2, 'Battletoads (USA)'],
  ['Battletoads & Double Dragon', NES, 1993, 'Tradewest', 'Rare', 2, 'Battletoads-Double Dragon (USA)'],
  ['Bionic Commando', NES, 1988, 'Capcom', 'Capcom', 1, 'Bionic Commando (USA)'],
  ['Blaster Master', NES, 1988, 'Sunsoft', 'Sunsoft', 1, 'Blaster Master (USA)'],
  ['Bubble Bobble', NES, 1988, 'Taito', 'Taito', 2, 'Bubble Bobble (USA)'],
  ['Castlevania', NES, 1987, 'Konami', 'Konami', 1, 'Castlevania (USA)'],
  ['Castlevania II: Simon\'s Quest', NES, 1988, 'Konami', 'Konami', 1, 'Castlevania II - Simon\'s Quest (USA)'],
  ['Chip \'n Dale: Rescue Rangers', NES, 1990, 'Capcom', 'Capcom', 2, 'Chip \'n Dale - Rescue Rangers (USA)'],
  ['Chip \'n Dale: Rescue Rangers 2', NES, 1994, 'Capcom', 'Capcom', 2, 'Chip \'n Dale - Rescue Rangers 2 (USA)'],
  ['Double Dragon', NES, 1988, 'Tradewest', 'Technos Japan', 2, 'Double Dragon (USA)'],
  ['Double Dragon II: The Revenge', NES, 1990, 'Acclaim', 'Technos Japan', 2, 'Double Dragon II - The Revenge (USA)'],
  ['Double Dragon III: The Sacred Stones', NES, 1991, 'Acclaim', 'Technos Japan', 2, 'Double Dragon III - The Sacred Stones (USA)'],
  ['Dr. Mario', NES, 1990, 'Nintendo', 'Nintendo', 2, 'Dr. Mario (USA, Europe)'],
  ['DuckTales', NES, 1989, 'Capcom', 'Capcom', 1, 'DuckTales (USA)'],
  ['DuckTales 2', NES, 1993, 'Capcom', 'Capcom', 1, 'DuckTales 2 (USA)'],
  ['Excitebike', NES, 1985, 'Nintendo', 'Nintendo', 1, 'Excitebike (USA)'],
  ['Final Fantasy', NES, 1990, 'Nintendo', 'Square', 1, 'Final Fantasy (USA)'],
  ['Galaga: Demons of Death', NES, 1988, 'Bandai', 'Namco', 2, 'Galaga - Demons of Death (USA)'],
  ['Ghosts \'n Goblins', NES, 1986, 'Capcom', 'Capcom', 2, 'Ghosts \'n Goblins (USA)'],
  ['Gradius', NES, 1986, 'Konami', 'Konami', 2, 'Gradius (USA)'],
  ['Ice Climber', NES, 1985, 'Nintendo', 'Nintendo', 2, 'Ice Climber (USA)'],
  ['Kid Icarus', NES, 1987, 'Nintendo', 'Nintendo', 1, 'Kid Icarus (USA)'],
  ['Kirby\'s Adventure', NES, 1993, 'Nintendo', 'HAL Laboratory', 1, 'Kirby\'s Adventure (USA)'],
  ['Kung Fu', NES, 1985, 'Nintendo', 'Irem', 2, 'Kung Fu (USA)'],
  ['Life Force', NES, 1988, 'Konami', 'Konami', 2, 'Life Force (USA)'],
  ['Little Nemo: The Dream Master', NES, 1990, 'Capcom', 'Capcom', 1, 'Little Nemo - The Dream Master (USA)'],
  ['Lode Runner', NES, 1987, 'Broderbund', 'Hudson Soft', 2, 'Lode Runner (USA)'],
  ['Mega Man', NES, 1987, 'Capcom', 'Capcom', 1, 'Mega Man (USA)'],
  ['Mega Man 3', NES, 1990, 'Capcom', 'Capcom', 1, 'Mega Man 3 (USA)'],
  ['Mega Man 4', NES, 1992, 'Capcom', 'Capcom', 1, 'Mega Man 4 (USA)'],
  ['Mega Man 5', NES, 1992, 'Capcom', 'Capcom', 1, 'Mega Man 5 (USA)'],
  ['Mega Man 6', NES, 1994, 'Nintendo', 'Capcom', 1, 'Mega Man 6 (USA)'],
  ['Metal Gear', NES, 1988, 'Ultra Games', 'Konami', 1, 'Metal Gear (USA)'],
  ['Metroid', NES, 1987, 'Nintendo', 'Nintendo', 1, 'Metroid (USA)'],
  ['Mike Tyson\'s Punch-Out!!', NES, 1987, 'Nintendo', 'Nintendo', 1, 'Mike Tyson\'s Punch-Out!! (USA)'],
  ['Ninja Gaiden', NES, 1989, 'Tecmo', 'Tecmo', 1, 'Ninja Gaiden (USA)'],
  ['Ninja Gaiden II: The Dark Sword of Chaos', NES, 1990, 'Tecmo', 'Tecmo', 1, 'Ninja Gaiden II - The Dark Sword of Chaos (USA)'],
  ['Ninja Gaiden III: The Ancient Ship of Doom', NES, 1991, 'Tecmo', 'Tecmo', 1, 'Ninja Gaiden III - The Ancient Ship of Doom (USA)'],
  ['Paperboy', NES, 1988, 'Mindscape', 'Atari Games', 2, 'Paperboy (USA)'],
  ['R.C. Pro-Am', NES, 1988, 'Nintendo', 'Rare', 1, 'R.C. Pro-Am (USA)'],
  ['River City Ransom', NES, 1990, 'Technos Japan', 'Technos Japan', 2, 'River City Ransom (USA)'],
  ['Rygar', NES, 1987, 'Tecmo', 'Tecmo', 1, 'Rygar (USA)'],
  ['Spy Hunter', NES, 1987, 'Sunsoft', 'Bally Midway', 2, 'Spy Hunter (USA)'],
  ['Super C', NES, 1990, 'Konami', 'Konami', 2, 'Super C (USA)'],
  ['Super Mario Bros. 2', NES, 1988, 'Nintendo', 'Nintendo', 1, 'Super Mario Bros. 2 (USA)'],
  ['Tecmo Bowl', NES, 1989, 'Tecmo', 'Tecmo', 2, 'Tecmo Bowl (USA)'],
  ['Tecmo Super Bowl', NES, 1991, 'Tecmo', 'Tecmo', 2, 'Tecmo Super Bowl (USA)'],
  ['Teenage Mutant Ninja Turtles', NES, 1989, 'Ultra Games', 'Konami', 1, 'Teenage Mutant Ninja Turtles (USA)'],
  ['Teenage Mutant Ninja Turtles II: The Arcade Game', NES, 1990, 'Ultra Games', 'Konami', 2, 'Teenage Mutant Ninja Turtles II - The Arcade Game (USA)'],
  ['Teenage Mutant Ninja Turtles III: The Manhattan Project', NES, 1992, 'Konami', 'Konami', 2, 'Teenage Mutant Ninja Turtles III - The Manhattan Project (USA)'],
  ['Tetris', NES, 1989, 'Nintendo', 'Nintendo', 1, 'Tetris (USA)'],
  ['Zelda II: The Adventure of Link', NES, 1988, 'Nintendo', 'Nintendo', 1, 'Zelda II - The Adventure of Link (USA)'],

  // SNES CLASSICS
  ['ActRaiser', SNES, 1991, 'Enix', 'Quintet', 1, 'ActRaiser (USA)'],
  ['Aladdin', SNES, 1993, 'Capcom', 'Capcom', 1, 'Aladdin (USA)'],
  ['Breath of Fire', SNES, 1994, 'Squaresoft', 'Capcom', 1, 'Breath of Fire (USA)'],
  ['Breath of Fire II', SNES, 1995, 'Capcom', 'Capcom', 1, 'Breath of Fire II (USA)'],
  ['Castlevania: Dracula X', SNES, 1995, 'Konami', 'Konami', 1, 'Castlevania - Dracula X (USA)'],
  ['Chrono Trigger', SNES, 1995, 'Squaresoft', 'Square', 1, 'Chrono Trigger (USA)'],
  ['Contra III: The Alien Wars', SNES, 1992, 'Konami', 'Konami', 2, 'Contra III - The Alien Wars (USA)'],
  ['Demon\'s Crest', SNES, 1994, 'Capcom', 'Capcom', 1, 'Demon\'s Crest (USA)'],
  ['Donkey Kong Country', SNES, 1994, 'Nintendo', 'Rare', 2, 'Donkey Kong Country (USA)'],
  ['Donkey Kong Country 2: Diddy\'s Kong Quest', SNES, 1995, 'Nintendo', 'Rare', 2, 'Donkey Kong Country 2 - Diddy\'s Kong Quest (USA)'],
  ['Donkey Kong Country 3: Dixie Kong\'s Double Trouble!', SNES, 1996, 'Nintendo', 'Rare', 2, 'Donkey Kong Country 3 - Dixie Kong\'s Double Trouble! (USA)'],
  ['EarthBound', SNES, 1995, 'Nintendo', 'Ape / HAL Laboratory', 1, 'EarthBound (USA)'],
  ['Earthworm Jim', SNES, 1994, 'Playmates', 'Shiny Entertainment', 1, 'Earthworm Jim (USA)'],
  ['Earthworm Jim 2', SNES, 1995, 'Playmates', 'Shiny Entertainment', 1, 'Earthworm Jim 2 (USA)'],
  ['F-Zero', SNES, 1991, 'Nintendo', 'Nintendo', 1, 'F-Zero (USA)'],
  ['Final Fantasy II', SNES, 1991, 'Squaresoft', 'Square', 1, 'Final Fantasy II (USA)'],
  ['Final Fantasy III', SNES, 1994, 'Squaresoft', 'Square', 1, 'Final Fantasy III (USA)'],
  ['Final Fight', SNES, 1991, 'Capcom', 'Capcom', 1, 'Final Fight (USA)'],
  ['Final Fight 2', SNES, 1993, 'Capcom', 'Capcom', 2, 'Final Fight 2 (USA)'],
  ['Final Fight 3', SNES, 1995, 'Capcom', 'Capcom', 2, 'Final Fight 3 (USA)'],
  ['Gradius III', SNES, 1991, 'Konami', 'Konami', 1, 'Gradius III (USA)'],
  ['Harvest Moon', SNES, 1997, 'Natsume', 'Amccus', 1, 'Harvest Moon (USA)'],
  ['Illusion of Gaia', SNES, 1994, 'Nintendo', 'Quintet', 1, 'Illusion of Gaia (USA)'],
  ['Killer Instinct', SNES, 1995, 'Nintendo', 'Rare', 2, 'Killer Instinct (USA)'],
  ['Kirby\'s Dream Course', SNES, 1995, 'Nintendo', 'HAL Laboratory', 2, 'Kirby\'s Dream Course (USA)'],
  ['Kirby\'s Dream Land 3', SNES, 1997, 'Nintendo', 'HAL Laboratory', 2, 'Kirby\'s Dream Land 3 (USA)'],
  ['Lion King, The', SNES, 1994, 'Virgin Interactive', 'Westwood Studios', 1, 'Lion King, The (USA)'],
  ['Lufia & the Fortress of Doom', SNES, 1993, 'Taito', 'Neverland', 1, 'Lufia & the Fortress of Doom (USA)'],
  ['Lufia II: Rise of the Sinistrals', SNES, 1996, 'Natsume', 'Neverland', 1, 'Lufia II - Rise of the Sinistrals (USA)'],
  ['Mega Man 7', SNES, 1995, 'Capcom', 'Capcom', 1, 'Mega Man 7 (USA)'],
  ['Mega Man X', SNES, 1994, 'Capcom', 'Capcom', 1, 'Mega Man X (USA)'],
  ['Mega Man X2', SNES, 1995, 'Capcom', 'Capcom', 1, 'Mega Man X2 (USA)'],
  ['Mega Man X3', SNES, 1996, 'Capcom', 'Capcom', 1, 'Mega Man X3 (USA)'],
  ['Mortal Kombat', SNES, 1993, 'Acclaim', 'Midway', 2, 'Mortal Kombat (USA)'],
  ['Mortal Kombat II', SNES, 1994, 'Acclaim', 'Midway', 2, 'Mortal Kombat II (USA)'],
  ['Mortal Kombat 3', SNES, 1995, 'Williams', 'Midway', 2, 'Mortal Kombat 3 (USA)'],
  ['Ultimate Mortal Kombat 3', SNES, 1996, 'Williams', 'Midway', 2, 'Ultimate Mortal Kombat 3 (USA)'],
  ['NBA Jam', SNES, 1994, 'Acclaim', 'Iguana Entertainment', 4, 'NBA Jam (USA)'],
  ['NBA Jam Tournament Edition', SNES, 1995, 'Acclaim', 'Iguana Entertainment', 4, 'NBA Jam Tournament Edition (USA)'],
  ['Ogre Battle: The March of the Black Queen', SNES, 1995, 'Enix', 'Quest', 1, 'Ogre Battle - The March of the Black Queen (USA)'],
  ['Pilotwings', SNES, 1991, 'Nintendo', 'Nintendo', 1, 'Pilotwings (USA)'],
  ['Secret of Evermore', SNES, 1995, 'Squaresoft', 'Square', 1, 'Secret of Evermore (USA)'],
  ['Secret of Mana', SNES, 1993, 'Squaresoft', 'Square', 3, 'Secret of Mana (USA)'],
  ['Shadowrun', SNES, 1993, 'Data East', 'Beam Software', 1, 'Shadowrun (USA)'],
  ['SimCity', SNES, 1991, 'Nintendo', 'Maxis', 1, 'SimCity (USA)'],
  ['Soul Blazer', SNES, 1992, 'Enix', 'Quintet', 1, 'Soul Blazer (USA)'],
  ['Star Fox', SNES, 1993, 'Nintendo', 'Nintendo EAD', 1, 'Star Fox (USA)'],
  ['Street Fighter II: The World Warrior', SNES, 1992, 'Capcom', 'Capcom', 2, 'Street Fighter II - The World Warrior (USA)'],
  ['Street Fighter II Turbo', SNES, 1993, 'Capcom', 'Capcom', 2, 'Street Fighter II Turbo (USA)'],
  ['Super Castlevania IV', SNES, 1991, 'Konami', 'Konami', 1, 'Super Castlevania IV (USA)'],
  ['Super Ghouls \'n Ghosts', SNES, 1991, 'Capcom', 'Capcom', 1, 'Super Ghouls \'n Ghosts (USA)'],
  ['Super Mario Kart', SNES, 1992, 'Nintendo', 'Nintendo', 2, 'Super Mario Kart (USA)'],
  ['Super Mario RPG: Legend of the Seven Stars', SNES, 1996, 'Nintendo', 'Square', 1, 'Super Mario RPG - Legend of the Seven Stars (USA)'],
  ['Super Mario World', SNES, 1991, 'Nintendo', 'Nintendo', 2, 'Super Mario World (USA)'],
  ['Super Metroid', SNES, 1994, 'Nintendo', 'Nintendo', 1, 'Super Metroid (Japan, USA)'],
  ['Super Punch-Out!!', SNES, 1994, 'Nintendo', 'Nintendo', 1, 'Super Punch-Out!! (USA)'],
  ['Super Star Wars', SNES, 1992, 'JVC', 'LucasArts', 1, 'Super Star Wars (USA)'],
  ['Super Star Wars: The Empire Strikes Back', SNES, 1993, 'JVC', 'LucasArts', 1, 'Super Star Wars - The Empire Strikes Back (USA)'],
  ['Super Star Wars: Return of the Jedi', SNES, 1994, 'JVC', 'LucasArts', 1, 'Super Star Wars - Return of the Jedi (USA)'],
  ['Super Street Fighter II', SNES, 1994, 'Capcom', 'Capcom', 2, 'Super Street Fighter II (USA)'],
  ['Teenage Mutant Ninja Turtles IV: Turtles in Time', SNES, 1992, 'Konami', 'Konami', 2, 'Teenage Mutant Ninja Turtles IV - Turtles in Time (USA)'],
  ['Terranigma', SNES, 1996, 'Nintendo', 'Quintet', 1, 'Terranigma (Europe)'],
  ['Tetris & Dr. Mario', SNES, 1994, 'Nintendo', 'Nintendo', 2, 'Tetris & Dr. Mario (USA)'],
  ['Tetris Attack', SNES, 1996, 'Nintendo', 'Intelligent Systems', 2, 'Tetris Attack (USA)'],
  ['Uniracers', SNES, 1994, 'Nintendo', 'DMA Design', 2, 'Uniracers (USA)'],
  ['Zombies Ate My Neighbors', SNES, 1993, 'Konami', 'LucasArts', 2, 'Zombies Ate My Neighbors (USA)'],

  // GENESIS CLASSICS
  ['Altered Beast', GEN, 1989, 'Sega', 'Sega', 2, 'Altered Beast (USA, Europe)'],
  ['Beyond Oasis', GEN, 1995, 'Sega', 'Ancient', 1, 'Beyond Oasis (USA)'],
  ['Castlevania: Bloodlines', GEN, 1994, 'Konami', 'Konami', 1, 'Castlevania - Bloodlines (USA)'],
  ['Comix Zone', GEN, 1995, 'Sega', 'Sega', 1, 'Comix Zone (USA)'],
  ['Contra: Hard Corps', GEN, 1994, 'Konami', 'Konami', 2, 'Contra - Hard Corps (USA)'],
  ['Dr. Robotnik\'s Mean Bean Machine', GEN, 1993, 'Sega', 'Compile', 2, 'Dr. Robotnik\'s Mean Bean Machine (USA)'],
  ['Dynamite Headdy', GEN, 1994, 'Sega', 'Treasure', 1, 'Dynamite Headdy (USA)'],
  ['Earthworm Jim', GEN, 1994, 'Playmates', 'Shiny Entertainment', 1, 'Earthworm Jim (USA)'],
  ['Earthworm Jim 2', GEN, 1995, 'Playmates', 'Shiny Entertainment', 1, 'Earthworm Jim 2 (USA)'],
  ['Ecco the Dolphin', GEN, 1993, 'Sega', 'Novotrade', 1, 'Ecco the Dolphin (USA, Europe)'],
  ['Ecco: The Tides of Time', GEN, 1994, 'Sega', 'Novotrade', 1, 'Ecco - The Tides of Time (USA)'],
  ['Eternal Champions', GEN, 1993, 'Sega', 'Sega', 2, 'Eternal Champions (USA)'],
  ['Flashback', GEN, 1993, 'U.S. Gold', 'Delphine Software', 1, 'Flashback - The Quest for Identity (USA)'],
  ['Golden Axe', GEN, 1989, 'Sega', 'Sega', 2, 'Golden Axe (World)'],
  ['Golden Axe II', GEN, 1991, 'Sega', 'Sega', 2, 'Golden Axe II (World)'],
  ['Golden Axe III', GEN, 1993, 'Sega', 'Sega', 2, 'Golden Axe III (Japan)'],
  ['Gunstar Heroes', GEN, 1993, 'Sega', 'Treasure', 2, 'Gunstar Heroes (USA)'],
  ['Kid Chameleon', GEN, 1992, 'Sega', 'Sega', 1, 'Kid Chameleon (USA, Europe)'],
  ['Landstalker', GEN, 1993, 'Sega', 'Climax Entertainment', 1, 'Landstalker (USA)'],
  ['Light Crusader', GEN, 1995, 'Sega', 'Treasure', 1, 'Light Crusader (USA)'],
  ['Mortal Kombat', GEN, 1993, 'Arena', 'Midway', 2, 'Mortal Kombat (World)'],
  ['Mortal Kombat II', GEN, 1994, 'Acclaim', 'Midway', 2, 'Mortal Kombat II (World)'],
  ['Mortal Kombat 3', GEN, 1995, 'Williams', 'Midway', 2, 'Mortal Kombat 3 (USA)'],
  ['NBA Jam', GEN, 1994, 'Acclaim', 'Iguana Entertainment', 4, 'NBA Jam (USA, Europe)'],
  ['NBA Jam Tournament Edition', GEN, 1995, 'Acclaim', 'Iguana Entertainment', 4, 'NBA Jam Tournament Edition (World)'],
  ['Phantasy Star II', GEN, 1990, 'Sega', 'Sega', 1, 'Phantasy Star II (USA, Europe)'],
  ['Phantasy Star III: Generations of Doom', GEN, 1991, 'Sega', 'Sega', 1, 'Phantasy Star III - Generations of Doom (USA, Europe)'],
  ['Phantasy Star IV', GEN, 1995, 'Sega', 'Sega', 1, 'Phantasy Star IV (USA)'],
  ['Ristar', GEN, 1995, 'Sega', 'Sega', 1, 'Ristar (USA, Europe)'],
  ['Rocket Knight Adventures', GEN, 1993, 'Konami', 'Konami', 1, 'Rocket Knight Adventures (USA)'],
  ['Shadow Dancer: The Secret of Shinobi', GEN, 1990, 'Sega', 'Sega', 1, 'Shadow Dancer - The Secret of Shinobi (World)'],
  ['Shining Force', GEN, 1993, 'Sega', 'Climax Entertainment', 1, 'Shining Force (USA)'],
  ['Shining Force II', GEN, 1994, 'Sega', 'Sonic! Software Planning', 1, 'Shining Force II (USA)'],
  ['Shining in the Darkness', GEN, 1991, 'Sega', 'Climax Entertainment', 1, 'Shining in the Darkness (USA, Europe)'],
  ['Shinobi III: Return of the Ninja Master', GEN, 1993, 'Sega', 'Sega', 1, 'Shinobi III - Return of the Ninja Master (USA)'],
  ['Sonic & Knuckles', GEN, 1994, 'Sega', 'Sega', 1, 'Sonic & Knuckles (World)'],
  ['Sonic the Hedgehog', GEN, 1991, 'Sega', 'Sega', 1, 'Sonic the Hedgehog (USA, Europe)'],
  ['Sonic the Hedgehog 2', GEN, 1992, 'Sega', 'Sega', 2, 'Sonic the Hedgehog 2 (World)'],
  ['Sonic the Hedgehog 3', GEN, 1994, 'Sega', 'Sega', 2, 'Sonic the Hedgehog 3 (USA)'],
  ['Sonic 3D Blast', GEN, 1996, 'Sega', 'Traveller\'s Tales', 1, 'Sonic 3D Blast (USA, Europe)'],
  ['Splatterhouse 2', GEN, 1992, 'Namco', 'Namco', 1, 'Splatterhouse 2 (USA)'],
  ['Splatterhouse 3', GEN, 1993, 'Namco', 'Namco', 1, 'Splatterhouse 3 (USA)'],
  ['Street Fighter II\': Special Champion Edition', GEN, 1993, 'Capcom', 'Capcom', 2, 'Street Fighter II\' - Special Champion Edition (USA)'],
  ['Streets of Rage', GEN, 1991, 'Sega', 'Sega', 2, 'Streets of Rage (World)'],
  ['Streets of Rage 2', GEN, 1992, 'Sega', 'Sega', 2, 'Streets of Rage 2 (USA)'],
  ['Streets of Rage 3', GEN, 1994, 'Sega', 'Sega', 2, 'Streets of Rage 3 (USA)'],
  ['Strider', GEN, 1990, 'Sega', 'Capcom', 1, 'Strider (USA, Europe)'],
  ['Super Street Fighter II', GEN, 1994, 'Capcom', 'Capcom', 2, 'Super Street Fighter II (USA)'],
  ['Teenage Mutant Ninja Turtles: The Hyperstone Heist', GEN, 1992, 'Konami', 'Konami', 2, 'Teenage Mutant Ninja Turtles - The Hyperstone Heist (USA)'],
  ['Toejam & Earl', GEN, 1991, 'Sega', 'Johnson Voorsanger Productions', 2, 'Toejam & Earl (USA, Europe)'],
  ['Toejam & Earl in Panic on Funkotron', GEN, 1993, 'Sega', 'Johnson Voorsanger Productions', 2, 'Toejam & Earl in Panic on Funkotron (USA)'],
  ['Vectorman', GEN, 1995, 'Sega', 'BlueSky Software', 1, 'Vectorman (USA, Europe)'],
  ['Vectorman 2', GEN, 1996, 'Sega', 'BlueSky Software', 1, 'Vectorman 2 (USA)'],
  ['Wonder Boy in Monster World', GEN, 1992, 'Sega', 'Westone', 1, 'Wonder Boy in Monster World (USA, Europe)'],
  ['X-Men 2: Clone Wars', GEN, 1995, 'Sega', 'Headgames', 2, 'X-Men 2 - Clone Wars (USA, Europe)'],

  // GBA CLASSICS
  ['Advance Wars', GBA, 2001, 'Nintendo', 'Intelligent Systems', 4, 'Advance Wars (USA)'],
  ['Advance Wars 2: Black Hole Rising', GBA, 2003, 'Nintendo', 'Intelligent Systems', 4, 'Advance Wars 2 - Black Hole Rising (USA)'],
  ['Astro Boy: Omega Factor', GBA, 2004, 'Sega', 'Treasure', 1, 'Astro Boy - Omega Factor (USA)'],
  ['Boktai: The Sun Is in Your Hand', GBA, 2003, 'Konami', 'Konami', 1, 'Boktai - The Sun Is in Your Hand (USA)'],
  ['Castlevania: Aria of Sorrow', GBA, 2003, 'Konami', 'Konami', 1, 'Castlevania - Aria of Sorrow (USA)'],
  ['Castlevania: Circle of the Moon', GBA, 2001, 'Konami', 'Konami', 1, 'Castlevania - Circle of the Moon (USA)'],
  ['Castlevania: Harmony of Dissonance', GBA, 2002, 'Konami', 'Konami', 1, 'Castlevania - Harmony of Dissonance (USA)'],
  ['Drill Dozer', GBA, 2006, 'Nintendo', 'Game Freak', 1, 'Drill Dozer (USA)'],
  ['Final Fantasy Tactics Advance', GBA, 2003, 'Square Enix', 'Square', 1, 'Final Fantasy Tactics Advance (USA)'],
  ['Final Fantasy I & II: Dawn of Souls', GBA, 2004, 'Nintendo', 'Square', 1, 'Final Fantasy I & II - Dawn of Souls (USA)'],
  ['Final Fantasy IV Advance', GBA, 2005, 'Nintendo', 'Square', 1, 'Final Fantasy IV Advance (USA)'],
  ['Final Fantasy V Advance', GBA, 2006, 'Nintendo', 'Square', 1, 'Final Fantasy V Advance (USA)'],
  ['Final Fantasy VI Advance', GBA, 2007, 'Nintendo', 'Square', 1, 'Final Fantasy VI Advance (USA)'],
  ['Fire Emblem', GBA, 2003, 'Nintendo', 'Intelligent Systems', 1, 'Fire Emblem (USA)'],
  ['Fire Emblem: The Sacred Stones', GBA, 2005, 'Nintendo', 'Intelligent Systems', 1, 'Fire Emblem - The Sacred Stones (USA)'],
  ['Golden Sun', GBA, 2001, 'Nintendo', 'Camelot', 1, 'Golden Sun (USA)'],
  ['Golden Sun: The Lost Age', GBA, 2003, 'Nintendo', 'Camelot', 1, 'Golden Sun - The Lost Age (USA)'],
  ['Gunstar Super Heroes', GBA, 2005, 'Sega', 'Treasure', 1, 'Gunstar Super Heroes (USA)'],
  ['Harvest Moon: Friends of Mineral Town', GBA, 2003, 'Natsume', 'Marvelous', 1, 'Harvest Moon - Friends of Mineral Town (USA)'],
  ['Kingdom Hearts: Chain of Memories', GBA, 2004, 'Square Enix', 'Jupiter', 1, 'Kingdom Hearts - Chain of Memories (USA)'],
  ['Kirby & the Amazing Mirror', GBA, 2004, 'Nintendo', 'HAL Laboratory', 4, 'Kirby & the Amazing Mirror (USA)'],
  ['Kirby: Nightmare in Dream Land', GBA, 2002, 'Nintendo', 'HAL Laboratory', 4, 'Kirby - Nightmare in Dream Land (USA)'],
  ['Legend of Zelda, The: A Link to the Past & Four Swords', GBA, 2002, 'Nintendo', 'Nintendo', 4, 'Legend of Zelda, The - A Link to the Past & Four Swords (USA)'],
  ['Legend of Zelda, The: The Minish Cap', GBA, 2005, 'Nintendo', 'Capcom', 1, 'Legend of Zelda, The - The Minish Cap (USA)'],
  ['Mario & Luigi: Superstar Saga', GBA, 2003, 'Nintendo', 'AlphaDream', 1, 'Mario & Luigi - Superstar Saga (USA)'],
  ['Mario Golf: Advance Tour', GBA, 2004, 'Nintendo', 'Camelot', 4, 'Mario Golf - Advance Tour (USA)'],
  ['Mario Kart: Super Circuit', GBA, 2001, 'Nintendo', 'Intelligent Systems', 4, 'Mario Kart - Super Circuit (USA)'],
  ['Mario Tennis: Power Tour', GBA, 2005, 'Nintendo', 'Camelot', 4, 'Mario Tennis - Power Tour (USA)'],
  ['Mega Man Zero', GBA, 2002, 'Capcom', 'Inti Creates', 1, 'Mega Man Zero (USA)'],
  ['Mega Man Zero 2', GBA, 2003, 'Capcom', 'Inti Creates', 1, 'Mega Man Zero 2 (USA)'],
  ['Mega Man Zero 3', GBA, 2004, 'Capcom', 'Inti Creates', 1, 'Mega Man Zero 3 (USA)'],
  ['Mega Man Zero 4', GBA, 2005, 'Capcom', 'Inti Creates', 1, 'Mega Man Zero 4 (USA)'],
  ['Metroid Fusion', GBA, 2002, 'Nintendo', 'Nintendo', 1, 'Metroid Fusion (USA)'],
  ['Metroid: Zero Mission', GBA, 2004, 'Nintendo', 'Nintendo', 1, 'Metroid - Zero Mission (USA)'],
  ['Mother 3', GBA, 2006, 'Nintendo', 'HAL Laboratory', 1, 'Mother 3 (Japan)'],
  ['Pokemon Emerald', GBA, 2005, 'Nintendo', 'Game Freak', 1, 'Pokemon - Emerald Version (USA)'],
  ['Pokemon FireRed', GBA, 2004, 'Nintendo', 'Game Freak', 1, 'Pokemon - FireRed Version (USA)'],
  ['Pokemon LeafGreen', GBA, 2004, 'Nintendo', 'Game Freak', 1, 'Pokemon - LeafGreen Version (USA)'],
  ['Pokemon Ruby', GBA, 2003, 'Nintendo', 'Game Freak', 1, 'Pokemon - Ruby Version (USA)'],
  ['Pokemon Sapphire', GBA, 2003, 'Nintendo', 'Game Freak', 1, 'Pokemon - Sapphire Version (USA)'],
  ['Sonic Advance', GBA, 2002, 'Sega', 'Dimps', 1, 'Sonic Advance (USA)'],
  ['Sonic Advance 2', GBA, 2003, 'Sega', 'Dimps', 1, 'Sonic Advance 2 (USA)'],
  ['Sonic Advance 3', GBA, 2004, 'Sega', 'Dimps', 1, 'Sonic Advance 3 (USA)'],
  ['Super Mario Advance', GBA, 2001, 'Nintendo', 'Nintendo', 1, 'Super Mario Advance (USA)'],
  ['Super Mario Advance 2: Super Mario World', GBA, 2002, 'Nintendo', 'Nintendo', 1, 'Super Mario Advance 2 - Super Mario World (USA)'],
  ['Super Mario Advance 3: Yoshi\'s Island', GBA, 2002, 'Nintendo', 'Nintendo', 1, 'Super Mario Advance 3 - Yoshi\'s Island (USA)'],
  ['Super Mario Advance 4: Super Mario Bros. 3', GBA, 2003, 'Nintendo', 'Nintendo', 1, 'Super Mario Advance 4 - Super Mario Bros. 3 (USA)'],
  ['Tactics Ogre: The Knight of Lodis', GBA, 2002, 'Atlus', 'Quest', 1, 'Tactics Ogre - The Knight of Lodis (USA)'],
  ['Wario Land 4', GBA, 2001, 'Nintendo', 'Nintendo', 1, 'Wario Land 4 (USA)'],
  ['WarioWare, Inc.: Mega Microgame$!', GBA, 2003, 'Nintendo', 'Nintendo', 1, 'WarioWare, Inc. - Mega Microgame$! (USA)'],
  ['WarioWare: Twisted!', GBA, 2005, 'Nintendo', 'Intelligent Systems', 1, 'WarioWare - Twisted! (USA)'],
  ['Yoshi\'s Topsy-Turvy', GBA, 2005, 'Nintendo', 'Artoon', 1, 'Yoshi\'s Topsy-Turvy (USA)'],
  // N64 CLASSICS
  ['Super Mario 64', N64, 1996, 'Nintendo', 'Nintendo', 1, 'Super Mario 64 (USA)'],
  ['Mario Kart 64', N64, 1997, 'Nintendo', 'Nintendo', 4, 'Mario Kart 64 (USA)'],
  ['The Legend of Zelda: Ocarina of Time', N64, 1998, 'Nintendo', 'Nintendo', 1, 'Legend of Zelda, The - Ocarina of Time (USA)'],
  ['The Legend of Zelda: Majora\'s Mask', N64, 2000, 'Nintendo', 'Nintendo', 1, 'Legend of Zelda, The - Majora\'s Mask (USA)'],
  ['GoldenEye 007', N64, 1997, 'Nintendo', 'Rare', 4, 'GoldenEye 007 (USA)'],
  ['Star Fox 64', N64, 1997, 'Nintendo', 'Nintendo', 4, 'Star Fox 64 (USA)'],
  ['Super Smash Bros.', N64, 1999, 'Nintendo', 'HAL Laboratory', 4, 'Super Smash Bros. (USA)'],
  ['Banjo-Kazooie', N64, 1998, 'Nintendo', 'Rare', 1, 'Banjo-Kazooie (USA)'],
  ['Banjo-Tooie', N64, 2000, 'Nintendo', 'Rare', 4, 'Banjo-Tooie (USA)'],
  ['Perfect Dark', N64, 2000, 'Nintendo', 'Rare', 4, 'Perfect Dark (USA)'],
  ['Donkey Kong 64', N64, 1999, 'Nintendo', 'Rare', 4, 'Donkey Kong 64 (USA)'],
  ['Paper Mario', N64, 2000, 'Nintendo', 'Intelligent Systems', 1, 'Paper Mario (USA)'],
  ['F-Zero X', N64, 1998, 'Nintendo', 'Nintendo', 4, 'F-Zero X (USA)'],
  ['Conker\'s Bad Fur Day', N64, 2001, 'THQ', 'Rare', 4, 'Conker\'s Bad Fur Day (USA)'],
  ['Kirby 64: The Crystal Shards', N64, 2000, 'Nintendo', 'HAL Laboratory', 4, 'Kirby 64 - The Crystal Shards (USA)'],
  ['Pokemon Stadium', N64, 2000, 'Nintendo', 'HAL Laboratory', 2, 'Pokemon Stadium (USA)'],
  ['Pokemon Stadium 2', N64, 2001, 'Nintendo', 'HAL Laboratory', 2, 'Pokemon Stadium 2 (USA)'],
  ['Mario Party', N64, 1998, 'Nintendo', 'Hudson Soft', 4, 'Mario Party (USA)'],
  ['Mario Party 2', N64, 1999, 'Nintendo', 'Hudson Soft', 4, 'Mario Party 2 (USA)'],
  ['Mario Party 3', N64, 2000, 'Nintendo', 'Hudson Soft', 4, 'Mario Party 3 (USA)'],
  ['Star Wars: Rogue Squadron', N64, 1998, 'LucasArts', 'Factor 5', 1, 'Star Wars - Rogue Squadron (USA)'],
  ['Crash Bandicoot: Warped', PSX, 1998, 'Sony', 'Naughty Dog', 1, 'Crash Bandicoot - Warped (USA)'],
  ['Resident Evil 2', PSX, 1998, 'Capcom', 'Capcom', 1, 'Resident Evil 2 (USA) (Disc 1)'],
  ['Tekken 3', PSX, 1998, 'Namco', 'Namco', 2, 'Tekken 3 (USA)'],
  ['Castlevania: Symphony of the Night', PSX, 1997, 'Konami', 'Konami', 1, 'Castlevania - Symphony of the Night (USA)'],
];

// Hydrate the compact list into full GameObjects
export const EXPANDED_CATALOG: GameObject[] = COMPACT_CATALOG.map((game, index) => {
  const [title, systemId, year, publisher, developer, players, fileName] = game;
  
  // Use provided filename or default to title + (USA)
  const finalFileName = fileName || `${title} (USA)`;
  
  // Libretro requires the full No-Intro name (including region tags) to match correctly.
  // We should NOT strip the region tags here.
  const urls = getUrls(systemId, finalFileName);
  
  return {
    game_id: `${systemId}_${index}_${title.replace(/[^a-zA-Z0-9]/g, '')}`,
    title,
    system: getSystemName(systemId),
    system_id: systemId,
    year,
    publisher,
    developer,
    players,
    rom_url: getRomUrl(systemId, finalFileName),
    cover_url: urls.cover,
    artwork_url: urls.art,
    rom_size: 0, // Unknown size for compact entries
    emulator_core: getCore(systemId),
    compatibility_status: 'untested',
    checksum: null,
    playable: true
  };
});

// Merge with Core Catalog and Deduplicate
const rawCatalog = [...STATIC_CORE_CATALOG, ...EXPANDED_CATALOG];
console.log(`[CatalogManager] Raw catalog size: ${rawCatalog.length}`);
const seen = new Set<string>();
export const FULL_CATALOG = rawCatalog.filter(game => {
  // Use a combination of title and system as a unique key for deduplication
  const key = `${game.title.toLowerCase()}_${game.system}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
console.log(`[CatalogManager] Full catalog size: ${FULL_CATALOG.length}`);
