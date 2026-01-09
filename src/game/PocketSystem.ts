import { Ball } from '../types/Ball';
import { TABLE_DIMENSIONS, POCKET_POSITIONS } from '../utils/constants';

export class PocketSystem {
  // Check if a ball is in a pocket
  public static checkBallInPocket(ball: Ball): string | null {
    for (const pocket of POCKET_POSITIONS) {
      const dx = ball.x - pocket.x;
      const dy = ball.y - pocket.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < TABLE_DIMENSIONS.pocketRadius - ball.radius * 0.5) {
        return pocket.id;
      }
    }
    
    return null;
  }

  // Get all balls that have been pocketed
  public static getPocketedBalls(balls: Ball[]): Ball[] {
    return balls.filter(ball => ball.isPocketed);
  }

  // Check if a ball should be removed from play (pocketed)
  public static shouldRemoveBall(ball: Ball): boolean {
    return this.checkBallInPocket(ball) !== null;
  }

  // Remove pocketed balls from the game
  public static removePocketedBalls(balls: Ball[]): Ball[] {
    return balls.map(ball => {
      if (this.shouldRemoveBall(ball)) {
        return { ...ball, isPocketed: true };
      }
      return ball;
    });
  }

  // Get pocket by ID
  public static getPocketById(id: string) {
    return POCKET_POSITIONS.find(pocket => pocket.id === id);
  }

  // Calculate ball trajectory towards pocket (for AI)
  public static calculatePocketTrajectory(ball: Ball, targetPocketId: string): { angle: number; power: number } | null {
    const pocket = this.getPocketById(targetPocketId);
    if (!pocket) return null;

    const dx = pocket.x - ball.x;
    const dy = pocket.y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate angle
    const angle = Math.atan2(dy, dx);

    // Calculate required power (simplified)
    const power = Math.min(distance * 0.1, 20);

    return { angle, power };
  }
}