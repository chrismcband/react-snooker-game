export interface Vector2D {
  x: number;
  y: number;
}

export interface CollisionEvent {
  ball1: string;
  ball2: string;
  position: Vector2D;
  velocity: Vector2D;
}

export interface PhysicsBody {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  mass: number;
  radius: number;
}