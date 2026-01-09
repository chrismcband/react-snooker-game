import { Ball } from '../types/Ball';
import { TABLE_DIMENSIONS, PHYSICS_CONSTANTS } from '../utils/constants';

export class CollisionSystem {
  // Check collision between two balls
  public static checkBallCollision(ball1: Ball, ball2: Ball): boolean {
    const dx = ball1.x - ball2.x;
    const dy = ball1.y - ball2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (ball1.radius + ball2.radius);
  }

  // Resolve collision between two balls using elastic collision physics
  public static resolveBallCollision(ball1: Ball, ball2: Ball): void {
    // Calculate collision vector
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Prevent division by zero
    if (distance === 0) return;

    // Normalize collision vector
    const nx = dx / distance;
    const ny = dy / distance;

    // Relative velocity
    const dvx = ball1.vx - ball2.vx;
    const dvy = ball1.vy - ball2.vy;

    // Relative velocity in collision normal direction
    const dvn = dvx * nx + dvy * ny;

    // Do not resolve if velocities are separating
    if (dvn <= 0) return;

    // Collision impulse (assuming equal mass)
    const impulse = dvn;

    // Update velocities
    ball1.vx -= impulse * nx;
    ball1.vy -= impulse * ny;
    ball2.vx += impulse * nx;
    ball2.vy += impulse * ny;

    // Separate balls to prevent overlap
    const overlap = (ball1.radius + ball2.radius) - distance;
    const separationX = nx * overlap * 0.5;
    const separationY = ny * overlap * 0.5;

    ball1.x -= separationX;
    ball1.y -= separationY;
    ball2.x += separationX;
    ball2.y += separationY;
  }

  // Check collision with table cushions
  public static checkCushionCollision(ball: Ball): {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  } {
    return {
      top: ball.y - ball.radius <= 0,
      bottom: ball.y + ball.radius >= TABLE_DIMENSIONS.height,
      left: ball.x - ball.radius <= 0,
      right: ball.x + ball.radius >= TABLE_DIMENSIONS.width,
    };
  }

  // Resolve cushion collision with energy loss
  public static resolveCushionCollision(ball: Ball, restitution: number = PHYSICS_CONSTANTS.restitution): void {
    const collision = this.checkCushionCollision(ball);

    if (collision.top || collision.bottom) {
      ball.vy = -ball.vy * restitution;

      // Keep ball within bounds
      if (collision.top) {
        ball.y = ball.radius;
      } else if (collision.bottom) {
        ball.y = TABLE_DIMENSIONS.height - ball.radius;
      }
    }

    if (collision.left || collision.right) {
      ball.vx = -ball.vx * restitution;

      // Keep ball within bounds
      if (collision.left) {
        ball.x = ball.radius;
      } else if (collision.right) {
        ball.x = TABLE_DIMENSIONS.width - ball.radius;
      }
    }
  }

  // Apply friction to slow down balls
  public static applyFriction(ball: Ball, frictionCoefficient: number = 0.985): void {
    ball.vx *= frictionCoefficient;
    ball.vy *= frictionCoefficient;

    // Stop ball if velocity is very small
    if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.01) ball.vy = 0;
  }

  // Update ball position based on velocity
  public static updateBallPosition(ball: Ball, deltaTime: number = 1): void {
    ball.x += ball.vx * deltaTime;
    ball.y += ball.vy * deltaTime;
  }

  // Check if ball is moving
  public static isBallMoving(ball: Ball): boolean {
    return Math.abs(ball.vx) > 0.01 || Math.abs(ball.vy) > 0.01;
  }

  // Check if any balls are moving
  public static areAnyBallsMoving(balls: Ball[]): boolean {
    return balls.some(ball => !ball.isPocketed && this.isBallMoving(ball));
  }
}