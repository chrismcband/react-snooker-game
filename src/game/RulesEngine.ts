import { Ball } from '../types/Ball';
import { GameState } from './ScoreSystem';
import { TABLE_MARKINGS } from '../utils/constants';

export class RulesEngine {
  private static colorSequence: ('yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black')[] = 
    ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
  
  private static colorPointValues: { [key: string]: number } = {
    yellow: 2,
    green: 3,
    brown: 4,
    blue: 5,
    pink: 6,
    black: 7,
  };

  // Get foul points for a specific ball
  private static getFoulPointsForBall(ballId: string): number {
    if (ballId === 'cue') return 4;
    
    const colorPoints = this.colorPointValues[ballId];
    return colorPoints || 4; // Default to 4 if ball not found
  }

  // Check if a shot is valid according to snooker rules
  public static validateShot(
    state: GameState,
    pottedBalls: Ball[],
    cueBallPocketed: boolean,
    firstBallHit?: Ball | null // The first ball the cue ball collided with
    ): { valid: boolean; reason?: string; foulPoints?: number } {
    // Determine if a foul occurred and calculate foul points
    let foulPoints = 4; // Default foul points

    // Check if cue ball was pocketed
    if (cueBallPocketed) {
      // If on a color, use the color's point value, otherwise 4
      if (state.nextRequiredType !== 'red' && state.nextRequiredType !== 'any-color') {
        foulPoints = this.getFoulPointsForBall(state.nextRequiredType);
      } else {
        foulPoints = 4;
      }
      return { valid: false, reason: 'Cue ball potted', foulPoints };
    }

    // Check if no ball was hit (requires firstBallHit to be null or undefined)
    if (firstBallHit === null) {
      return { valid: false, reason: 'Failed to hit any ball', foulPoints: 4 };
    }

    // If no balls potted, check if correct ball was hit
    if (pottedBalls.length === 0) {
      // If a ball was hit but nothing potted, it's valid (as long as correct ball was hit)
      if (firstBallHit) {
        if (state.nextRequiredType === 'red') {
          if (firstBallHit.type !== 'red') {
            const ballPoints = this.getFoulPointsForBall(firstBallHit.id);
            return { valid: false, reason: `Hit wrong ball (${firstBallHit.id})`, foulPoints: ballPoints };
          }
        } else if (state.nextRequiredType === 'any-color') {
          if (firstBallHit.type !== 'color') {
            return { valid: false, reason: 'Must hit a color', foulPoints: 4 };
          }
        } else {
          if (firstBallHit.id !== state.nextRequiredType) {
            const ballPoints = this.getFoulPointsForBall(firstBallHit.id);
            return { valid: false, reason: `Must hit ${state.nextRequiredType}`, foulPoints: ballPoints };
          }
        }
      }
      return { valid: true };
    }

    // Check potting sequence
    const firstPotted = pottedBalls[0];
    
    if (state.nextRequiredType === 'red') {
      if (firstPotted.type !== 'red') {
        // Potted wrong color when trying for red
        const ballPoints = this.getFoulPointsForBall(firstPotted.id);
        return { valid: false, reason: 'Must pot a red', foulPoints: ballPoints };
      }
      // If multiple balls potted, they must all be reds
      if (pottedBalls.some(b => b.type !== 'red')) {
        return { valid: false, reason: 'Cannot pot colors with reds', foulPoints: 7 };
      }
    } else if (state.nextRequiredType === 'any-color') {
      if (firstPotted.type !== 'color') {
        return { valid: false, reason: 'Must pot a color', foulPoints: 4 };
      }
      if (pottedBalls.length > 1) {
        return { valid: false, reason: 'Cannot pot multiple colors', foulPoints: 7 };
      }
    } else {
      // Must pot the specific color in sequence
      if (firstPotted.id !== state.nextRequiredType) {
        const ballPoints = this.getFoulPointsForBall(firstPotted.id);
        return { valid: false, reason: `Must pot ${state.nextRequiredType}`, foulPoints: ballPoints };
      }
      if (pottedBalls.length > 1) {
        return { valid: false, reason: 'Cannot pot multiple balls', foulPoints: 7 };
      }
    }

    return { valid: true };
  }

