import { Ball } from '../types/Ball';
import { GameState } from '../game/ScoreSystem';
import { RulesEngine } from '../game/RulesEngine';
import { POCKET_POSITIONS, TABLE_DIMENSIONS } from '../utils/constants';

export class AIEngine {
  public static calculateShot(state: GameState): { angle: number; power: number } | null {
    const availableBalls = RulesEngine.getAvailableBalls(state);
    const cueBall = state.balls.find(b => b.id === 'cue');

    if (!cueBall || availableBalls.length === 0) return null;

    // Find the best shot
    let bestShot: { angle: number; power: number; score: number } | null = null;

    for (const targetBall of availableBalls) {
      for (const pocket of POCKET_POSITIONS) {
        const shot = this.evaluateShot(cueBall, targetBall, pocket);
        if (shot && (!bestShot || shot.score > bestShot.score)) {
          bestShot = shot;
        }
      }
    }

    // If no potting shot found, try a safety shot (simplified: hit a red softly)
    if (!bestShot) {
      const targetBall = availableBalls[0];
      const angle = Math.atan2(targetBall.y - cueBall.y, targetBall.x - cueBall.x);
      return { angle, power: 5 };
    }

    return { angle: bestShot.angle, power: bestShot.power };
  }

  private static evaluateShot(
    cueBall: Ball,
    targetBall: Ball,
    pocket: { x: number; y: number }
  ): { angle: number; power: number; score: number } | null {
    // Vector from target ball to pocket
    const tpX = pocket.x - targetBall.x;
    const tpY = pocket.y - targetBall.y;
    const tpDist = Math.sqrt(tpX * tpX + tpY * tpY);

    // Normalize
    const tpNX = tpX / tpDist;
    const tpNY = tpY / tpDist;

    // The "ghost ball" position (where cue ball must be to pot target ball)
    // It's one ball diameter away from target ball on the line to the pocket
    const ghostX = targetBall.x - tpNX * (targetBall.radius * 2);
    const ghostY = targetBall.y - tpNY * (targetBall.radius * 2);

    // Vector from cue ball to ghost ball
    const cgX = ghostX - cueBall.x;
    const cgY = ghostY - cueBall.y;
    const cgDist = Math.sqrt(cgX * cgX + cgY * cgY);

    // Check if the shot is possible (ghost ball not blocked by other balls?)
    // Simplified for now: just check angle between CG and TP
    const cgNX = cgX / cgDist;
    const cgNY = cgY / cgDist;

    // Dot product to see if we are hitting the right side of the ball
    // Actually, check if the cue ball path intersects the target ball correctly
    const dot = cgNX * tpNX + cgNY * tpNY;
    
    // If dot product is low, the cut angle is too sharp
    if (dot < 0.2) return null;

    // Calculate required power (proportional to distance)
    const power = Math.min(5 + (cgDist + tpDist) * 0.02, 20);

    // Score based on ease of shot (shorter distance, straighter angle)
    const score = (1 / (cgDist + tpDist)) * dot;

    return {
      angle: Math.atan2(cgY, cgX),
      power,
      score
    };
  }
}
