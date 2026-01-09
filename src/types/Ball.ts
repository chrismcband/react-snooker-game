export interface Ball {
  id: string;
  type: 'cue' | 'red' | 'color';
  color: string;
  pointValue: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isPocketed: boolean;
  // Spin properties (angular velocity)
  spinX: number; // Side spin
  spinY: number; // Back/forward spin
  spinZ: number; // Top/bottom spin
}

export interface TableDimensions {
  width: number;
  height: number;
  cushionWidth: number;
  pocketRadius: number;
}

export interface Pocket {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface GameState {
  currentPlayer: 1 | 2;
  scores: {
    player1: number;
    player2: number;
  };
  balls: Ball[];
  isGameActive: boolean;
  currentBreak: number;
  foulCommitted: boolean;
}