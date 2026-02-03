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
  // Minimum foul points is 4, unless a high-value ball (blue=5, pink=6, black=7) is involved
  private static getFoulPointsForBall(ballId: string): number {
    const colorPoints = this.colorPointValues[ballId];
    if (colorPoints !== undefined) {
      // For color balls, return their point value only if it's higher than 4
      return Math.max(4, colorPoints);
    }
    // Default to 4 for any other ball (including cue ball)
    return 4;
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
             const ballPoints = this.getFoulPointsForBall(firstBallHit.id);
             return { valid: false, reason: 'Must hit a color', foulPoints: ballPoints };
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
         // Non-red ball was potted with reds - get highest foul points
         const foulPoints = Math.max(...pottedBalls.map(b => this.getFoulPointsForBall(b.id)));
         return { valid: false, reason: 'Cannot pot colors with reds', foulPoints };
       }
     } else if (state.nextRequiredType === 'any-color') {
       if (firstPotted.type !== 'color') {
         // Potted a red when should pot a color
         const ballPoints = this.getFoulPointsForBall(firstPotted.id);
         return { valid: false, reason: 'Must pot a color', foulPoints: ballPoints };
       }
       if (pottedBalls.length > 1) {
         // Multiple balls potted - get highest foul points
         const foulPoints = Math.max(...pottedBalls.map(b => this.getFoulPointsForBall(b.id)));
         return { valid: false, reason: 'Cannot pot multiple colors', foulPoints };
       }
    } else {
      // Must pot the specific color in sequence
      if (firstPotted.id !== state.nextRequiredType) {
        const ballPoints = this.getFoulPointsForBall(firstPotted.id);
        return { valid: false, reason: `Must pot ${state.nextRequiredType}`, foulPoints: ballPoints };
      }
       if (pottedBalls.length > 1) {
         // Multiple balls potted - get highest foul points
         const foulPoints = Math.max(...pottedBalls.map(b => this.getFoulPointsForBall(b.id)));
         return { valid: false, reason: 'Cannot pot multiple balls', foulPoints };
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

    console.log('[RulesEngine] processShotResult called:', {
      validationResult: { valid: validation.valid, reason: validation.reason, foulPoints: validation.foulPoints },
      currentPlayer: state.currentPlayer,
      pottedBallsCount: pottedBalls.length,
      pottedBallIds: pottedBalls.map(b => b.id),
      firstBallHit: firstBallHit?.id,
      cueBallPocketed,
      nextRequiredTypeBefore: state.nextRequiredType,
    });

    if (!validation.valid) {
      newState.foulCommitted = true;
      const opponent = state.currentPlayer === 1 ? 2 : 1;
      const foulPoints = validation.foulPoints || 4;
      newState.scores = {
        ...state.scores,
        [opponent === 1 ? 'player1' : 'player2']:
          state.scores[opponent === 1 ? 'player1' : 'player2'] + foulPoints,
      };
      newState.currentPlayer = opponent;
      newState.currentBreak = 0;
      
      console.log('[RulesEngine] FOUL committed:', {
        reason: validation.reason,
        foulPoints,
        awardedToPlayer: opponent,
        newScores: newState.scores,
      });
      
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
         
         // Calculate points for potted balls and add to current player's score
         const pottedPoints = pottedBalls.reduce((total, ball) => total + ball.pointValue, 0);
         const currentPlayer = state.currentPlayer === 1 ? 'player1' : 'player2';
         const oldScore = state.scores[currentPlayer];
         newState.scores = {
           ...state.scores,
           [currentPlayer]: state.scores[currentPlayer] + pottedPoints,
         };
         newState.currentBreak = state.currentBreak + pottedPoints;
         
         console.log('[RulesEngine] VALID SHOT - balls potted:', {
           pottedBallIds: pottedBalls.map(b => b.id),
           pointsAwarded: pottedPoints,
           awardedToPlayer: state.currentPlayer,
           scoreTransition: `${oldScore} → ${newState.scores[currentPlayer]}`,
           newScores: newState.scores,
           newBreak: newState.currentBreak,
         });
         
        // Update next required type and decrement reds counter
          if (pottedBalls.some(b => b.type === 'red')) {
            // Count how many reds were potted this shot
            const redsPotted = pottedBalls.filter(b => b.type === 'red').length;
            newState.redsRemaining = Math.max(0, state.redsRemaining - redsPotted);
            newState.nextRequiredType = 'any-color';
          } else {
            // A color was potted
            if (state.redsRemaining > 0) {
              newState.nextRequiredType = 'red';
              // Return color to spot (snooker rule: colors return after being potted in red phase)
              pottedBalls.forEach(ball => {
                const colorSpots = TABLE_MARKINGS.colorSpots as Record<string, { x: number; y: number }>;
                const spot = colorSpots[ball.id];
                newState.balls = newState.balls.map(b => 
                  b.id === ball.id && spot ? { ...b, isPocketed: false, x: spot.x, y: spot.y, vx: 0, vy: 0 } : b
                );
              });
            } else {
              // No reds remaining - must pot colors in sequence
              newState.nextRequiredType = this.getNextColorInSequence(newState, pottedBalls[0]);
            }
          }
       } else {
         // No balls potted - switch turns
         const newPlayer = state.currentPlayer === 1 ? 2 : 1;
         newState.currentPlayer = newPlayer;
         newState.currentBreak = 0;
         newState.nextRequiredType = state.redsRemaining > 0 ? 'red' : this.getCurrentColorInSequence(newState);
         newState.gamePhase = 'playing';
         
         console.log('[RulesEngine] NO BALLS POTTED - turn switches:', {
           previousPlayer: state.currentPlayer,
           newPlayer: newPlayer,
           nextRequiredType: newState.nextRequiredType,
           redsRemaining: state.redsRemaining,
         });
       }
    }

     if (newState.nextRequiredType === 'ended') {
       newState.gamePhase = 'ended';
     }

     console.log('[RulesEngine] processShotResult returning state:', {
       currentPlayer: newState.currentPlayer,
       nextRequiredType: newState.nextRequiredType,
       foulCommitted: newState.foulCommitted,
       scores: newState.scores,
       currentBreak: newState.currentBreak,
       redsRemaining: newState.redsRemaining,
     });

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