  private static getCurrentColorInSequence(state: GameState): any {
    // Find the first color that is not pocketed
    for (const color of this.colorSequence) {
      const ball = state.balls.find(b => b.id === color);
      if (ball && !ball.isPocketed) return color;
    }
    return 'ended';
  }

  private static getNextColorInSequence(state: GameState, currentPotted: Ball): any {
    const currentIndex = this.colorSequence.indexOf(currentPotted.id as any);
    if (currentIndex === -1 || currentIndex === this.colorSequence.length - 1) {
      return 'ended';
    }
    return this.colorSequence[currentIndex + 1];
  }

  // Check if game should end
  public static shouldEndGame(state: GameState): boolean {
    return state.redsRemaining === 0 && state.balls.every(b => b.type === 'red' || b.isPocketed);
  }

  // Handle end of shot
  public static processShotResult(
    state: GameState,
    pottedBalls: Ball[],
    cueBallPocketed: boolean,
    firstBallHit?: Ball | null
  ): GameState {
    const validation = this.validateShot(state, pottedBalls, cueBallPocketed, firstBallHit);
    let newState = { ...state };

    if (!validation.valid) {
      newState.foulCommitted = true;
      const opponent = state.currentPlayer === 1 ? 2 : 1;
      newState.scores = {
        ...state.scores,
        [opponent === 1 ? 'player1' : 'player2']:
          state.scores[opponent === 1 ? 'player1' : 'player2'] + (validation.foulPoints || 4),
      };
      newState.currentPlayer = opponent;
      newState.currentBreak = 0;
      
       // After a foul, next required type resets
       newState.nextRequiredType = state.redsRemaining > 0 ? 'red' : this.getCurrentColorInSequence(newState);

       // Return colors to their spots if they were potted
       pottedBalls.forEach(ball => {
         if (ball.type === 'color') {
           const colorSpots = TABLE_MARKINGS.colorSpots as Record<string, { x: number; y: number }>;
           const spot = colorSpots[ball.id];
           newState.balls = newState.balls.map(b => 
             b.id === ball.id && spot ? { ...b, isPocketed: false, x: spot.x, y: spot.y, vx: 0, vy: 0 } : b
           );
         }
       });
      // Handle cue ball if pocketed
      if (cueBallPocketed) {
        newState.balls = newState.balls.map(b =>
          b.id === 'cue' ? { ...b, isPocketed: false, x: 100, y: 200, vx: 0, vy: 0 } : b
        );
        newState.gamePhase = 'positioning';
      } else {
        newState.gamePhase = 'playing';
      }
    } else {
      if (pottedBalls.length > 0) {
        newState.foulCommitted = false;
        newState.gamePhase = 'playing';
        
        // Update next required type
        if (pottedBalls.some(b => b.type === 'red')) {
          newState.nextRequiredType = 'any-color';
        } else {
          // A color was potted
          if (state.redsRemaining > 0) {
            newState.nextRequiredType = 'red';
            // Return color to spot
            pottedBalls.forEach(ball => {
              newState.balls = newState.balls.map(b => 
                b.id === ball.id ? { ...b, isPocketed: false } : b
              );
            });
          } else {
            newState.nextRequiredType = this.getNextColorInSequence(newState, pottedBalls[0]);
          }
        }
      } else {
        // No balls potted
        newState.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
        newState.currentBreak = 0;
        newState.nextRequiredType = state.redsRemaining > 0 ? 'red' : this.getCurrentColorInSequence(newState);
        newState.gamePhase = 'playing';
      }
    }

    if (newState.nextRequiredType === 'ended') {
      newState.gamePhase = 'ended';
    }

    return newState;
  }

  public static getAvailableBalls(state: GameState): Ball[] {
    if (state.nextRequiredType === 'red') {
      return state.balls.filter(ball => ball.type === 'red' && !ball.isPocketed);
    } else if (state.nextRequiredType === 'any-color') {
      return state.balls.filter(ball => ball.type === 'color');
    } else {
      return state.balls.filter(ball => ball.id === state.nextRequiredType);
    }
  }

  public static isOnReds(state: GameState): boolean {
    return state.nextRequiredType === 'red';
  }

  public static isOnColors(state: GameState): boolean {
    return !this.isOnReds(state) && state.redsRemaining === 0;
  }
}