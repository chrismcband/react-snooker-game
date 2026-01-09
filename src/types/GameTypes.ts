export interface GameTypes {
  phase: 'setup' | 'playing' | 'ended';
  turn: 'player1' | 'player2' | 'ai';
  shotPower: number;
  aimAngle: number;
}

export interface PhysicsTypes {
  gravity: number;
  friction: number;
  restitution: number;
  ballMass: number;
}

export interface AITypes {
  difficulty: 'beginner' | 'intermediate' | 'expert';
  accuracy: number;
  strategicDepth: number;
}