export type Platform = 'psx' | 'n64' | 'snes' | 'nes' | 'gba';

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  coverUrl: string;
  romUrl: string;
  description: string;
  releaseYear: number;
  rating: number;
}

export interface EmulatorState {
  isPlaying: boolean;
  currentGame: Game | null;
  volume: number;
  isMuted: boolean;
}
