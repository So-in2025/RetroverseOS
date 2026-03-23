import { Game } from './types';

export const GAMES: Game[] = [
  {
    id: 'mgs1',
    title: 'Metal Gear Solid',
    platform: 'psx',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1v9m.jpg',
    romUrl: 'https://archive.org/download/psx-chd-roms-m/Metal%20Gear%20Solid%20%28USA%29%20%28Disc%201%29.chd',
    description: 'A tactical espionage masterpiece by Hideo Kojima. Solid Snake must infiltrate a nuclear weapons facility to neutralize a terrorist threat.',
    releaseYear: 1998,
    rating: 4.9
  },
  {
    id: 'ff7',
    title: 'Final Fantasy VII',
    platform: 'psx',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co296m.jpg',
    romUrl: 'https://archive.org/download/psx-chd-roms-f/Final%20Fantasy%20VII%20%28USA%29%20%28Disc%201%29.chd',
    description: 'The legendary RPG that defined a generation. Join Cloud Strife and Avalanche in their fight against the Shinra Electric Power Company.',
    releaseYear: 1997,
    rating: 4.8
  },
  {
    id: 'castlevania-sotn',
    title: 'Castlevania: Symphony of the Night',
    platform: 'psx',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1v8r.jpg',
    romUrl: 'https://archive.org/download/psx-chd-roms-c/Castlevania%20-%20Symphony%20of%20the%20Night%20%28USA%29.chd',
    description: 'The definitive Metroidvania. Play as Alucard, the son of Dracula, as he explores his father\'s castle to destroy it once and for all.',
    releaseYear: 1997,
    rating: 4.9
  },
  {
    id: 'sm64',
    title: 'Super Mario 64',
    platform: 'n64',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1v9q.jpg',
    romUrl: 'https://archive.org/download/super-mario-64-usa_202401/Super%20Mario%2064%20%28USA%29.z64',
    description: 'The game that revolutionized 3D platforming. Explore Princess Peach\'s castle and collect Power Stars to save her from Bowser.',
    releaseYear: 1996,
    rating: 4.7
  },
  {
    id: 'mk64',
    title: 'Mario Kart 64',
    platform: 'n64',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1v9p.jpg',
    romUrl: 'https://archive.org/download/mario-kart-64-usa_202401/Mario%20Kart%2064%20%28USA%29.z64',
    description: 'The classic kart racer. Compete with friends or AI in various cups and battle modes.',
    releaseYear: 1996,
    rating: 4.6
  }
];
